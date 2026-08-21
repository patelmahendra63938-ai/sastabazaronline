'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseHomepageDisplay } from '@/lib/settings/homepage-display';

export type SaveHomepageDisplayResult = { success: true } | { success: false; error: string };

export async function saveHomepageDisplaySettings(
  value: unknown,
): Promise<SaveHomepageDisplayResult> {
  const { user, role } = await getCurrentUser();

  if (!user || !role || !['admin', 'super_admin', 'staff'].includes(role)) {
    return { success: false, error: 'You are not authorized to update homepage settings.' };
  }

  const settings = parseHomepageDisplay(value);
  const supabase = await createServerSupabaseClient();
  const { data: current, error: readError } = await supabase
    .from('store_settings')
    .select('version')
    .eq('key', 'homepage_display')
    .maybeSingle();

  if (readError) return { success: false, error: readError.message };

  const { error } = await supabase.from('store_settings').upsert({
    key: 'homepage_display',
    value: settings,
    version: Number(current?.version || 0) + 1,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }, { onConflict: 'key' });

  if (error) return { success: false, error: error.message };

  revalidatePath('/');
  revalidatePath('/admin/settings/homepage-display');
  return { success: true };
}
