import { Role } from '../config/constants';
import { env } from '../config/env';
import { passwordUtil } from '../utils/password';
import { adminDb, adminAuth } from '../firebase-admin';
import { auditService } from './audit.service';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  savedVideoIds: string[];
  likedVideoIds: string[];
  followingPerformerIds: string[];
}

// In-memory store for users
const users = new Map<string, User>();
let isFirestoreUsersInitialized = false;

// Helper to sanitize user output (never return passwordHash)
export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash, ...rest } = user;
  return rest;
}

// Sync users from Firestore and seed initial super admin
async function initFirestoreUsersSync() {
  if (isFirestoreUsersInitialized) return;
  try {
    const snapshot = await adminDb.collection('users').get();
    if (!snapshot.empty) {
      snapshot.forEach((doc) => {
        const data = doc.data() as User;
        users.set(data.email.toLowerCase(), { ...data, id: doc.id });
      });
      console.log(`✅ [Firestore UserService] Loaded ${snapshot.size} users from Firestore.`);
    }

    const superAdminEmail = env.SUPER_ADMIN_EMAIL.toLowerCase();
    if (!users.has(superAdminEmail)) {
      const hash = await passwordUtil.hash(env.SUPER_ADMIN_PASSWORD);
      const superAdmin: User = {
        id: 'user_super_admin_01',
        email: superAdminEmail,
        passwordHash: hash,
        role: Role.SUPER_ADMIN,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        savedVideoIds: [],
        likedVideoIds: [],
        followingPerformerIds: [],
      };
      users.set(superAdminEmail, superAdmin);
      await adminDb.collection('users').doc(superAdmin.id).set(superAdmin, { merge: true });
      console.log(`🛡️ [Firestore UserService] Super Admin ${superAdminEmail} registered in Firestore.`);
    }

    isFirestoreUsersInitialized = true;
  } catch (err: any) {
    console.warn('⚠️ [Firestore UserService] Sync fallback:', err.message);
  }
}

initFirestoreUsersSync();

export const userService = {
  findByEmail: async (email: string): Promise<User | undefined> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const snap = await adminDb.collection('users').where('email', '==', cleanEmail).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        const data = doc.data() as User;
        const user = { ...data, id: doc.id };
        users.set(cleanEmail, user);
        return user;
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore UserService] findByEmail query notice:', err.message);
    }
    return users.get(cleanEmail);
  },

  findById: async (id: string): Promise<User | undefined> => {
    try {
      const docSnap = await adminDb.collection('users').doc(id).get();
      if (docSnap.exists) {
        const data = docSnap.data() as User;
        const user = { ...data, id: docSnap.id };
        users.set(user.email.toLowerCase(), user);
        return user;
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore UserService] findById query notice:', err.message);
    }
    for (const u of users.values()) {
      if (u.id === id) return u;
    }
    return undefined;
  },

  create: async (data: { email: string; password: string; role?: Role }): Promise<User> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = await userService.findByEmail(cleanEmail);
    if (existing) {
      throw new Error('User with this email already exists.');
    }

    const passwordHash = await passwordUtil.hash(data.password);
    const now = new Date().toISOString();
    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: cleanEmail,
      passwordHash,
      role: data.role || Role.USER,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      savedVideoIds: [],
      likedVideoIds: [],
      followingPerformerIds: [],
    };

    users.set(cleanEmail, newUser);

    // Save permanently to Firestore DB
    try {
      await adminDb.collection('users').doc(newUser.id).set(newUser);
    } catch (err: any) {
      console.warn(`[Firestore User] Save error for doc ${newUser.id}:`, err.message);
    }

    return newUser;
  },

  updateProfile: async (
    userId: string,
    updates: Partial<User> & Record<string, any>,
    actorId: string,
    actorRole: Role
  ): Promise<Omit<User, 'passwordHash'>> => {
    const isSelf = userId === actorId;
    const isAdmin = actorRole === Role.ADMIN || actorRole === Role.SUPER_ADMIN;

    if (!isSelf && !isAdmin) {
      throw new Error('Access denied. You can only modify your own profile.');
    }

    const user = await userService.findById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    // Protected fields that normal users CANNOT modify
    const protectedFields = [
      'role',
      'permissions',
      'status',
      'banStatus',
      'bannedAt',
      'isBanned',
      'isAdmin',
      'admin',
      'isModerator',
      'moderator',
      'passwordHash',
      'id',
      'email',
      'createdAt',
    ];

    if (!isAdmin) {
      for (const field of protectedFields) {
        if (field in updates && updates[field] !== undefined) {
          throw new Error(`Security Violation: Normal users cannot modify protected profile field '${field}'.`);
        }
      }
    }

    const sanitizedUpdates = { ...updates };
    delete sanitizedUpdates.passwordHash;
    delete sanitizedUpdates.id;
    if (!isAdmin) {
      delete sanitizedUpdates.role;
      delete sanitizedUpdates.status;
    }

    const updatedUser: User = {
      ...user,
      ...sanitizedUpdates,
      updatedAt: new Date().toISOString(),
    };

    users.set(user.email.toLowerCase(), updatedUser);

    try {
      await adminDb.collection('users').doc(userId).set(updatedUser, { merge: true });
    } catch (err: any) {
      console.warn(`[Firestore User] Profile update error for doc ${userId}:`, err.message);
    }

    return sanitizeUser(updatedUser);
  },

  getInteractions: async (
    targetUserId: string,
    actorId: string,
    actorRole: Role
  ) => {
    const isSelf = targetUserId === actorId;
    const isStaff =
      actorRole === Role.ADMIN ||
      actorRole === Role.SUPER_ADMIN ||
      actorRole === Role.MODERATOR;

    if (!isSelf && !isStaff) {
      throw new Error('Access denied. You can only view your own interaction data.');
    }

    try {
      const snap = await adminDb.collection('user_interactions').doc(targetUserId).get();
      if (snap.exists) {
        return snap.data();
      }
    } catch (err: any) {
      console.warn(`[Firestore Interactions] Fetch notice for ${targetUserId}:`, err.message);
    }

    const user = await userService.findById(targetUserId);
    if (!user) {
      throw new Error('User not found.');
    }

    return {
      userId: user.id,
      savedVideos: user.savedVideoIds || [],
      likedVideos: user.likedVideoIds || [],
      watchHistory: [],
    };
  },

  syncInteractions: async (
    targetUserId: string,
    data: {
      savedVideos?: string[];
      likedVideos?: string[];
      watchHistory?: any[];
      contentPreference?: string;
    },
    actorId: string,
    actorRole: Role
  ) => {
    const isSelf = targetUserId === actorId;
    const isStaff =
      actorRole === Role.ADMIN ||
      actorRole === Role.SUPER_ADMIN ||
      actorRole === Role.MODERATOR;

    if (!isSelf && !isStaff) {
      throw new Error('Access denied. You can only update your own interaction data.');
    }

    const interactionPayload = {
      userId: targetUserId,
      savedVideos: Array.isArray(data.savedVideos) ? data.savedVideos.slice(0, 500) : [],
      likedVideos: Array.isArray(data.likedVideos) ? data.likedVideos.slice(0, 1000) : [],
      watchHistory: Array.isArray(data.watchHistory) ? data.watchHistory.slice(0, 100) : [],
      contentPreference: data.contentPreference || 'all',
      updatedAt: new Date().toISOString(),
    };

    try {
      await adminDb
        .collection('user_interactions')
        .doc(targetUserId)
        .set(interactionPayload, { merge: true });
    } catch (err: any) {
      console.warn(`[Firestore Interactions] Sync notice for ${targetUserId}:`, err.message);
    }

    return interactionPayload;
  },

  listUsers: async (options?: { page?: number; limit?: number; search?: string; role?: Role }): Promise<{
    users: Array<Omit<User, 'passwordHash'>>;
    total: number;
    page: number;
    totalPages: number;
  }> => {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));

    try {
      const snap = await adminDb.collection('users').get();
      if (!snap.empty) {
        let list: User[] = [];
        snap.forEach((doc) => {
          const data = doc.data() as User;
          const u = { ...data, id: doc.id };
          list.push(u);
          users.set(u.email.toLowerCase(), u);
        });

        if (options?.search) {
          const q = options.search.toLowerCase();
          list = list.filter((u) => u.email.toLowerCase().includes(q));
        }
        if (options?.role) {
          list = list.filter((u) => u.role === options.role);
        }

        const total = list.length;
        const startIndex = (page - 1) * limit;
        const paginated = list.slice(startIndex, startIndex + limit).map(sanitizeUser);

        return {
          users: paginated,
          total,
          page,
          totalPages: Math.ceil(total / limit) || 1,
        };
      }
    } catch (err: any) {
      console.warn('⚠️ [Firestore UserService] listUsers query notice:', err.message);
    }

    // Memory cache fallback
    let list = Array.from(users.values());

    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter((u) => u.email.toLowerCase().includes(q));
    }
    if (options?.role) {
      list = list.filter((u) => u.role === options.role);
    }

    const total = list.length;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit).map(sanitizeUser);

    return {
      users: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  updateRole: async (
    targetUserId: string,
    newRole: Role,
    actorRole: Role,
    actorId?: string,
    actorEmail?: string
  ): Promise<User> => {
    // 1. Role Change: Admin only gate
    if (actorRole !== Role.ADMIN && actorRole !== Role.SUPER_ADMIN) {
      throw new Error('Access denied. Only administrators can modify user roles.');
    }

    if (newRole === Role.SUPER_ADMIN && actorRole !== Role.SUPER_ADMIN) {
      throw new Error('Only a SUPER_ADMIN can assign the SUPER_ADMIN role.');
    }

    const targetUser = await userService.findById(targetUserId);
    if (!targetUser) {
      throw new Error('Target user not found.');
    }

    if (targetUser.role === Role.SUPER_ADMIN && actorRole !== Role.SUPER_ADMIN) {
      throw new Error('Cannot modify the role of a SUPER_ADMIN account.');
    }

    const oldRole = targetUser.role;
    targetUser.role = newRole;
    targetUser.updatedAt = new Date().toISOString();
    users.set(targetUser.email.toLowerCase(), targetUser);

    // 2. Save in Firestore DB
    try {
      await adminDb.collection('users').doc(targetUserId).set(
        { role: newRole, updatedAt: targetUser.updatedAt },
        { merge: true }
      );
    } catch (err: any) {
      console.warn(`[Firestore User] Role update error:`, err.message);
    }

    // 3. Set Firebase Auth Custom Claims (USER, MODERATOR, ADMIN)
    try {
      const claims = {
        role: newRole,
        admin: newRole === Role.ADMIN || newRole === Role.SUPER_ADMIN,
        moderator: newRole === Role.MODERATOR || newRole === Role.ADMIN || newRole === Role.SUPER_ADMIN,
      };

      let firebaseUser = await adminAuth.getUser(targetUserId).catch(() => null);
      if (!firebaseUser) {
        firebaseUser = await adminAuth.getUserByEmail(targetUser.email).catch(() => null);
      }
      if (firebaseUser) {
        await adminAuth.setCustomUserClaims(firebaseUser.uid, claims);
        console.log(`🛡️ [FirebaseAuth] Custom claims set for ${targetUser.email} (${firebaseUser.uid}) -> ${JSON.stringify(claims)}`);
      }
    } catch (err: any) {
      console.warn('[FirebaseAuth] Claims update notice:', err.message);
    }

    // 4. Record Audit Log
    try {
      await auditService.log({
        actorId: actorId || 'admin_system',
        actorEmail: actorEmail || 'admin@indianfullxx.com',
        actorRole: actorRole,
        action: 'user.role_changed',
        targetType: 'user',
        targetId: targetUserId,
        metadata: {
          targetEmail: targetUser.email,
          previousRole: oldRole,
          newRole: newRole,
        },
      });
    } catch (auditErr: any) {
      console.warn('[AuditLog] Role change audit notice:', auditErr.message);
    }

    return targetUser;
  },

  setUserStatus: async (targetUserId: string, status: 'active' | 'suspended', actorRole: Role): Promise<User> => {
    const targetUser = await userService.findById(targetUserId);
    if (!targetUser) {
      throw new Error('Target user not found.');
    }

    if (targetUser.role === Role.SUPER_ADMIN) {
      throw new Error('Cannot suspend a SUPER_ADMIN.');
    }

    if (targetUser.role === Role.ADMIN && actorRole !== Role.SUPER_ADMIN) {
      throw new Error('Only a SUPER_ADMIN can suspend an ADMIN.');
    }

    targetUser.status = status;
    targetUser.updatedAt = new Date().toISOString();
    users.set(targetUser.email.toLowerCase(), targetUser);

    // Save in Firestore DB
    try {
      await adminDb.collection('users').doc(targetUserId).set({ status, updatedAt: targetUser.updatedAt }, { merge: true });
    } catch (err: any) {
      console.warn(`[Firestore User] Status update error:`, err.message);
    }

    return targetUser;
  },
};

