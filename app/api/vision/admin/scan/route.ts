import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminApiSession } from '@/lib/api/admin-authorization';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Inventory scan service is not configured.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: Request) {
  const admin = await requireAdminApiSession();
  if (!admin.authorized) return admin.response;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'A JSON request body is required.' },
        { status: 400 }
      );
    }

    const { barcode, qr_data, sku } = body as Record<string, unknown>;
    const rawIdentifier = barcode || qr_data || sku;
    const identifier =
      typeof rawIdentifier === 'string' ? rawIdentifier.trim() : '';

    if (!identifier || identifier.length > 128) {
      return NextResponse.json(
        { success: false, error: 'A valid barcode, QR value, or SKU is required.' },
        { status: 400 }
      );
    }

    // Service-role access is retained only after the authoritative admin check,
    // preserving the current inventory workflow independently of browser RLS.
    const supabase = getSupabaseClient();
    const { data: invItem, error: invError } = await supabase
      .from('inventory')
      .select('*, products(*)')
      .eq('sku', identifier)
      .maybeSingle();

    if (invError) {
      console.error('Admin inventory scan query failed.', { code: invError.code });
      return NextResponse.json(
        { success: false, error: 'Inventory lookup failed.' },
        { status: 500 }
      );
    }

    if (!invItem) {
      return NextResponse.json(
        { success: false, error: 'No product matched with the scanned code.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: invItem });
  } catch (error: unknown) {
    console.error('Admin inventory scan failed.', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during barcode lookup.' },
      { status: 500 }
    );
  }
}
