import { Router } from 'express';
import authRoutes from './v1/auth.routes';
import userRoutes from './v1/user.routes';
import videoRoutes from './v1/video.routes';
import categoryRoutes from './v1/category.routes';
import commentRoutes from './v1/comment.routes';
import reportRoutes from './v1/report.routes';
import bannerRoutes from './v1/banner.routes';
import adRoutes from './v1/ad.routes';
import uploadRoutes from './v1/upload.routes';
import adminRoutes from './v1/admin.routes';
import auditRoutes from './v1/audit.routes';

const router = Router();

// Version 1 router
const v1Router = Router();

v1Router.use('/auth', authRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/videos', videoRoutes);
v1Router.use('/categories', categoryRoutes);
v1Router.use('/comments', commentRoutes);
v1Router.use('/reports', reportRoutes);
v1Router.use('/banners', bannerRoutes);
v1Router.use('/ads', adRoutes);
v1Router.use('/uploads', uploadRoutes);
v1Router.use('/admin', adminRoutes);
v1Router.use('/audit', auditRoutes);

router.use('/v1', v1Router);

export default router;
