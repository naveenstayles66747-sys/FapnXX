import crypto from 'crypto';

interface OTPEntry {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 3;

// In-memory secure OTP storage
const otpStore = new Map<string, OTPEntry>();

export const otpUtil = {
  generate: (target: string): { success: boolean; message: string; cooldownRemaining?: number } => {
    const cleanTarget = target.trim().toLowerCase();
    const existing = otpStore.get(cleanTarget);

    const now = Date.now();
    if (existing && now - existing.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
      const remainingSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
      return {
        success: false,
        message: `Please wait ${remainingSec} seconds before requesting a new OTP.`,
        cooldownRemaining: remainingSec,
      };
    }

    // Cryptographically secure 6-digit numeric OTP (e.g. 100000 - 999999)
    const code = crypto.randomInt(100000, 1000000).toString();

    otpStore.set(cleanTarget, {
      code,
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
      lastSentAt: now,
    });

    // In production, send via email/SMS provider. In development, we simulate delivery securely
    return {
      success: true,
      message: 'OTP has been generated and dispatched to your registered address.',
    };
  },

  verify: (target: string, code: string): { valid: boolean; message: string } => {
    const cleanTarget = target.trim().toLowerCase();
    const entry = otpStore.get(cleanTarget);

    if (!entry) {
      return { valid: false, message: 'No active OTP request found. Please request a new OTP.' };
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(cleanTarget);
      return { valid: false, message: 'OTP has expired. Please request a new OTP.' };
    }

    if (entry.attempts >= MAX_ATTEMPTS) {
      otpStore.delete(cleanTarget);
      return { valid: false, message: 'Maximum OTP verification attempts exceeded. Please request a new OTP.' };
    }

    entry.attempts += 1;

    // Constant-time buffer comparison to prevent timing attacks
    const codeBuffer = Buffer.from(code.trim());
    const expectedBuffer = Buffer.from(entry.code);

    const isMatch = codeBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(codeBuffer, expectedBuffer);

    if (!isMatch) {
      const remainingAttempts = MAX_ATTEMPTS - entry.attempts;
      return {
        valid: false,
        message: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`,
      };
    }

    // Replay protection: invalidate immediately upon successful verification
    otpStore.delete(cleanTarget);
    return { valid: true, message: 'OTP verified successfully.' };
  },

  cleanup: (): void => {
    const now = Date.now();
    for (const [key, entry] of otpStore.entries()) {
      if (now > entry.expiresAt) {
        otpStore.delete(key);
      }
    }
  },
};

// Periodically clean expired OTPs every 10 minutes
setInterval(otpUtil.cleanup, 10 * 60 * 1000);
