'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { ShieldCheck, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Invalid credentials.');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (
        profileError ||
        !profile ||
        !['admin', 'super_admin', 'staff'].includes(profile.role)
      ) {
        await supabase.auth.signOut();
        throw new Error(
          'Access Denied: You do not possess staff or administrative authorization.'
        );
      }

      const requestedPath = new URLSearchParams(
        window.location.search
      ).get('redirect');

      const redirectPath =
        requestedPath &&
        (requestedPath === '/admin' || requestedPath.startsWith('/admin/'))
          ? requestedPath
          : '/admin/dashboard';

      router.replace(redirectPath);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#5e171b] px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-[#ead8b8] bg-[#fffdf9] p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ead8b8] bg-[#fff7e8]">
            <ShieldCheck size={36} className="text-[#741f23]" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-[#741f23]">
            ADHYEY BROTHERS Staff Portal
          </h1>

          <p className="mt-1 text-xs text-stone-500">
            Authorized personnel and operations login only.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-stone-600">
              Staff Email
            </label>

            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="adhyeybrothers@gmail.com"
                className="w-full rounded-xl border border-[#e7ded4] bg-white py-3 pl-10 pr-4 text-xs text-gray-900 placeholder-stone-400 transition focus:border-[#741f23] focus:outline-none focus:ring-2 focus:ring-[#741f23]/20"
              />

              <Mail
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-stone-600">
              Password
            </label>

            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-[#e7ded4] bg-white py-3 pl-10 pr-4 text-xs text-gray-900 placeholder-stone-400 transition focus:border-[#741f23] focus:outline-none focus:ring-2 focus:ring-[#741f23]/20"
              />

              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#741f23] py-3.5 text-xs font-bold text-white shadow-lg transition hover:bg-[#5e171b] disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ShieldCheck size={16} />
            )}

            <span>
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </span>
          </button>
        </form>

        <div className="mt-8 border-t border-[#ead8b8] pt-6 text-center">
          <p className="text-[11px] text-stone-500">
            Unauthorized access attempts are logged and monitored.
          </p>
        </div>
      </div>
    </div>
  );
}