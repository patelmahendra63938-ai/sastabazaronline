'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { AlertCircle, CheckCircle2, Loader2, Lock, LogIn, Mail, UserPlus } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

type AccountMode = 'login' | 'signup' | 'forgot';

export default function CustomerAccountPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AccountMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [safeRedirect, setSafeRedirect] = useState('/orders');

  const supabase = useMemo(
    () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'implicit',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    ),
    []
  );

  useEffect(() => {
    const requestedPath = new URLSearchParams(window.location.search).get('redirectTo');
    if (requestedPath && requestedPath.startsWith('/') && !requestedPath.startsWith('//')) {
      setSafeRedirect(requestedPath);
    }
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
      if (error || !data.user) throw new Error(error?.message || 'Unable to sign in.');
      router.replace(safeRedirect);
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
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const emailRedirectTo = `https://www.sastabazaronline.in/account?redirectTo=${encodeURIComponent(safeRedirect)}`;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { emailRedirectTo },
      });
      if (error) throw error;

      if (data.session) {
        router.replace(safeRedirect);
        router.refresh();
        return;
      }

      setSuccessMsg('Account created. Please check your email and confirm your address, then sign in.');
      setMode('login');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const redirectTo = 'https://www.sastabazaronline.in/account/reset-password';
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
      if (error) throw error;
      setSuccessMsg('Password reset link sent. Please check your email and open the secure reset link.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode: AccountMode) => {
    setMode(nextMode);
    resetMessages();
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 w-full max-w-md mx-auto px-4 py-10 sm:py-16">
        <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="px-6 pt-7 sm:px-8 sm:pt-8">
            <h1 className="text-2xl font-black text-indigo-950">Customer Account</h1>
            <p className="text-xs text-gray-500 mt-1">
              {mode === 'forgot'
                ? 'Enter your registered email and we will send you a secure password reset link.'
                : 'Sign in to view your permanent order history, tracking and invoices.'}
            </p>
          </div>

          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 gap-2 p-6 pb-2 sm:px-8">
              <button type="button" onClick={() => switchMode('login')} className={`py-2.5 rounded-xl text-xs font-bold border transition ${mode === 'login' ? 'bg-indigo-950 text-white border-indigo-950' : 'bg-white text-gray-700 border-gray-200'}`}>Sign In</button>
              <button type="button" onClick={() => switchMode('signup')} className={`py-2.5 rounded-xl text-xs font-bold border transition ${mode === 'signup' ? 'bg-indigo-950 text-white border-indigo-950' : 'bg-white text-gray-700 border-gray-200'}`}>Create Account</button>
            </div>
          )}

          <div className={`p-6 sm:px-8 sm:pb-8 ${mode === 'forgot' ? 'pt-6' : 'pt-4'}`}>
            {errorMsg && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5" /><span>{errorMsg}</span></div>}
            {successMsg && <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-semibold flex items-start gap-2"><CheckCircle2 size={16} className="shrink-0 mt-0.5" /><span>{successMsg}</span></div>}

            <form onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-600" />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-gray-700 uppercase">Password</label>
                    {mode === 'login' && <button type="button" onClick={() => switchMode('forgot')} className="text-[11px] font-bold text-indigo-700 hover:underline">Forgot Password?</button>}
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="password" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-600" />
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="password" required autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat your password" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-600" />
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-60">
                {loading ? <Loader2 size={17} className="animate-spin" /> : mode === 'login' ? <LogIn size={17} /> : mode === 'signup' ? <UserPlus size={17} /> : <Mail size={17} />}
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In to My Account' : mode === 'signup' ? 'Create My Account' : 'Send Password Reset Link'}
              </button>
            </form>

            {mode === 'forgot' && <button type="button" onClick={() => switchMode('login')} className="w-full mt-3 text-xs font-bold text-indigo-700 hover:underline">Back to Sign In</button>}

            <div className="mt-5 pt-5 border-t border-gray-100 text-center">
              <Link href="/orders" className="text-xs font-bold text-indigo-700 hover:underline">Continue with guest order lookup</Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
