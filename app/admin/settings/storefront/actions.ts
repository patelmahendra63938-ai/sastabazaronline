'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  StorefrontVisibilitySettings,
  parseStorefrontVisibility,
} from '@/lib/settings/storefront-visibility';

export type StorefrontVisibilityActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
};

export async function saveStorefrontVisibility(
  _previousState: StorefrontVisibilityActionState,
  formData: FormData
): Promise<StorefrontVisibilityActionState> {
  const { user, role } = await getCurrentUser();

  if (!user || !role || !['admin', 'super_admin', 'staff'].includes(role)) {
    return {
      status: 'error',
      message: 'You are not authorized to update storefront visibility.',
    };
  }

  const nextValue: StorefrontVisibilitySettings = parseStorefrontVisibility({
    filter_panel_enabled: formData.get('filter_panel_enabled') === 'on',
    marketplace_section_enabled:
      formData.get('marketplace_section_enabled') === 'on',
    amazon_enabled: formData.get('amazon_enabled') === 'on',
    flipkart_enabled: formData.get('flipkart_enabled') === 'on',
    meesho_enabled: formData.get('meesho_enabled') === 'on',
  });

  const supabase = await createServerSupabaseClient();

  const { data: current, error: readError } = await supabase
    .from('store_settings')
    .select('value, version')
    .eq('key', 'storefront_visibility')
    .maybeSingle();

  if (readError) {
    return {
      status: 'error',
      message: `Unable to read storefront visibility: ${readError.message}`,
    };
  }

  const nextVersion = Number(current?.version || 0) + 1;

  const { error: upsertError } = await supabase
    .from('store_settings')
    .upsert(
      {
        key: 'storefront_visibility',
        value: nextValue,
        version: nextVersion,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: 'key' }
    );

  if (upsertError) {
    return {
      status: 'error',
      message: `Storefront visibility was not saved: ${upsertError.message}`,
    };
  }

  revalidatePath('/');
  revalidatePath('/admin/settings');
  revalidatePath('/admin/settings/storefront');

  return {
    status: 'success',
    message: 'Storefront visibility saved successfully.',
  };
}
