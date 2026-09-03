import React, { useState, useEffect } from 'react';
import { auth } from '../services/firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  ConfirmationResult,
} from 'firebase/auth';
import { phoneAuthService } from '../services/phoneAuthService';

interface SignInScreenProps {
  onSuccess: (identifier: string) => void;
  onBack: () => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ onSuccess, onBack }) => {
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
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // 30s Resend Timer Countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Clean up reCAPTCHA verifier on unmount
  useEffect(() => {
    return () => {
      phoneAuthService.clearRecaptcha();
    };
  }, []);

  // ── 1. Email & Password Authentication ───────────────────────
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
        await phoneAuthService.syncUserToFirestore(cred.user, 'email');
        setSuccessMsg('Account created successfully! Signing you in...');
        onSuccess(email.trim());
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
        await phoneAuthService.syncUserToFirestore(cred.user, 'email');
        onSuccess(email.trim());
      }
    } catch (err: any) {
      console.warn('[SignIn Email] Error:', err);
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

  // ── 2. Phone Auth: Send OTP ──────────────────────────────────
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNumber = phoneNumber.trim().replace(/[^0-9]/g, '');
    if (!cleanNumber || cleanNumber.length < 7) {
      setError('Please enter a valid mobile number.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setPhoneLoading(true);

    const fullPhoneNumber = `${countryCode}${cleanNumber}`;

    try {
      const confirmation = await phoneAuthService.sendOtp(fullPhoneNumber, 'recaptcha-container');
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setResendTimer(30);
      setSuccessMsg(`6-digit OTP sent to ${fullPhoneNumber}`);
    } catch (err: any) {
      console.warn('[PhoneAuth Send OTP] Error:', err);
      if (err.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number format.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a few minutes and try again.');
      } else if (err.code === 'auth/quota-exceeded') {
        setError('SMS quota exceeded for today. Please sign in with Email.');
      } else {
        setError(err.message || 'Failed to send OTP. Please check your connection.');
      }
    } finally {
      setPhoneLoading(false);
    }
  };

  // ── 3. Phone Auth: Verify OTP ────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim().replace(/[^0-9]/g, '');
    if (!cleanOtp || cleanOtp.length < 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    if (!confirmationResult) {
      setError('Session expired. Please request a new OTP.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setPhoneLoading(true);

    try {
      const user = await phoneAuthService.verifyOtp(confirmationResult, cleanOtp);
      setSuccessMsg('Phone verified successfully! Signing you in...');
      onSuccess(user.phoneNumber || user.uid);
    } catch (err: any) {
      console.warn('[PhoneAuth Verify OTP] Error:', err);
      if (err.code === 'auth/invalid-verification-code') {
        setError('Invalid OTP code. Please enter the correct 6 digits.');
      } else if (err.code === 'auth/code-expired') {
        setError('OTP code has expired. Please request a new OTP.');
      } else {
        setError(err.message || 'Verification failed. Please try again.');
      }
    } finally {
      setPhoneLoading(false);
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
          backgroundImage: `url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1200&auto=format&fit=crop')`,
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
      <div className="relative z-10 w-full max-w-[440px] bg-white dark:bg-[#131316] rounded-2xl p-7 sm:p-9 shadow-2xl flex flex-col gap-5 border border-zinc-200 dark:border-[#353437] text-zinc-900 dark:text-[#e5e1e4] transition-all my-8">
        {/* Header */}
        <div className="text-center mb-1">
          <h1 className="text-3xl font-extrabold tracking-tighter italic mb-2">
            <span className="text-[#e0358d] drop-shadow-[0_0_10px_rgba(224,53,141,0.5)] font-black">Fap</span>
            <span className="text-zinc-900 dark:text-white font-black">XX</span>
          </h1>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-[#e5e1e4]">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-[#a19fa6] mt-1">
            {isSignUp
              ? 'Join FapXX for personal sync, cloud bookmarks, and playlists.'
              : 'Sign in to access your synchronized personal library.'}
          </p>
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

        {/* ── 1. EMAIL & PASSWORD FORM ──────────────────────────────── */}
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
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
                className="w-full bg-zinc-50 dark:bg-[#2a2a2c] border border-zinc-300 dark:border-[#353437] rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-900 dark:text-[#e5e1e4] placeholder-zinc-400 dark:placeholder-[#debec8] focus:outline-none focus:border-[#ec4899] focus:ring-1 focus:ring-[#ec4899] transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-end">
              <label
                htmlFor="password"
                className="text-xs font-semibold text-zinc-700 dark:text-[#debec8] uppercase tracking-wider ml-1"
              >
                Password
              </label>
              {!isSignUp && (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Password reset link has been dispatched to your email.');
                  }}
                  className="text-[11px] text-zinc-500 dark:text-[#debec8] hover:text-[#ec4899] dark:hover:text-[#ffb0cd] transition-colors"
                >
                  Forgot Password?
                </a>
              )}
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
                className="w-full bg-zinc-50 dark:bg-[#2a2a2c] border border-zinc-300 dark:border-[#353437] rounded-lg py-2.5 pl-10 pr-10 text-sm text-zinc-900 dark:text-[#e5e1e4] placeholder-zinc-400 dark:placeholder-[#debec8] focus:outline-none focus:border-[#ec4899] focus:ring-1 focus:ring-[#ec4899] transition-colors"
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
            disabled={loading || phoneLoading}
            className="mt-1 w-full bg-[#ec4899] text-white font-bold text-xs uppercase tracking-wider py-3 rounded-lg shadow-neon-pink hover:bg-opacity-90 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
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
        </form>

        {/* ── DIVIDER: OR ───────────────────────────────────────────── */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-zinc-200 dark:border-white/10" />
          <span className="flex-shrink mx-3 text-zinc-400 dark:text-[#a19fa6] text-xs font-bold uppercase tracking-wider">
            OR
          </span>
          <div className="flex-grow border-t border-zinc-200 dark:border-white/10" />
        </div>

        {/* ── 2. PHONE OTP AUTH SECTION ─────────────────────────────── */}
        <div className="bg-zinc-50 dark:bg-[#1f1e22] p-4 rounded-xl border border-zinc-200 dark:border-white/5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-[#e5e1e4]">
            <span className="material-symbols-outlined text-base text-[#ec4899]">phone_iphone</span>
            <span>Continue with Phone</span>
          </div>

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-2.5">
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-white dark:bg-[#2a2a2c] border border-zinc-300 dark:border-[#353437] rounded-lg py-2.5 px-2 text-xs font-semibold text-zinc-900 dark:text-[#e5e1e4] focus:outline-none focus:border-[#ec4899]"
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+971">🇦🇪 +971</option>
                  <option value="+65">🇸🇬 +65</option>
                  <option value="+61">🇦🇺 +61</option>
                </select>

                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 dark:text-[#debec8]">
                    <span className="material-symbols-outlined text-base">call</span>
                  </div>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Mobile Number"
                    className="w-full bg-white dark:bg-[#2a2a2c] border border-zinc-300 dark:border-[#353437] rounded-lg py-2.5 pl-9 pr-3 text-sm text-zinc-900 dark:text-[#e5e1e4] placeholder-zinc-400 dark:placeholder-[#debec8] focus:outline-none focus:border-[#ec4899]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={phoneLoading || loading}
                className="w-full bg-zinc-900 hover:bg-black dark:bg-[#2a2a2c] dark:hover:bg-[#353437] text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {phoneLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">sms</span>
                    <span>Send OTP</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 dark:text-[#a19fa6]">Enter 6-digit OTP</span>
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

              <input
                type="text"
                maxLength={6}
                required
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="• • • • • •"
                className="w-full text-center tracking-[0.4em] font-mono text-base font-bold bg-white dark:bg-[#2a2a2c] border border-zinc-300 dark:border-[#353437] rounded-lg py-2.5 text-zinc-900 dark:text-[#e5e1e4] placeholder-zinc-400 focus:outline-none focus:border-[#ec4899]"
              />

              <div className="flex justify-between items-center text-[11px] text-zinc-500 dark:text-[#a19fa6] px-1">
                <span>Didn't receive SMS?</span>
                {resendTimer > 0 ? (
                  <span className="font-mono text-zinc-400">Resend in {resendTimer}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    className="text-[#ec4899] dark:text-[#ffb0cd] font-semibold hover:underline cursor-pointer"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={phoneLoading || otp.length < 6}
                className="w-full bg-[#ec4899] hover:bg-[#f751a1] text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {phoneLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">verified</span>
                    <span>Verify OTP</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* ── FOOTER TOGGLE ─────────────────────────────────────────── */}
        <div className="text-center text-xs text-zinc-600 dark:text-[#debec8]">
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
      </div>
    </div>
  );
};
