import { createServerSupabaseClient } from '@/lib/supabase/server';
import { canAccessAdmin, type UserRole } from '@/lib/auth-roles';

export { ADMIN_ROLES, canAccessAdmin, type UserRole } from '@/lib/auth-roles';

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

export async function getAdminSession() {
  const session = await getCurrentUser();

  return {
    ...session,
    authorized: Boolean(session.user && canAccessAdmin(session.role)),
  };
}
