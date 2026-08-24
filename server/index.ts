import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { corsOptions } from './config/cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { logger } from './utils/logger';
import { responseUtil } from './utils/response';
import { errorHandler } from './middleware/error.middleware';
import apiRoutes from './routes';

const app = express();

// 1. Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows media streaming & CDN embeds
    crossOriginEmbedderPolicy: false,
  })
);

// 2. CORS Setup
app.use(cors(corsOptions));

// 3. Body & Cookie Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 4. Request Logging & Correlation ID
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  res.on('finish', () => {
    const duration = `${Date.now() - start}ms`;
    logger.info(`${req.method} ${req.originalUrl}`, {
      requestId: req.requestId,
      status: res.statusCode,
      duration,
      userId: req.user?.userId,
    });
  });

  next();
});

// 5. Health & Readiness Probes
app.get('/health', (_req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'fapnxx-backend',
    env: env.NODE_ENV,
  });
});

app.get('/ready', (_req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ready',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// 6. Mount API routes
app.use('/api', apiRoutes);

// 7. 404 Handler for API routes
app.use('/api/*', (req: Request, res: Response) => {
  return responseUtil.error(res, 'NOT_FOUND', `Endpoint ${req.method} ${req.originalUrl} not found.`, 404);
});

// 8. Global Error Handler
app.use(errorHandler);

// 9. Start Server
const server = app.listen(env.PORT, () => {
  logger.info(`🚀 FapnXX Production-Ready Backend Server started on port ${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`🛡️ Super Admin initialized: ${env.SUPER_ADMIN_EMAIL}`);
  logger.info(`📡 Health probe available at: http://localhost:${env.PORT}/health`);
});

// Graceful Shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
