import { NextResponse } from 'next/server';
import { getStorefrontVisibilitySetting } from '@/lib/settings/storefront-visibility';

export const dynamic = 'force-dynamic';

export async function GET() {
  const setting = await getStorefrontVisibilitySetting();

  return NextResponse.json(setting.value, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
