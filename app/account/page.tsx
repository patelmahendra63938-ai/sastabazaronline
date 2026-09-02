'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  LogIn,
  Mail,
  UserPlus,
  Package,
  ShoppingBag,
  LogOut,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';

type AccountMode = 'login' | 'signup' | 'forgot';

export default function CustomerAccountPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AccountMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [safeRedirect, setSafeRedirect] = useState('/orders');

  useEffect(() => {
    const requestedPath = new URLSearchParams(
      window.location.search
    ).get('redirectTo');

    if (
      requestedPath &&
      requestedPath.startsWith('/') &&
      !requestedPath.startsWith('//')
    ) {
      setSafeRedirect(requestedPath);
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;

      setSignedInEmail(data.session?.user?.email || null);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSignedInEmail(session?.user?.email || null);
        setCheckingSession(false);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const resetMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    resetMessages();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error || !data.user) {
        throw new Error(error?.message || 'Unable to sign in.');
      }

      setSignedInEmail(
        data.user.email || email.trim().toLowerCase()
      );

      router.replace('/orders');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    resetMessages();

    if (password.length < 8) {
      return setErrorMsg(
        'Password must be at least 8 characters.'
      );
    }

    if (password !== confirmPassword) {
      return setErrorMsg('Passwords do not match.');
    }

    setLoading(true);

    try {
      const emailRedirectTo =
        `https://www.adhyeybrothers.in/account?redirectTo=${encodeURIComponent(
          safeRedirect
        )}`;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo,
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        setSignedInEmail(
          data.user?.email || email.trim().toLowerCase()
        );

        router.replace(safeRedirect);
        router.refresh();

        return;
      }

      setSuccessMsg(
        'Account created. Please check your email and confirm your address, then sign in.'
      );

      setMode('login');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(
        err.message || 'Unable to create account.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    resetMessages();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      return setErrorMsg(
        'Please enter your registered email address.'
      );
    }

    setLoading(true);

    try {
      const redirectTo =
        'https://www.adhyeybrothers.in/account/reset-password';

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo,
          }
        );

      if (error) {
        throw error;
      }

      setSuccessMsg(
        'Password reset link sent. Please check your email and open the secure reset link.'
      );
    } catch (err: any) {
      setErrorMsg(
        err.message ||
          'Unable to send password reset email.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);

    await supabase.auth.signOut();

    setSignedInEmail(null);
    setLoading(false);

    router.refresh();
  };

  const switchMode = (nextMode: AccountMode) => {
    setMode(nextMode);

    resetMessages();

    setPassword('');
    setConfirmPassword('');
  };

  if (checkingSession) {
    return (
      <main className="flex min-h-screen flex-col bg-[#fffaf5]">
        <Header />

        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="animate-spin text-[#741f23]" />
        </div>

        <Footer />
      </main>
    );
  }

  if (signedInEmail) {
    return (
      <main className="flex min-h-screen flex-col bg-[#fffaf5]">
        <Header />

        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
          <div className="rounded-3xl border border-[#ead8b8] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-[#ead8b8] pb-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-[11px] font-bold uppercase text-green-700">
                  Signed in
                </p>

                <h1 className="text-2xl font-black text-[#741f23]">
                  My Account
                </h1>

                <p className="mt-1 text-xs text-gray-500">
                  {signedInEmail}
                </p>
              </div>

              <button
                onClick={handleLogout}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#ead8b8] px-4 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-[#fffaf5] disabled:opacity-60"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Link
                href="/orders"
                className="rounded-2xl border border-[#ead8b8] bg-[#fff7e8] p-5 transition hover:bg-[#f8ead2]"
              >
                <Package
                  className="text-[#741f23]"
                  size={24}
                />

                <h2 className="mt-3 font-black text-[#741f23]">
                  My Orders
                </h2>

                <p className="mt-1 text-xs text-gray-600">
                  View all previous orders, live status,
                  tracking, invoices and eligible
                  cancellation/return actions.
                </p>
              </Link>

              <Link
                href="/"
                className="rounded-2xl border border-[#ead8b8] bg-[#fff7e8] p-5 transition hover:bg-[#f8ead2]"
              >
                <ShoppingBag
                  className="text-[#b5843d]"
                  size={24}
                />

                <h2 className="mt-3 font-black text-[#741f23]">
                  Continue Shopping
                </h2>

                <p className="mt-1 text-xs text-gray-600">
                  Browse products without signing in again.
                  Your account session stays active until you
                  sign out or it expires.
                </p>
              </Link>
            </div>
          </div>
        </div>

        <Footer />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#fffaf5]">
      <Header />

      <div className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:py-16">
        <div className="overflow-hidden rounded-3xl border border-[#ead8b8] bg-white shadow-sm">
          <div className="px-6 pt-7 sm:px-8 sm:pt-8">
            <h1 className="text-2xl font-black text-[#741f23]">
              Customer Account
            </h1>

            <p className="mt-1 text-xs text-gray-500">
              {mode === 'forgot'
                ? 'Enter your registered email and we will send you a secure password reset link.'
                : 'Sign in once to keep your order history, tracking and account access available.'}
            </p>
          </div>

          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 gap-2 p-6 pb-2 sm:px-8">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`rounded-xl border py-2.5 text-xs font-bold ${
                  mode === 'login'
                    ? 'border-[#741f23] bg-[#741f23] text-white'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`rounded-xl border py-2.5 text-xs font-bold ${
                  mode === 'signup'
                    ? 'border-[#741f23] bg-[#741f23] text-white'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          <div
            className={`p-6 sm:px-8 sm:pb-8 ${
              mode === 'forgot' ? 'pt-6' : 'pt-4'
            }`}
          >
            {errorMsg && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                <AlertCircle size={16} />

                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-xs font-semibold text-green-700">
                <CheckCircle2 size={16} />

                <span>{successMsg}</span>
              </div>
            )}

            <form
              onSubmit={
                mode === 'login'
                  ? handleLogin
                  : mode === 'signup'
                    ? handleSignup
                    : handleForgotPassword
              }
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase text-gray-700">
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#741f23] focus:ring-2 focus:ring-[#741f23]/20"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-[11px] font-bold uppercase text-gray-700">
                      Password
                    </label>

                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() =>
                          switchMode('forgot')
                        }
                        className="text-[11px] font-bold text-[#741f23] hover:underline"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      type="password"
                      required
                      autoComplete={
                        mode === 'login'
                          ? 'current-password'
                          : 'new-password'
                      }
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      placeholder="Minimum 8 characters"
                      className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#741f23] focus:ring-2 focus:ring-[#741f23]/20"
                    />
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase text-gray-700">
                    Confirm Password
                  </label>

                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    placeholder="Repeat your password"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#741f23] focus:ring-2 focus:ring-[#741f23]/20"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#741f23] py-3.5 text-sm font-bold text-white transition hover:bg-[#5e171b] disabled:opacity-60"
              >
                {loading ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : mode === 'login' ? (
                  <LogIn size={17} />
                ) : mode === 'signup' ? (
                  <UserPlus size={17} />
                ) : (
                  <Mail size={17} />
                )}

                {loading
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Sign In to My Account'
                    : mode === 'signup'
                      ? 'Create My Account'
                      : 'Send Password Reset Link'}
              </button>
            </form>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="mt-3 w-full text-xs font-bold text-[#741f23] hover:underline"
              >
                Back to Sign In
              </button>
            )}

            <div className="mt-5 border-t border-[#ead8b8] pt-5 text-center">
              <Link
                href="/orders"
                className="text-xs font-bold text-[#741f23] hover:underline"
              >
                Continue with guest order lookup
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}