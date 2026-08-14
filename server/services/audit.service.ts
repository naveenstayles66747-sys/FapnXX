import { Role } from '../config/constants';
import { logger } from '../utils/logger';

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: Role | string;
  action: string;
  targetType: string;
  targetId?: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

// In-memory persistent audit log collection
const auditLogs: AuditLogEntry[] = [];

export const auditService = {
  log: async (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> => {
    const logItem: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    // Prepend for newest-first order
    auditLogs.unshift(logItem);

    // Keep up to 10,000 log entries in memory buffer
    if (auditLogs.length > 10000) {
      auditLogs.pop();
    }

    logger.info(`[AUDIT] ${entry.actorEmail} (${entry.actorRole}) performed ${entry.action} on ${entry.targetType}:${entry.targetId || 'N/A'}`);
    return logItem;
  },

  getLogs: (options?: {
    page?: number;
    limit?: number;
    action?: string;
    actorEmail?: string;
    targetType?: string;
  }): { logs: AuditLogEntry[]; total: number; page: number; totalPages: number } => {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));

    let filtered = [...auditLogs];

    if (options?.action) {
      filtered = filtered.filter((l) => l.action.toLowerCase().includes(options.action!.toLowerCase()));
    }
    if (options?.actorEmail) {
      filtered = filtered.filter((l) => l.actorEmail.toLowerCase().includes(options.actorEmail!.toLowerCase()));
    }
    if (options?.targetType) {
      filtered = filtered.filter((l) => l.targetType.toLowerCase() === options.targetType!.toLowerCase());
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      logs: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },
};
