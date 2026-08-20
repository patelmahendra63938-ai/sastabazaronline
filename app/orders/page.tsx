import React from 'react';
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

  // Server-side pre-fetch for logged in customers (Case 1)
  if (user) {
    verifiedEmail = user.email || null;
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
