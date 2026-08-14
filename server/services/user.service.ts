import { Role } from '../config/constants';
import { env } from '../config/env';
import { passwordUtil } from '../utils/password';
import { adminDb, adminAuth } from '../firebase-admin';

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
  findByEmail: (email: string): User | undefined => {
    return users.get(email.trim().toLowerCase());
  },

  findById: (id: string): User | undefined => {
    for (const u of users.values()) {
      if (u.id === id) return u;
    }
    return undefined;
  },

  create: async (data: { email: string; password: string; role?: Role }): Promise<User> => {
    const cleanEmail = data.email.trim().toLowerCase();
    if (users.has(cleanEmail)) {
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

    // Save to Firestore DB
    try {
      await adminDb.collection('users').doc(newUser.id).set(newUser);
    } catch (err: any) {
      console.warn(`[Firestore User] Save error for doc ${newUser.id}:`, err.message);
    }

    return newUser;
  },

  update: (id: string, updates: Partial<User>): User => {
    const user = userService.findById(id);
    if (!user) {
      throw new Error('User not found.');
    }

    const updatedUser: User = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    users.set(user.email, updatedUser);

    // Update in Firestore DB
    adminDb.collection('users').doc(id).set(updatedUser, { merge: true }).catch(() => null);

    return updatedUser;
  },

  listUsers: (options?: { page?: number; limit?: number; search?: string; role?: Role }): {
    users: Array<Omit<User, 'passwordHash'>>;
    total: number;
    page: number;
    totalPages: number;
  } => {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));

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

  updateRole: async (targetUserId: string, newRole: Role, actorRole: Role): Promise<User> => {
    if (newRole === Role.SUPER_ADMIN && actorRole !== Role.SUPER_ADMIN) {
      throw new Error('Only a SUPER_ADMIN can assign the SUPER_ADMIN role.');
    }

    const targetUser = userService.findById(targetUserId);
    if (!targetUser) {
      throw new Error('Target user not found.');
    }

    if (targetUser.role === Role.SUPER_ADMIN && actorRole !== Role.SUPER_ADMIN) {
      throw new Error('Cannot modify role of a SUPER_ADMIN.');
    }

    targetUser.role = newRole;
    targetUser.updatedAt = new Date().toISOString();
    users.set(targetUser.email, targetUser);

    // Save in Firestore DB
    try {
      await adminDb.collection('users').doc(targetUserId).set({ role: newRole, updatedAt: targetUser.updatedAt }, { merge: true });
    } catch (err: any) {
      console.warn(`[Firestore User] Role update error:`, err.message);
    }

    // Set Firebase Auth Custom Claims if user exists in Firebase Auth
    try {
      const firebaseUser = await adminAuth.getUserByEmail(targetUser.email).catch(() => null);
      if (firebaseUser) {
        await adminAuth.setCustomUserClaims(firebaseUser.uid, {
          role: newRole,
          admin: newRole === Role.ADMIN || newRole === Role.SUPER_ADMIN,
        });
        console.log(`🛡️ [FirebaseAuth] Custom claims updated for ${targetUser.email} -> ${newRole}`);
      }
    } catch (err: any) {
      console.warn('[FirebaseAuth] Claims update error:', err.message);
    }

    return targetUser;
  },

  setUserStatus: async (targetUserId: string, status: 'active' | 'suspended', actorRole: Role): Promise<User> => {
    const targetUser = userService.findById(targetUserId);
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
    users.set(targetUser.email, targetUser);

    // Save in Firestore DB
    try {
      await adminDb.collection('users').doc(targetUserId).set({ status, updatedAt: targetUser.updatedAt }, { merge: true });
    } catch (err: any) {
      console.warn(`[Firestore User] Status update error:`, err.message);
    }

    return targetUser;
  },
};

