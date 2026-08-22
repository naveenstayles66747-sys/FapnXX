import React, { useState } from 'react';
import { videoService } from '../services/videoService';
import { auth, db } from '../services/firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

interface SignInScreenProps {
  onSuccess: (email: string) => void;
  onBack: () => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ onSuccess, onBack }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
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
        // Direct Firebase Auth User Creation
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
        const user = cred.user;
        
        // Create Firestore user record in 'users' collection
        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          email: user.email,
          role: 'USER',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        }, { merge: true });

        setSuccessMsg('Account created successfully! Signing you in...');
        onSuccess(email.trim());
      } else {
        // Direct Firebase Auth Sign In
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
        const user = cred.user;

        // Update last active / login timestamp in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          email: user.email,
          lastLoginAt: new Date().toISOString(),
        }, { merge: true });

        onSuccess(email.trim());
      }
    } catch (err: any) {
      console.warn('[SignIn] Notice:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please Sign In.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
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
      <div className="relative z-10 w-full max-w-[440px] bg-white dark:bg-[#131316] rounded-2xl p-8 sm:p-10 shadow-2xl flex flex-col gap-6 border border-zinc-200 dark:border-[#353437] text-zinc-900 dark:text-[#e5e1e4] transition-all">
        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-3xl font-extrabold tracking-tighter italic mb-2">
            <span className="text-[#e0358d] drop-shadow-[0_0_10px_rgba(224,53,141,0.5)] font-black">Fap</span>
            <span className="brand-letter-n font-black">n</span>
            <span className="text-zinc-900 dark:text-white font-black">XX</span>
          </h1>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-[#e5e1e4]">{isSignUp ? 'Create Account' : 'Sign In'}</h2>
          <p className="text-xs text-zinc-500 dark:text-[#a19fa6] mt-1">
            {isSignUp ? 'Join FapnXX for bookmarking, sync, and exclusive content.' : 'Sign in to access your personal synchronized feed.'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-600 dark:text-[#ffdad6] text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 text-center">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email Input */}
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

          {/* Password Input */}
          <div className="flex flex-col gap-1.5">
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
                  className="text-xs text-zinc-500 dark:text-[#debec8] hover:text-[#ec4899] dark:hover:text-[#ffb0cd] transition-colors"
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full bg-[#ec4899] text-white font-bold text-xs uppercase tracking-wider py-4 rounded-lg shadow-neon-pink hover:bg-opacity-90 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
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

        {/* Footer Toggle */}
        <div className="mt-2 text-center text-sm text-zinc-600 dark:text-[#debec8]">
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setIsSignUp(false);
                  setError('');
                }}
                className="text-[#ec4899] dark:text-[#ffb0cd] hover:underline transition-colors font-semibold cursor-pointer"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setIsSignUp(true);
                  setError('');
                }}
                className="text-[#ec4899] dark:text-[#ffb0cd] hover:underline transition-colors font-semibold cursor-pointer"
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
