import { Request, Response, NextFunction } from 'express';
import { uploadService } from '../services/upload.service';
import { responseUtil } from '../utils/response';

export const uploadController = {
  validateUpload: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { filename, mimeType, sizeBytes, uploadType } = req.body;
      const result = uploadService.validateUploadRequest({
        filename,
        mimeType,
        sizeBytes,
        uploadType: uploadType || 'video',
      });

      if (!result.valid) {
        return responseUtil.error(res, 'INVALID_UPLOAD', result.error || 'Upload validation failed.', 400);
      }

      return responseUtil.success(res, {
        safeFilename: result.safeFilename,
        destinationPath: result.destinationPath,
        maxSizeBytes: uploadType === 'video' ? 500 * 1024 * 1024 : 20 * 1024 * 1024,
      }, 'Upload request authorized and validated.');
    } catch (err: any) {
      next(err);
    }
  },
};
