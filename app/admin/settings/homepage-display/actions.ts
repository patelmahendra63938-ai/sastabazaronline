'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseHomepageDisplay } from '@/lib/settings/homepage-display';

export type SaveHomepageDisplayResult = { success: true } | { success: false; error: string };

export async function saveHomepageDisplaySettings(
  value: unknown,
  filters: Array<{ id: string; is_enabled: boolean }> = [],
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

  for (const filter of filters) {
    if (!filter?.id || typeof filter.is_enabled !== 'boolean') {
      return { success: false, error: 'Invalid storefront filter setting.' };
    }

    const { error: filterError } = await supabase
      .from('storefront_filter_settings')
      .update({ is_enabled: filter.is_enabled, updated_at: new Date().toISOString() })
      .eq('id', filter.id);

    if (filterError) return { success: false, error: filterError.message };
  }

  revalidatePath('/');
  revalidatePath('/admin/settings/homepage-display');
  return { success: true };
}
