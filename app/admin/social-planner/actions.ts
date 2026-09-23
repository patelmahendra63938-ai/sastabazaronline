'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { productCaption } from '@/lib/meta/post-planner';
import { prepareProductPostDrafts } from '@/lib/meta/draft-generator';
import { checkMetaConnection } from '@/lib/meta/publish';

function finish(status: string): never {
  revalidatePath('/admin/social-planner');
  redirect(`/admin/social-planner?result=${status}`);
}

export async function generateProductPosts() {
  await requireAdminUser();
  let count = 0;
  try {
    count = await prepareProductPostDrafts();
  } catch (error) {
    console.error('Social draft generation failed:', error);
    finish('generate-error');
  }
  if (!count) finish('no-products');
  finish('generated');
}

export async function testMetaConnection(_previous: string) {
  await requireAdminUser();
  if (!process.env.CRON_SECRET) return 'cron-missing';
  try {
    await checkMetaConnection();
    return 'meta-connected';
  } catch {
    return 'meta-connection-failed';
  }
}

export async function savePostCaption(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get('id') ?? '');
  const caption = String(formData.get('caption') ?? '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !caption || caption.length > 2200) finish('invalid-caption');
  const { data, error } = await supabaseAdmin.from('meta_product_posts')
    .update({ caption, updated_at: new Date().toISOString() })
    .eq('id', id).eq('status', 'pending').select('id').maybeSingle();
  if (error || !data) finish('save-failed');
  finish('saved');
}

export async function approvePost(formData: FormData) {
  const { user } = await requireAdminUser();
  const id = String(formData.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id) || !user) finish('invalid-id');
  const { data: post } = await supabaseAdmin.from('meta_product_posts')
    .select('scheduled_at,product_id,price_snapshot,image_url')
    .eq('id', id).eq('status', 'pending').maybeSingle();
  if (!post || new Date(post.scheduled_at).getTime() <= Date.now()) finish('expired');
  const { data: product } = await supabaseAdmin.from('products')
    .select('is_active,stock,price,images').eq('id', post.product_id).maybeSingle();
  if (!product?.is_active || Number(product.stock) <= 0 ||
      Number(product.price) !== Number(post.price_snapshot) ||
      product.images?.[0] !== post.image_url) finish('product-changed');
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin.from('meta_product_posts')
    .update({ status: 'approved', approved_by: user.id, approved_at: now, updated_at: now })
    .eq('id', id).eq('status', 'pending').select('id').maybeSingle();
  if (error || !data) finish('approve-failed');
  finish('approved');
}

export async function cancelPost(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) finish('invalid-id');
  const { data, error } = await supabaseAdmin.from('meta_product_posts')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id).in('status', ['pending', 'approved']).select('id').maybeSingle();
  if (error || !data) finish('cancel-failed');
  finish('cancelled');
}

export async function replacePost(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) finish('invalid-id');
  const { data: old } = await supabaseAdmin.from('meta_product_posts')
    .select('product_id,scheduled_at,status').eq('id', id).maybeSingle();
  if (!old || !['cancelled', 'failed'].includes(old.status) ||
      new Date(old.scheduled_at).getTime() <= Date.now() + 15 * 60_000) finish('expired');
  const { data: products } = await supabaseAdmin.from('products')
    .select('id,title,price,images,stock').eq('is_active', true).gt('stock', 0)
    .order('created_at', { ascending: false }).limit(100);
  const eligible = products?.filter((p) => typeof p.images?.[0] === 'string' && Number.isFinite(Number(p.price))) || [];
  const product = eligible.find((p) => p.id !== old.product_id) || eligible[0];
  if (!product) finish('no-products');
  const { data, error } = await supabaseAdmin.from('meta_product_posts').update({
    product_id: product.id,
    product_title: product.title,
    price_snapshot: Number(product.price),
    image_url: product.images[0],
    caption: productCaption(product.title, Number(product.price), product.id),
    status: 'pending', approved_by: null, approved_at: null, claimed_at: null,
    error_message: null, updated_at: new Date().toISOString(),
  }).eq('id', id).in('status', ['cancelled', 'failed']).select('id').maybeSingle();
  if (error || !data) finish('replace-failed');
  finish('replaced');
}
