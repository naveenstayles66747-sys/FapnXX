import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../services/firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface SignInScreenProps {
  onSuccess: (identifier: string) => void;
  onBack: () => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ onSuccess, onBack }) => {
  const [authMode, setAuthMode] = useState<'phone' | 'email'>('phone');
  const [isSignUp, setIsSignUp] = useState(false);

  // Email / Password State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone / OTP State
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Resend Timer Countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Clean up recaptcha verifier on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore cleanup
        }
      }
    };
  }, []);

  const getOrCreateRecaptchaVerifier = () => {
    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current;
    }
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved automatically
      },
      'expired-callback': () => {
        setError('reCAPTCHA expired. Please try sending OTP again.');
      },
    });
    recaptchaVerifierRef.current = verifier;
    return verifier;
  };

  // ── 1. Phone Auth: Send OTP ─────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = phoneNumber.trim().replace(/[^0-9]/g, '');
    if (!cleanNumber || cleanNumber.length < 7) {
      setError('Please enter a valid mobile number.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setLoading(true);

    const fullPhoneNumber = `${countryCode}${cleanNumber}`;

    try {
      const appVerifier = getOrCreateRecaptchaVerifier();
      const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setResendTimer(60);
      setSuccessMsg(`6-digit OTP sent to ${fullPhoneNumber}`);
    } catch (err: any) {
      console.warn('[PhoneAuth] Send OTP Error:', err);
      if (err.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number format.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a few minutes and try again.');
      } else if (err.code === 'auth/quota-exceeded') {
        setError('SMS quota exceeded for today. Please try Email login.');
      } else {
        setError(err.message || 'Failed to send OTP. Please check your connection.');
      }
      // Reset verifier on failure so it can re-render fresh
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        } catch {
          // ignore
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // ── 2. Phone Auth: Verify OTP ───────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (!confirmationResult) {
      setError('Session expired. Please request a new OTP.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const result = await confirmationResult.confirm(otp.trim());
      const user = result.user;

      // Sync Firestore user profile
      await setDoc(
        doc(db, 'users', user.uid),
        {
          id: user.uid,
          phoneNumber: user.phoneNumber,
          role: 'USER',
          lastLoginAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setSuccessMsg('Phone verified successfully! Signing in...');
      onSuccess(user.phoneNumber || 'User');
    } catch (err: any) {
      console.warn('[PhoneAuth] Verify OTP Error:', err);
      if (err.code === 'auth/invalid-verification-code') {
        setError('Invalid OTP code. Please enter the correct 6 digits.');
      } else if (err.code === 'auth/code-expired') {
        setError('OTP code has expired. Please request a new OTP.');
      } else {
        setError(err.message || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── 3. Email & Password Auth ────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
        const user = cred.user;

        await setDoc(
          doc(db, 'users', user.uid),
          {
            id: user.uid,
            email: user.email,
            role: 'USER',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          },
          { merge: true }
        );

        setSuccessMsg('Account created successfully! Signing you in...');
        onSuccess(email.trim());
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
        const user = cred.user;

        await setDoc(
          doc(db, 'users', user.uid),
          {
            id: user.uid,
            email: user.email,
            lastLoginAt: new Date().toISOString(),
          },
          { merge: true }
        );

        onSuccess(email.trim());
      }
    } catch (err: any) {
      console.warn('[SignIn] Notice:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please Sign In.');
      } else if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-zinc-100 dark:bg-gradient-to-b dark:from-[#131315] dark:to-[#09090b] w-full transition-colors">
      {/* Invisible container for Firebase reCAPTCHA */}
      <div id="recaptcha-container" />

      {/* Background atmospheric overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-10 dark:opacity-20 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuD3zkz90ny8g2Bp4iJfeVGeBA4VzYawStf6heVpcUMGd4uMCWGlzvI27EL-2u0WS5vtmSUZsVpKKuUjRms7MIGR2ZCnYvWrJZ9a0yQ-4FMD4u5lu0WI0rBOBnQ-7y1jEKq4HTabMcCvaeOewIa-YSp9VQpRnOMCcFkOE14NyUP0J7yAE2OXw3ZzMu0zIC9LXD968EnofutZGFGAwYdBrUY8UvWSLW7U9GskJdZw1IpqJBgJmMrWHuPbRQ')`,
        }}
      />

      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-zinc-700 dark:text-[#debec8] hover:text-[#ec4899] dark:hover:text-[#ffb0cd] transition-colors p-2 rounded-lg bg-white/80 dark:bg-black/40 backdrop-blur-md border border-zinc-200 dark:border-white/10 cursor-pointer shadow-sm"
      >
        <span className="material-symbols-outlined">arrow_back</span>
        <span className="text-xs font-bold uppercase tracking-wider">Back to Browse</span>
      </button>

      {/* Login Container */}
      <div className="relative z-10 w-full max-w-[440px] bg-white dark:bg-[#131316] rounded-2xl p-8 sm:p-10 shadow-2xl flex flex-col gap-5 border border-zinc-200 dark:border-[#353437] text-zinc-900 dark:text-[#e5e1e4] transition-all">
        {/* Header */}
        <div className="text-center mb-1">
          <h1 className="text-3xl font-extrabold tracking-tighter italic mb-2">
            <span className="text-[#e0358d] drop-shadow-[0_0_10px_rgba(224,53,141,0.5)] font-black">Fap</span>
            <span className="brand-letter-n font-black">n</span>
            <span className="text-zinc-900 dark:text-white font-black">XX</span>
          </h1>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-[#e5e1e4]">
            {authMode === 'phone' ? 'Phone Verification' : isSignUp ? 'Create Account' : 'Sign In'}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-[#a19fa6] mt-1">
            {authMode === 'phone'
              ? 'Fast & secure passwordless sign in via SMS OTP.'
              : isSignUp
              ? 'Join FapnXX for bookmarking, sync, and exclusive content.'
              : 'Sign in to access your personal synchronized feed.'}
          </p>
        </div>

        {/* Method Switcher Tabs */}
        <div className="flex bg-zinc-100 dark:bg-[#1f1e22] p-1 rounded-xl border border-zinc-200 dark:border-white/5">
          <button
            type="button"
            onClick={() => {
              setAuthMode('phone');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'phone'
                ? 'bg-[#ec4899] text-white shadow-sm'
                : 'text-zinc-600 dark:text-[#a19fa6] hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">phone_iphone</span>
            <span>Phone OTP</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('email');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'email'
                ? 'bg-[#ec4899] text-white shadow-sm'
                : 'text-zinc-600 dark:text-[#a19fa6] hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">mail</span>
            <span>Email Login</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-600 dark:text-[#ffdad6] text-center leading-relaxed">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 text-center leading-relaxed">
            {successMsg}
          </div>
        )}

        {/* ── PHONE AUTH FORM ────────────────────────────────────────── */}
        {authMode === 'phone' && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-[#debec8] uppercase tracking-wider ml-1">
                    Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="bg-zinc-50 dark:bg-[#2a2a2c] border border-zinc-300 dark:border-[#353437] rounded-lg py-3 px-2 text-sm text-zinc-900 dark:text-[#e5e1e4] focus:outline-none focus:border-[#ec4899]"
                    >
                      <option value="+91">🇮🇳 +91 (IN)</option>
                      <option value="+1">🇺🇸 +1 (US)</option>
                      <option value="+44">🇬🇧 +44 (UK)</option>
                      <option value="+971">🇦🇪 +971 (UAE)</option>
                      <option value="+65">🇸🇬 +65 (SG)</option>
                      <option value="+61">🇦🇺 +61 (AU)</option>
                      <option value="+49">🇩🇪 +49 (DE)</option>
                    </select>

                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-[#debec8]">
                        <span className="material-symbols-outlined text-lg">call</span>
                      </div>
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Enter 10-digit number"
                        className="w-full bg-zinc-50 dark:bg-[#2a2a2c] border border-zinc-300 dark:border-[#353437] rounded-lg py-3 pl-10 pr-4 text-sm text-zinc-900 dark:text-[#e5e1e4] placeholder-zinc-400 dark:placeholder-[#debec8] focus:outline-none focus:border-[#ec4899] focus:ring-1 focus:ring-[#ec4899] transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full bg-[#ec4899] text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-lg shadow-neon-pink hover:bg-opacity-90 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">sms</span>
                      <span>Send Verification Code</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-[#debec8] uppercase tracking-wider">
                      Enter 6-Digit OTP
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp('');
                        setError('');
                      }}
                      className="text-[11px] text-[#ec4899] dark:text-[#ffb0cd] hover:underline"
                    >
                      Change Number
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-[#debec8]">
                      <span className="material-symbols-outlined text-lg">pin</span>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="• • • • • •"
                      className="w-full text-center tracking-[0.4em] font-mono text-lg font-bold bg-zinc-50 dark:bg-[#2a2a2c] border border-zinc-300 dark:border-[#353437] rounded-lg py-3 pl-10 pr-4 text-zinc-900 dark:text-[#e5e1e4] placeholder-zinc-400 dark:placeholder-[#debec8] focus:outline-none focus:border-[#ec4899] focus:ring-1 focus:ring-[#ec4899] transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-[#a19fa6] px-1">
                  <span>Didn't receive SMS?</span>
                  {resendTimer > 0 ? (
                    <span className="font-mono text-zinc-400">Resend in {resendTimer}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-[#ec4899] dark:text-[#ffb0cd] font-semibold hover:underline cursor-pointer"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="mt-2 w-full bg-[#ec4899] text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-lg shadow-neon-pink hover:bg-opacity-90 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">verified</span>
                      <span>Verify & Continue</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── EMAIL AUTH FORM ────────────────────────────────────────── */}
        {authMode === 'email' && (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-xs font-semibold text-zinc-700 dark:text-[#debec8] uppercase tracking-wider ml-1"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-[#debec8]">
                  <span className="material-symbols-outlined text-lg">mail</span>
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-zinc-50 dark:bg-[#2a2a2c] border border-zinc-300 dark:border-[#353437] rounded-lg py-3 pl-10 pr-4 text-sm text-zinc-900 dark:text-[#e5e1e4] placeholder-zinc-400 dark:placeholder-[#debec8] focus:outline-none focus:border-[#ec4899] focus:ring-1 focus:ring-[#ec4899] transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-end">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold text-zinc-700 dark:text-[#debec8] uppercase tracking-wider ml-1"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-[#debec8]">
                  <span className="material-symbols-outlined text-lg">lock</span>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password (min 6 characters)"
                  className="w-full bg-zinc-50 dark:bg-[#2a2a2c] border border-zinc-300 dark:border-[#353437] rounded-lg py-3 pl-10 pr-10 text-sm text-zinc-900 dark:text-[#e5e1e4] placeholder-zinc-400 dark:placeholder-[#debec8] focus:outline-none focus:border-[#ec4899] focus:ring-1 focus:ring-[#ec4899] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center cursor-pointer text-zinc-400 dark:text-[#debec8] hover:text-zinc-900 dark:hover:text-[#e5e1e4] transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-[#ec4899] text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-lg shadow-neon-pink hover:bg-opacity-90 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
              )}
            </button>

            <div className="mt-1 text-center text-xs text-zinc-600 dark:text-[#debec8]">
              {isSignUp ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setError('');
                    }}
                    className="text-[#ec4899] dark:text-[#ffb0cd] hover:underline font-semibold cursor-pointer"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setError('');
                    }}
                    className="text-[#ec4899] dark:text-[#ffb0cd] hover:underline font-semibold cursor-pointer"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
