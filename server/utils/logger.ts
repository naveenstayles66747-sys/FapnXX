export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId?: string;
  route?: string;
  userId?: string;
  action?: string;
  duration?: string;
  status?: number;
  message: string;
  details?: any;
}

const SENSITIVE_KEYS = ['password', 'token', 'jwt', 'otp', 'secret', 'privateKey', 'authorization', 'apiKey'];

function sanitize(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitize);

  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s.toLowerCase()))) {
      cleaned[k] = '***REDACTED***';
    } else if (typeof v === 'object') {
      cleaned[k] = sanitize(v);
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

export const logger = {
  log: (level: LogLevel, message: string, meta?: Partial<LogEntry>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(meta?.requestId && { requestId: meta.requestId }),
      ...(meta?.route && { route: meta.route }),
      ...(meta?.userId && { userId: meta.userId }),
      ...(meta?.action && { action: meta.action }),
      ...(meta?.duration && { duration: meta.duration }),
      ...(meta?.status && { status: meta.status }),
      ...(meta?.details && { details: sanitize(meta.details) }),
    };

    const formatted = `[${entry.timestamp}] [${entry.level}] ${entry.message} ${
      entry.route ? `(${entry.route})` : ''
    } ${entry.details ? JSON.stringify(entry.details) : ''}`;

    if (level === LogLevel.ERROR) {
      console.error(formatted);
    } else if (level === LogLevel.WARN) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  },

  info: (message: string, meta?: Partial<LogEntry>) => logger.log(LogLevel.INFO, message, meta),
  warn: (message: string, meta?: Partial<LogEntry>) => logger.log(LogLevel.WARN, message, meta),
  error: (message: string, meta?: Partial<LogEntry>) => logger.log(LogLevel.ERROR, message, meta),
  debug: (message: string, meta?: Partial<LogEntry>) => logger.log(LogLevel.DEBUG, message, meta),
};
