'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { login, isAuthenticated } from '@/services/admin/authService';

const BEGA_MARK = (
  <svg viewBox="0 0 20 27" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" fill="currentColor"
      d="M5.007,5.386 L5.007,11.272 C5.085,11.278 5.147,11.289 5.21,11.289 C6.935,11.289 8.661,11.304 10.387,11.284 C11.325,11.273 12.221,11.047 13.027,10.538 C13.776,10.064 14.208,9.391 14.226,8.477 C14.244,7.507 13.979,6.661 13.169,6.064 C12.45,5.534 11.617,5.374 10.753,5.371 C8.935,5.364 7.117,5.38 5.299,5.386 C5.208,5.387 5.118,5.386 5.007,5.386 Z
      M5.005,22.619 C5.102,22.625 5.183,22.635 5.265,22.635 C7.028,22.635 8.791,22.651 10.554,22.626 C11.086,22.618 11.63,22.55 12.146,22.418 C13.243,22.137 14.134,21.561 14.57,20.432 C14.806,19.82 14.825,19.181 14.755,18.546 C14.624,17.356 14.049,16.448 12.978,15.899 C12.246,15.524 11.462,15.37 10.643,15.372 C8.862,15.375 7.08,15.374 5.298,15.375 C5.201,15.375 5.103,15.375 5.005,15.375 Z
      M0,1.056 C0.092,1.049 0.184,1.035 0.276,1.035 C4.388,1.034 8.501,1.015 12.613,1.044 C14.357,1.056 15.953,1.588 17.286,2.773 C18.29,3.666 18.827,4.821 18.993,6.151 C19.126,7.21 19.141,8.272 18.798,9.298 C18.31,10.762 17.29,11.79 16.047,12.621 C15.946,12.688 15.843,12.751 15.742,12.816 C15.735,12.821 15.732,12.831 15.712,12.861 C15.795,12.907 15.877,12.953 15.961,12.997 C17.725,13.921 19.057,15.24 19.691,17.19 C20.037,18.254 20.048,19.351 19.929,20.449 C19.807,21.567 19.511,22.635 18.921,23.602 C17.958,25.18 16.521,26.093 14.798,26.598 C13.895,26.862 12.969,26.982 12.029,26.982 C8.084,26.983 4.138,26.982 0.193,26.983 C0.129,26.983 0.064,26.994 0,27 Z" />
  </svg>
);

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated()) router.replace('/admin/dashboard');
  }, [router]);

  useEffect(() => {
    import('gsap').then(({ gsap }) => {
      gsap.fromTo(panelRef.current,
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' });
      gsap.fromTo('.login-mark-float',
        { y: 0 },
        { y: -14, duration: 3.4, ease: 'sine.inOut', repeat: -1, yoyo: true, stagger: 0.4 });
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      router.replace('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const INPUT_BASE =
    'w-full px-4 py-3 rounded-xl border text-[13.5px] text-bega-text-1 bg-white ' +
    'placeholder:text-bega-text-3 focus:outline-none focus:ring-2 transition-colors';

  return (
    <div className="h-full w-full flex">

      {/* ── Left: form ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 bg-bega-bg-0">
        <div ref={panelRef} className="w-full max-w-[400px]">

          {/* Brand */}
          <div className="flex flex-col items-start mb-8">
            <div className="w-9 h-12 text-bega-black mb-5">{BEGA_MARK}</div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-bega-black">
              Admin Panel
            </p>
            <p className="text-[12px] text-bega-text-3 mt-1">Sign in to manage BEGA AI content</p>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border border-bega-border-1 shadow-sm px-8 py-7">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* Username */}
              <div>
                <label className="block text-[11px] font-semibold text-bega-text-2 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className={`${INPUT_BASE} ${
                    error
                      ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                      : 'border-bega-border-2 focus:ring-bega-black/10 focus:border-bega-black/40'
                  }`}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-semibold text-bega-text-2 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`${INPUT_BASE} pr-11 ${
                      error
                        ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                        : 'border-bega-border-2 focus:ring-bega-black/10 focus:border-bega-black/40'
                    }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-bega-text-3
                               hover:text-bega-text-1 transition-colors"
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="w-4 h-4">
                        <path d="M2 2l16 16M7.5 7.6A4 4 0 0012.4 12.5" />
                        <path d="M10 4C5 4 2 10 2 10s1 2 3 3.5M10 4c5 0 8 6 8 6s-1 2-3 3.5" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="w-4 h-4">
                        <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" />
                        <circle cx="10" cy="10" r="2.5" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 border border-red-100">
                  <svg viewBox="0 0 16 16" fill="none" stroke="#DC2626" strokeWidth={1.6} strokeLinecap="round" className="w-4 h-4 flex-shrink-0">
                    <circle cx="8" cy="8" r="6" />
                    <path d="M8 5v3.5M8 10.5h.01" />
                  </svg>
                  <p className="text-[12.5px] text-red-700">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !username.trim() || !password}
                className="w-full flex items-center justify-center gap-2.5 py-3 mt-2
                           bg-bega-black text-white text-[13.5px] font-medium rounded-xl
                           hover:bg-bega-black/85 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] text-bega-text-3 mt-6">
            BEGA AI · Content Management System
          </p>
        </div>
      </div>

      {/* ── Right: brand visual ──────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden bg-bega-black">
        {/* Ambient gradient glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-bega-black via-[#161616] to-bega-black" />
        <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full
                        bg-gradient-to-br from-white/[0.06] to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[360px] h-[360px] rounded-full
                        bg-gradient-to-tr from-amber-200/[0.05] to-transparent blur-3xl" />

        {/* Floating brand marks */}
        <div className="login-mark-float absolute top-[18%] left-[14%] w-8 h-11 text-white/10">{BEGA_MARK}</div>
        <div className="login-mark-float absolute top-[60%] left-[22%] w-5 h-7 text-white/[0.07]">{BEGA_MARK}</div>
        <div className="login-mark-float absolute top-[28%] right-[16%] w-6 h-8 text-white/[0.08]">{BEGA_MARK}</div>
        <div className="login-mark-float absolute bottom-[16%] right-[20%] w-10 h-14 text-white/[0.06]">{BEGA_MARK}</div>

        {/* Centerpiece copy */}
        <div className="relative z-10 max-w-[440px] px-12 text-center">
          <div className="w-14 h-[72px] mx-auto mb-8 text-white">{BEGA_MARK}</div>
          <div className="w-10 h-px bg-white/20 mx-auto mb-6" />
          <h2 className="text-white text-[26px] font-semibold tracking-tight leading-snug mb-4">
            Light, intelligently specified.
          </h2>
          <p className="text-white/50 text-[13.5px] leading-relaxed">
            The AI advisor behind every product recommendation, lead conversation,
            and bill of materials BEGA generates — managed from here.
          </p>
        </div>
      </div>
    </div>
  );
}
