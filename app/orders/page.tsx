import React from 'react';
import { createClient } from '@supabase/supabase-js';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getCurrentUser } from '@/lib/auth';
import OrdersLookupClient from './OrdersLookupClient';

export const dynamic = 'force-dynamic';

const ORDER_SELECT = `
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
`;

export default async function OrdersPage() {
  const { user } = await getCurrentUser();
  let initialOrders: any[] | null = null;
  let verifiedEmail: string | null = null;

  if (user) {
    verifiedEmail = user.email?.trim().toLowerCase() || null;

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (serviceRoleKey && supabaseUrl) {
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      // Attach historical guest orders that were created before customer_id
      // was reliably persisted. We only claim unowned orders whose checkout
      // email exactly matches the authenticated, verified account email.
      if (verifiedEmail) {
        const { error: claimError } = await admin
          .from('orders')
          .update({ customer_id: user.id })
          .is('customer_id', null)
          .ilike('customer_email', verifiedEmail);

        if (claimError) {
          console.warn('[ORDER_ACCOUNT_CLAIM_WARNING]', claimError.message);
        }
      }

      // Show both current account orders and historical orders made with the
      // same verified email. This covers older data where a previous/stale
      // customer_id may still be present, without exposing another email's
      // orders.
      let query = admin
        .from('orders')
        .select(ORDER_SELECT)
        .order('created_at', { ascending: false });

      if (verifiedEmail) {
        query = query.or(`customer_id.eq.${user.id},customer_email.ilike.${verifiedEmail}`);
      } else {
        query = query.eq('customer_id', user.id);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[MY_ORDERS_LOAD_ERROR]', error.message);
        initialOrders = [];
      } else {
        initialOrders = data || [];
      }
    } else {
      initialOrders = [];
    }
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
