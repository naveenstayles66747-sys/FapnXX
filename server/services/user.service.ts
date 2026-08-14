import { Role } from '../config/constants';
import { env } from '../config/env';
import { passwordUtil } from '../utils/password';

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

// Helper to sanitize user output (never return passwordHash)
export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash, ...rest } = user;
  return rest;
}

// Seed initial super admin user asynchronously
async function seedInitialUsers() {
  const superAdminEmail = env.SUPER_ADMIN_EMAIL.toLowerCase();
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

  // Demo user for testing
  const demoEmail = 'demo_user@indianhubxx.com';
  const demoHash = await passwordUtil.hash('DemoUser123!');
  users.set(demoEmail, {
    id: 'user_demo_01',
    email: demoEmail,
    passwordHash: demoHash,
    role: Role.USER,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    savedVideoIds: [],
    likedVideoIds: [],
    followingPerformerIds: [],
  });
}

seedInitialUsers();

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

  updateRole: (targetUserId: string, newRole: Role, actorRole: Role): User => {
    // Prevent normal admins from creating SUPER_ADMIN or escalating privileges
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
    return targetUser;
  },

  setUserStatus: (targetUserId: string, status: 'active' | 'suspended', actorRole: Role): User => {
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
    return targetUser;
  },
};
