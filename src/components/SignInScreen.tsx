import React, { useState } from 'react';

interface SignInScreenProps {
  onSuccess: (email: string) => void;
  onBack: () => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ onSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    setError('');
    onSuccess(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-b from-[#131315] to-[#09090b] w-full">
      {/* Background atmospheric overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuD3zkz90ny8g2Bp4iJfeVGeBA4VzYawStf6heVpcUMGd4uMCWGlzvI27EL-2u0WS5vtmSUZsVpKKuUjRms7MIGR2ZCnYvWrJZ9a0yQ-4FMD4u5lu0WI0rBOBnQ-7y1jEKq4HTabMcCvaeOewIa-YSp9VQpRnOMCcFkOE14NyUP0J7yAE2OXw3ZzMu0zIC9LXD968EnofutZGFGAwYdBrUY8UvWSLW7U9GskJdZw1IpqJBgJmMrWHuPbRQ')`,
        }}
      />

      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-[#debec8] hover:text-[#ffb0cd] transition-colors p-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 cursor-pointer"
      >
        <span className="material-symbols-outlined">arrow_back</span>
        <span className="text-xs font-bold uppercase tracking-wider">Back to Browse</span>
      </button>

      {/* Login Container */}
      <div className="relative z-10 w-full max-w-[440px] glass-panel rounded-2xl p-8 sm:p-10 shadow-2xl flex flex-col gap-6 border border-[#353437]">
        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-3xl font-extrabold tracking-tighter italic mb-2">
            <span className="text-[#e0358d] drop-shadow-[0_0_10px_rgba(224,53,141,0.5)] font-black">Fap</span>
            <span className="brand-letter-n font-black">n</span>
            <span className="text-white font-black">XX</span>
          </h1>
          <h2 className="text-2xl font-bold text-[#e5e1e4]">Sign In</h2>
        </div>

        {error && (
          <div className="p-3 bg-[#93000a]/40 border border-[#ffb4ab]/30 rounded-lg text-xs text-[#ffdad6] text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email Input */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-xs font-semibold text-[#debec8] uppercase tracking-wider ml-1"
            >
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#debec8]">
                <span className="material-symbols-outlined text-lg">mail</span>
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full bg-[#2a2a2c] border border-[#353437] rounded-lg py-3 pl-10 pr-4 text-sm text-[#e5e1e4] placeholder-[#debec8] focus:outline-none focus:border-[#ec4899] focus:ring-1 focus:ring-[#ec4899] transition-colors"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-end">
              <label
                htmlFor="password"
                className="text-xs font-semibold text-[#debec8] uppercase tracking-wider ml-1"
              >
                Password
              </label>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-xs text-[#debec8] hover:text-[#ffb0cd] transition-colors"
              >
                Forgot Password?
              </a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#debec8]">
                <span className="material-symbols-outlined text-lg">lock</span>
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-[#2a2a2c] border border-[#353437] rounded-lg py-3 pl-10 pr-10 text-sm text-[#e5e1e4] placeholder-[#debec8] focus:outline-none focus:border-[#ec4899] focus:ring-1 focus:ring-[#ec4899] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center cursor-pointer text-[#debec8] hover:text-[#e5e1e4] transition-colors"
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
            className="mt-4 w-full bg-[#ec4899] text-white font-bold text-xs uppercase tracking-wider py-4 rounded-lg shadow-neon-pink hover:bg-opacity-90 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            Sign In
          </button>
        </form>

        {/* Footer */}
        <div className="mt-2 text-center text-sm text-[#debec8]">
          Don't have an account?{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onSuccess('demo_user@indianhubxx.com');
            }}
            className="text-[#ffb0cd] hover:text-[#ffd9e4] transition-colors font-semibold"
          >
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
};
