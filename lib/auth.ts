import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type UserRole = 'customer' | 'staff' | 'admin' | 'super_admin';

export const ADMIN_ROLES: readonly UserRole[] = ['admin', 'super_admin', 'staff'];

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

/**
 * Server-side function to get the current authenticated user and their profile
 */
export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { user: null, profile: null, role: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    user,
    profile: profile as UserProfile | null,
    role: (profile?.role || 'customer') as UserRole
  };
}

/**
 * Authoritative server-side authorization boundary for the admin render tree.
 * Redirects before protected layout content is rendered.
 */
export async function requireAdminUser() {
  const currentUser = await getCurrentUser();

  if (!currentUser.user) {
    redirect('/login');
  }

  if (!currentUser.role || !ADMIN_ROLES.includes(currentUser.role)) {
    redirect('/?error=unauthorized');
  }

  return currentUser;
}
