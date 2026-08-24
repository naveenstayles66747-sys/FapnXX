import { Role } from '../config/constants';
import { logger } from '../utils/logger';
import { adminDb } from '../firebase-admin';

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

// In-memory cache for fast read fallback
const auditLogs: AuditLogEntry[] = [];

export const auditService = {
  log: async (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> => {
    const logItem: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    // Prepend for newest-first cache
    auditLogs.unshift(logItem);
    if (auditLogs.length > 5000) {
      auditLogs.pop();
    }

    // Persist permanently to Firestore Cloud Database
    try {
      await adminDb.collection('audit_logs').doc(logItem.id).set(logItem);
    } catch (err: any) {
      logger.warn(`[Firestore Audit] Write notice: ${err?.message}`);
    }

    logger.info(`[AUDIT] ${entry.actorEmail} (${entry.actorRole}) performed ${entry.action} on ${entry.targetType}:${entry.targetId || 'N/A'}`);
    return logItem;
  },

  getLogs: async (options?: {
    page?: number;
    limit?: number;
    action?: string;
    actorEmail?: string;
    targetType?: string;
  }): Promise<{ logs: AuditLogEntry[]; total: number; page: number; totalPages: number }> => {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));

    try {
      const snap = await adminDb.collection('audit_logs').orderBy('timestamp', 'desc').limit(200).get();
      if (!snap.empty) {
        let list: AuditLogEntry[] = [];
        snap.forEach((doc) => {
          list.push(doc.data() as AuditLogEntry);
        });

        if (options?.action) {
          list = list.filter((l) => l.action.toLowerCase().includes(options.action!.toLowerCase()));
        }
        if (options?.actorEmail) {
          list = list.filter((l) => l.actorEmail.toLowerCase().includes(options.actorEmail!.toLowerCase()));
        }
        if (options?.targetType) {
          list = list.filter((l) => l.targetType.toLowerCase() === options.targetType!.toLowerCase());
        }

        const total = list.length;
        const startIndex = (page - 1) * limit;
        const paginated = list.slice(startIndex, startIndex + limit);

        return {
          logs: paginated,
          total,
          page,
          totalPages: Math.ceil(total / limit) || 1,
        };
      }
    } catch (err: any) {
      logger.warn(`[Firestore Audit] Read notice: ${err?.message}`);
    }

    // Memory cache fallback
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
