import React from 'react';
import { createClient } from '@supabase/supabase-js';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getCurrentUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import OrdersLookupClient from './OrdersLookupClient';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const { user } = await getCurrentUser();
  let initialOrders: any[] | null = null;
  let verifiedEmail: string | null = null;

  if (user) {
    verifiedEmail = user.email || null;

    // Orders created before the customer session was correctly persisted may
    // have customer_id = NULL. Once the customer signs in with the verified
    // email used at checkout, safely attach those historical guest orders to
    // that account so My Orders works without asking for email/phone again.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (verifiedEmail && serviceRoleKey && supabaseUrl) {
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { error: claimError } = await admin
        .from('orders')
        .update({ customer_id: user.id })
        .is('customer_id', null)
        .ilike('customer_email', verifiedEmail);

      if (claimError) {
        console.warn('[ORDER_ACCOUNT_CLAIM_WARNING]', claimError.message);
      }
    }

    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        order_status,
        payment_method,
        payment_status,
        subtotal,
        shipping_charge,
        cod_charge,
        discount_amount,
        grand_total,
        item_count,
        courier_partner,
        tracking_number,
        created_at,
        order_items (
          id,
          product_id,
          product_title,
          quantity,
          unit_price,
          mrp,
          line_total
        )
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    initialOrders = data || [];
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
      <Header />
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        <OrdersLookupClient
          isLoggedIn={!!user}
          initialEmail={verifiedEmail}
          initialOrders={initialOrders}
        />
      </div>
      <Footer />
    </main>
  );
}
