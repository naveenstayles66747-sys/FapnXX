import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export const responseUtil = {
  success: <T>(res: Response, data: T, message = 'Operation successful', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      data,
      message,
    } as ApiResponse<T>);
  },

  error: (res: Response, code: string, message: string, statusCode = 400, details?: any) => {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    } as ApiResponse);
  },
};
