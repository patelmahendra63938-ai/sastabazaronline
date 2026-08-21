import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  getStorefrontVisibilitySetting,
  parseStorefrontVisibility,
} from '@/lib/settings/storefront-visibility';

export const dynamic = 'force-dynamic';

export async function GET() {
  const setting = await getStorefrontVisibilitySetting();

  return NextResponse.json(setting.value, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function POST(request: NextRequest) {
  const { user, role } = await getCurrentUser();

  if (!user || !role || !['admin', 'super_admin', 'staff'].includes(role)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized.' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const value = parseStorefrontVisibility(body);
  const supabase = await createServerSupabaseClient();

  const { data: current, error: readError } = await supabase
    .from('store_settings')
    .select('version')
    .eq('key', 'storefront_visibility')
    .maybeSingle();

  if (readError) {
    return NextResponse.json(
      { success: false, error: readError.message },
      { status: 500 }
    );
  }

  const { error: writeError } = await supabase
    .from('store_settings')
    .upsert(
      {
        key: 'storefront_visibility',
        value,
        version: Number(current?.version || 0) + 1,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: 'key' }
    );

  if (writeError) {
    return NextResponse.json(
      { success: false, error: writeError.message },
      { status: 500 }
    );
  }

  revalidatePath('/');
  revalidatePath('/admin/settings/filters');

  return NextResponse.json({ success: true, value });
}
