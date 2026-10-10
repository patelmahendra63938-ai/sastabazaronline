import 'server-only';
import { ADMIN_ROLES, getCurrentUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
export async function whatsappAdmin() {
  const current = await getCurrentUser();
  if (!current.user || !current.role || !ADMIN_ROLES.includes(current.role)) return null;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  return !error && data?.currentLevel === 'aal2' ? current.user : null;
}
