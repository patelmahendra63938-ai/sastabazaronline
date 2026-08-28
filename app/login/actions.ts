'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const ADMIN_ROLES = ['admin', 'super_admin', 'staff'] as const;

export type AdminLoginResult =
  | { success: true; redirectPath: string }
  | { success: false; error: string };

function withTimeout<T>(promise: PromiseLike<T>, ms = 12000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Authentication service timed out. Please try again.')), ms)
    ),
  ]);
}

export async function adminLoginAction(input: {
  email: string;
  password: string;
  redirectPath?: string | null;
}): Promise<AdminLoginResult> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    const email = input.email.trim();
    const password = input.password;

    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    const { data: authData, error: authError } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password })
    );

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Invalid email or password.',
      };
    }

    const { data: profile, error: profileError } = await withTimeout(
      supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle()
    );

    const role = profile?.role;

    if (
      profileError ||
      !role ||
      !ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])
    ) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Access denied. This account is not authorized for the staff portal.',
      };
    }

    const requestedPath = input.redirectPath;
    const redirectPath =
      requestedPath &&
      (requestedPath === '/admin' || requestedPath.startsWith('/admin/'))
        ? requestedPath
        : '/admin/dashboard';

    return { success: true, redirectPath };
  } catch (error) {
    console.error('[ADMIN_LOGIN_ERROR]', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Authentication failed. Please try again.',
    };
  }
}
