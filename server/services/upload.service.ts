import crypto from 'crypto';
import path from 'path';

const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const ALLOWED_IMAGE_MIMES = ['image/webp', 'image/jpeg', 'image/png', 'image/gif'];

const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;  // 20 MB

export const uploadService = {
  validateUploadRequest: (params: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    uploadType: 'video' | 'preview' | 'banner' | 'avatar';
  }): { valid: boolean; error?: string; safeFilename?: string; destinationPath?: string } => {
    const { filename, mimeType, sizeBytes, uploadType } = params;

    if (uploadType === 'video') {
      if (!ALLOWED_VIDEO_MIMES.includes(mimeType)) {
        return {
          valid: false,
          error: `Invalid video format. Allowed formats: ${ALLOWED_VIDEO_MIMES.join(', ')}`,
        };
      }
      if (sizeBytes > MAX_VIDEO_BYTES) {
        return {
          valid: false,
          error: `Video size exceeds the maximum limit of ${MAX_VIDEO_BYTES / (1024 * 1024)} MB.`,
        };
      }
    } else {
      const allowed = [...ALLOWED_IMAGE_MIMES, 'video/mp4'];
      if (!allowed.includes(mimeType)) {
        return {
          valid: false,
          error: `Invalid image/preview format. Allowed formats: ${allowed.join(', ')}`,
        };
      }
      if (sizeBytes > MAX_IMAGE_BYTES) {
        return {
          valid: false,
          error: `Asset size exceeds maximum limit of ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`,
        };
      }
    }

    const ext = path.extname(filename).toLowerCase() || (uploadType === 'video' ? '.mp4' : '.webp');
    const randomHex = crypto.randomBytes(16).toString('hex');
    const safeFilename = `${uploadType}_${Date.now()}_${randomHex}${ext}`;
    const destinationPath = `${uploadType}s/${safeFilename}`;

    return {
      valid: true,
      safeFilename,
      destinationPath,
    };
  },
};
