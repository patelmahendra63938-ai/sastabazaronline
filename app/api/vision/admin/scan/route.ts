import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment configuration is missing on server.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { barcode, qr_data, sku } = body;

    const identifier = barcode || qr_data || sku;

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'Barcode, QR data, or SKU is required for scan lookup.' },
        { status: 400 }
      );
    }

    // Lookup product by SKU or variant
    const { data: invItem, error: invError } = await supabase
      .from('inventory')
      .select('*, products(*)')
      .eq('sku', identifier)
      .maybeSingle();

    if (invError) {
      return NextResponse.json({ success: false, error: invError.message }, { status: 500 });
    }

    if (!invItem) {
      return NextResponse.json(
        { success: false, error: 'No product matched with the scanned code.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: invItem
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error during barcode lookup.' },
      { status: 500 }
    );
  }
}