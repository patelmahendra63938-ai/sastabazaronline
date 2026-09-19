'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  KeyRound,
  Loader2,
  LogOut,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Mode = 'loading' | 'enroll' | 'verify';

export default function AdminMfaPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<Mode>('loading');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const getRedirectPath = () => {
    const requested = new URLSearchParams(window.location.search).get('redirect');
    return requested &&
      (requested === '/admin' || requested.startsWith('/admin/'))
      ? requested
      : '/admin/dashboard';
  };

  useEffect(() => {
    let active = true;

    const prepareMfa = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace('/login');
          return;
        }

        const { data: aal, error: aalError } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (aalError) throw aalError;

        if (aal.currentLevel === 'aal2') {
          router.replace(getRedirectPath());
          return;
        }

        const { data: factors, error: factorsError } =
          await supabase.auth.mfa.listFactors();

        if (factorsError) throw factorsError;

        const verifiedFactor = factors.totp.find(
          (factor) => factor.status === 'verified'
        );

        if (verifiedFactor) {
          if (!active) return;
          setFactorId(verifiedFactor.id);
          setMode('verify');
          return;
        }

        // Remove abandoned, unverified TOTP enrollments before creating a fresh QR.
        for (const factor of factors.totp) {
          if (factor.status !== 'verified') {
            await supabase.auth.mfa.unenroll({ factorId: factor.id });
          }
        }

        const { data: enrollment, error: enrollError } =
          await supabase.auth.mfa.enroll({
            factorType: 'totp',
            friendlyName: 'Adhyey Brothers Admin',
          });

        if (enrollError) throw enrollError;
        if (!active) return;

        setFactorId(enrollment.id);
        setQrCode(enrollment.totp.qr_code);
        setSecret(enrollment.totp.secret);
        setMode('enroll');
      } catch (error) {
        if (!active) return;
        setErrorMsg(
          error instanceof Error
            ? error.message
            : 'Unable to start authenticator verification.'
        );
        setMode('verify');
      }
    };

    prepareMfa();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  const verify = async () => {
    const normalizedCode = code.replace(/\s/g, '');

    if (!/^\d{6}$/.test(normalizedCode)) {
      setErrorMsg('Enter the 6-digit code from your authenticator app.');
      return;
    }

    if (!factorId) {
      setErrorMsg('Authenticator setup is not ready. Refresh and try again.');
      return;
    }

    setBusy(true);
    setErrorMsg('');

    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: normalizedCode,
      });

      if (verifyError) throw verifyError;

      const { data: aal, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError || aal.currentLevel !== 'aal2') {
        throw new Error('Authenticator verification did not complete.');
      }

      router.replace(getRedirectPath());
      router.refresh();
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : 'Invalid authenticator code. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#5e171b] px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-[#ead8b8] bg-[#fffdf9] p-8 shadow-2xl">
        <div className="mb-7 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ead8b8] bg-[#fff7e8]">
            <ShieldCheck size={36} className="text-[#741f23]" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-[#741f23]">
            Admin Authenticator
          </h1>

          <p className="mt-2 text-xs leading-5 text-stone-500">
            {mode === 'enroll'
              ? 'Scan the QR code once, then enter the 6-digit code.'
              : 'Enter the current 6-digit code from your authenticator app.'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {mode === 'loading' ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-stone-600">
            <Loader2 size={18} className="animate-spin" />
            Preparing secure login...
          </div>
        ) : (
          <div className="space-y-5">
            {mode === 'enroll' && qrCode && (
              <div className="space-y-4">
                <div className="mx-auto w-fit rounded-2xl border border-[#ead8b8] bg-white p-3">
                  <Image
                    src={qrCode}
                    alt="Authenticator QR code"
                    width={220}
                    height={220}
                    unoptimized
                  />
                </div>

                <div className="rounded-xl border border-[#ead8b8] bg-[#fff7e8] p-4">
                  <div className="mb-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-[#741f23]">
                    <Smartphone size={14} />
                    Manual setup key
                  </div>
                  <p className="break-all font-mono text-xs text-stone-700">
                    {secret}
                  </p>
                </div>

                <p className="text-center text-[11px] leading-5 text-stone-500">
                  Use Google Authenticator, Microsoft Authenticator, Authy,
                  1Password, or another TOTP app.
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="mfa-code"
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-stone-600"
              >
                6-digit authenticator code
              </label>

              <div className="relative">
                <input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !busy) void verify();
                  }}
                  placeholder="123456"
                  className="w-full rounded-xl border border-[#e7ded4] bg-white py-3 pl-10 pr-4 text-center font-mono text-lg tracking-[0.35em] text-gray-900 placeholder-stone-300 transition focus:border-[#741f23] focus:outline-none focus:ring-2 focus:ring-[#741f23]/20"
                />
                <KeyRound
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => void verify()}
              disabled={busy || code.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#741f23] py-3.5 text-xs font-bold text-white shadow-lg transition hover:bg-[#5e171b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ShieldCheck size={16} />
              )}
              {busy ? 'Verifying...' : 'Verify & Open Admin'}
            </button>
          </div>
        )}

        <div className="mt-7 border-t border-[#ead8b8] pt-5">
          <button
            type="button"
            onClick={() => void signOut()}
            className="mx-auto flex items-center gap-2 text-xs font-semibold text-stone-500 transition hover:text-[#741f23]"
          >
            <LogOut size={14} />
            Sign out and return to login
          </button>
        </div>
      </div>
    </div>
  );
}
