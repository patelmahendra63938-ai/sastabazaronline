'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2, Lock, LogIn, Mail, UserPlus, Package, ShoppingBag, LogOut } from 'lucide-react';
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
    const requestedPath = new URLSearchParams(window.location.search).get('redirectTo');
    if (requestedPath && requestedPath.startsWith('/') && !requestedPath.startsWith('//')) {
      setSafeRedirect(requestedPath);
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSignedInEmail(data.session?.user?.email || null);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInEmail(session?.user?.email || null);
      setCheckingSession(false);
    });

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
      if (error || !data.user) throw new Error(error?.message || 'Unable to sign in.');
      setSignedInEmail(data.user.email || email.trim().toLowerCase());
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
    if (password.length < 8) return setErrorMsg('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setErrorMsg('Passwords do not match.');

    setLoading(true);
    try {
      const emailRedirectTo = `https://www.adhyeybrothers.in/account?redirectTo=${encodeURIComponent(safeRedirect)}`;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { emailRedirectTo },
      });
      if (error) throw error;
      if (data.session) {
        setSignedInEmail(data.user?.email || email.trim().toLowerCase());
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
    if (!cleanEmail) return setErrorMsg('Please enter your registered email address.');

    setLoading(true);
    try {
      const redirectTo = 'https://www.adhyeybrothers.in/account/reset-password';
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
      if (error) throw error;
      setSuccessMsg('Password reset link sent. Please check your email and open the secure reset link.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to send password reset email.');
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
    return <main className="min-h-screen bg-[#fffaf5] flex flex-col"><Header /><div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-[#741f23]" /></div><Footer /></main>;
  }

  if (signedInEmail) {
    return (
      <main className="min-h-screen bg-[#fffaf5] flex flex-col">
        <Header />
        <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-10 sm:py-14">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
              <div>
                <p className="text-[11px] font-bold uppercase text-green-700">Signed in</p>
                <h1 className="text-2xl font-black text-[#741f23]">My Account</h1>
                <p className="text-xs text-gray-500 mt-1">{signedInEmail}</p>
              </div>
              <button onClick={handleLogout} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-[#fffaf5]"><LogOut size={15}/> Sign Out</button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              <Link href="/orders" className="rounded-2xl border border-[#ead8b8] bg-[#fff7e8] p-5 hover:bg-[#f8ead2] transition">
                <Package className="text-[#741f23]" size={24}/>
                <h2 className="font-black text-[#741f23] mt-3">My Orders</h2>
                <p className="text-xs text-gray-600 mt-1">View all previous orders, live status, tracking, invoices and eligible cancellation/return actions.</p>
              </Link>
              <Link href="/" className="rounded-2xl border border-[#ead8b8] bg-[#fff7e8] p-5 hover:bg-[#f8ead2] transition">
                <ShoppingBag className="text-[#b5843d]" size={24}/>
                <h2 className="font-black text-[#741f23] mt-3">Continue Shopping</h2>
                <p className="text-xs text-gray-600 mt-1">Browse products without signing in again. Your account session stays active until you sign out or it expires.</p>
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf5] flex flex-col">
      <Header />
      <div className="flex-1 w-full max-w-md mx-auto px-4 py-10 sm:py-16">
        <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="px-6 pt-7 sm:px-8 sm:pt-8">
            <h1 className="text-2xl font-black text-[#741f23]">Customer Account</h1>
            <p className="text-xs text-gray-500 mt-1">{mode === 'forgot' ? 'Enter your registered email and we will send you a secure password reset link.' : 'Sign in once to keep your order history, tracking and account access available.'}</p>
          </div>

          {mode !== 'forgot' && <div className="grid grid-cols-2 gap-2 p-6 pb-2 sm:px-8"><button type="button" onClick={() => switchMode('login')} className={`py-2.5 rounded-xl text-xs font-bold border ${mode === 'login' ? 'bg-[#741f23] text-white border-[#741f23]' : 'bg-white text-gray-700 border-gray-200'}`}>Sign In</button><button type="button" onClick={() => switchMode('signup')} className={`py-2.5 rounded-xl text-xs font-bold border ${mode === 'signup' ? 'bg-[#741f23] text-white border-[#741f23]' : 'bg-white text-gray-700 border-gray-200'}`}>Create Account</button></div>}

          <div className={`p-6 sm:px-8 sm:pb-8 ${mode === 'forgot' ? 'pt-6' : 'pt-4'}`}>
            {errorMsg && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2"><AlertCircle size={16}/><span>{errorMsg}</span></div>}
            {successMsg && <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-semibold flex items-start gap-2"><CheckCircle2 size={16}/><span>{successMsg}</span></div>}

            <form onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleForgotPassword} className="space-y-4">
              <div><label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">Email Address</label><div className="relative"><Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/><input type="email" required autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#741f23]"/></div></div>
              {mode !== 'forgot' && <div><div className="flex items-center justify-between mb-1.5"><label className="block text-[11px] font-bold text-gray-700 uppercase">Password</label>{mode === 'login' && <button type="button" onClick={()=>switchMode('forgot')} className="text-[11px] font-bold text-[#741f23] hover:underline">Forgot Password?</button>}</div><div className="relative"><Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/><input type="password" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Minimum 8 characters" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#741f23]"/></div></div>}
              {mode === 'signup' && <div><label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">Confirm Password</label><input type="password" required autoComplete="new-password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} placeholder="Repeat your password" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#741f23]"/></div>}
              <button type="submit" disabled={loading} className="w-full bg-[#fff7e8]0 hover:bg-[#5e171b] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-60">{loading ? <Loader2 size={17} className="animate-spin"/> : mode === 'login' ? <LogIn size={17}/> : mode === 'signup' ? <UserPlus size={17}/> : <Mail size={17}/>} {loading ? 'Please wait...' : mode === 'login' ? 'Sign In to My Account' : mode === 'signup' ? 'Create My Account' : 'Send Password Reset Link'}</button>
            </form>
            {mode === 'forgot' && <button type="button" onClick={()=>switchMode('login')} className="w-full mt-3 text-xs font-bold text-[#741f23] hover:underline">Back to Sign In</button>}
            <div className="mt-5 pt-5 border-t border-gray-100 text-center"><Link href="/orders" className="text-xs font-bold text-[#741f23] hover:underline">Continue with guest order lookup</Link></div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
