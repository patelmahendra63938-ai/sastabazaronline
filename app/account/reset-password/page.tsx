'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { AlertCircle, CheckCircle2, Loader2, Lock } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
    let active = true;

    const checkRecoverySession = async () => {
      setSessionLoading(true);
      setErrorMsg('');
      try {
        // With the implicit flow, Supabase reads the recovery tokens from the URL hash
        // and persists the resulting session automatically in the browser.
        await new Promise((resolve) => window.setTimeout(resolve, 250));
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data.session) {
          if (active) {
            setRecoveryReady(true);
            setErrorMsg('');
          }
          return;
        }

        if (active) {
          setRecoveryReady(false);
          setErrorMsg('This password reset link is invalid or has expired. Please request a new link.');
        }
      } catch (err: any) {
        if (active) {
          setRecoveryReady(false);
          setErrorMsg(err.message || 'Unable to verify the password reset link. Please request a new link.');
        }
      } finally {
        if (active) setSessionLoading(false);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        setRecoveryReady(true);
        setSessionLoading(false);
        setErrorMsg('');
      }
    });

    checkRecoverySession();

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!recoveryReady) {
      setErrorMsg('Password reset session is not ready. Please request a fresh reset link.');
      return;
    }
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccessMsg('Your password has been updated successfully. You can now sign in with your new password.');
      setPassword('');
      setConfirmPassword('');
      await supabase.auth.signOut();

      window.setTimeout(() => {
        router.replace('/account');
        router.refresh();
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to reset password. Please request a new password reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 w-full max-w-md mx-auto px-4 py-10 sm:py-16">
        <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8">
            <h1 className="text-2xl font-black text-indigo-950">Create New Password</h1>
            <p className="text-xs text-gray-500 mt-1 mb-6">Enter a new password for your SASTABAZARONLINE customer account.</p>

            {sessionLoading && (
              <div className="mb-4 p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold flex items-center gap-2">
                <Loader2 size={16} className="animate-spin shrink-0" />
                <span>Verifying your secure password reset link...</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-semibold flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="password" required disabled={!recoveryReady || sessionLoading || loading} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-600 disabled:bg-gray-100 disabled:text-gray-500" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="password" required disabled={!recoveryReady || sessionLoading || loading} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat your new password" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-600 disabled:bg-gray-100 disabled:text-gray-500" />
                </div>
              </div>

              <button type="submit" disabled={loading || sessionLoading || !recoveryReady} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-60">
                {loading || sessionLoading ? <Loader2 size={17} className="animate-spin" /> : <Lock size={17} />}
                {sessionLoading ? 'Verifying Link...' : loading ? 'Updating Password...' : 'Set New Password'}
              </button>
            </form>

            {!sessionLoading && !recoveryReady && (
              <div className="mt-4 text-center">
                <Link href="/account" className="text-xs font-bold text-indigo-700 hover:underline">Request a New Reset Link</Link>
              </div>
            )}

            <div className="mt-5 pt-5 border-t border-gray-100 text-center">
              <Link href="/account" className="text-xs font-bold text-indigo-700 hover:underline">Back to Customer Sign In</Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
