'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type ReviewActionResult = { success: boolean; error?: string; message?: string };

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function submitVerifiedReviewAction(input: {
  productId: string;
  orderNumber: string;
  email: string;
  rating: number;
  reviewText: string;
}): Promise<ReviewActionResult> {
  const productId = String(input.productId || '').trim();
  const orderNumber = String(input.orderNumber || '').trim();
  const email = normalizeEmail(String(input.email || ''));
  const rating = Number(input.rating);
  const reviewText = String(input.reviewText || '').trim();

  if (!productId || !orderNumber) return { success: false, error: 'Product and order number are required.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: 'Enter the email used for this order.' };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { success: false, error: 'Choose a rating from 1 to 5 stars.' };
  if (reviewText.length < 10 || reviewText.length > 1000) return { success: false, error: 'Review must be between 10 and 1000 characters.' };

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id,order_number,customer_id,customer_name,customer_email,status')
    .eq('order_number', orderNumber)
    .ilike('customer_email', email)
    .maybeSingle();

  if (orderError || !order) return { success: false, error: 'We could not verify this order with that email.' };
  if (String(order.status || '').toUpperCase() !== 'DELIVERED') return { success: false, error: 'Reviews are available after the order is delivered.' };

  const { data: item, error: itemError } = await supabaseAdmin
    .from('order_items')
    .select('id')
    .eq('order_id', order.id)
    .eq('product_id', productId)
    .limit(1)
    .maybeSingle();

  if (itemError || !item) return { success: false, error: 'This product was not found in the verified order.' };

  const { error: insertError } = await supabaseAdmin.from('reviews').insert({
    product_id: productId,
    order_number: order.order_number,
    customer_id: order.customer_id ?? null,
    customer_name: order.customer_name || 'Verified Customer',
    rating,
    review_text: reviewText,
    status: 'pending',
    verified_purchase: true,
  });

  if (insertError) {
    if (insertError.code === '23505') return { success: false, error: 'A review for this product and order has already been submitted.' };
    console.error('[REVIEW_SUBMIT_ERROR]', insertError);
    return { success: false, error: 'Review could not be submitted right now.' };
  }

  revalidatePath(`/product/${productId}`);
  revalidatePath('/admin/reviews');
  return { success: true, message: 'Thank you. Your verified review was submitted for approval.' };
}

export async function moderateReviewAction(input: { reviewId: string; status: 'approved' | 'rejected' }): Promise<ReviewActionResult> {
  await requireAdminUser();
  const reviewId = String(input.reviewId || '').trim();
  if (!reviewId || !['approved', 'rejected'].includes(input.status)) return { success: false, error: 'Invalid review update.' };

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .update({ status: input.status, updated_at: new Date().toISOString() })
    .eq('id', reviewId)
    .select('product_id')
    .maybeSingle();

  if (error || !data) return { success: false, error: 'Review status could not be updated.' };
  revalidatePath('/admin/reviews');
  revalidatePath(`/product/${data.product_id}`);
  return { success: true };
}

export async function deleteReviewAction(reviewId: string): Promise<ReviewActionResult> {
  await requireAdminUser();
  const id = String(reviewId || '').trim();
  const { data, error } = await supabaseAdmin.from('reviews').delete().eq('id', id).select('product_id').maybeSingle();
  if (error || !data) return { success: false, error: 'Review could not be deleted.' };
  revalidatePath('/admin/reviews');
  revalidatePath(`/product/${data.product_id}`);
  return { success: true };
}
