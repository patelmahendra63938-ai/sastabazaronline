'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { prepareBrandContentDrafts } from '@/lib/brand-content/draft-generator';
import { publishLinkedInPost } from '@/lib/brand-content/linkedin';

function finish(status: string): never {
  revalidatePath('/admin/brand-content');
  redirect(`/admin/brand-content?result=${status}`);
}

export async function generateBrandContent() {
  await requireAdminUser();
  try {
    const count = await prepareBrandContentDrafts();
    if (!count) finish('nothing-generated');
    finish('generated');
  } catch (error) {
    console.error('Brand content generation failed:', error);
    finish('generate-failed');
  }
}

export async function saveBrandPost(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get('id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !title || !body || body.length > 5000) finish('invalid');

  const { data, error } = await supabaseAdmin
    .from('brand_content_posts')
    .update({ title, body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error || !data) finish('save-failed');
  finish('saved');
}

export async function approveBrandPost(formData: FormData) {
  const { user } = await requireAdminUser();
  const id = String(formData.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id) || !user) finish('invalid');

  const { data: post } = await supabaseAdmin
    .from('brand_content_posts')
    .select('scheduled_at')
    .eq('id', id)
    .eq('status', 'pending')
    .maybeSingle();

  if (!post || new Date(post.scheduled_at).getTime() <= Date.now()) finish('expired');

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('brand_content_posts')
    .update({ status: 'approved', approved_by: user.id, approved_at: now, updated_at: now })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error || !data) finish('approve-failed');
  finish('approved');
}

export async function cancelBrandPost(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) finish('invalid');

  const { data, error } = await supabaseAdmin
    .from('brand_content_posts')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['pending', 'approved', 'failed'])
    .select('id')
    .maybeSingle();

  if (error || !data) finish('cancel-failed');
  finish('cancelled');
}

export async function postLinkedInNow(formData: FormData) {
  const { user } = await requireAdminUser();
  const id = String(formData.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id) || !user) finish('invalid');

  const { data: post } = await supabaseAdmin
    .from('brand_content_posts')
    .select('id,platform,body,status')
    .eq('id', id)
    .eq('platform', 'linkedin')
    .in('status', ['pending', 'approved', 'failed'])
    .maybeSingle();

  if (!post) finish('invalid');

  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from('brand_content_posts')
    .update({
      status: 'publishing',
      approved_by: user.id,
      approved_at: now,
      claimed_at: now,
      error_message: null,
      updated_at: now,
    })
    .eq('id', id)
    .in('status', ['pending', 'approved', 'failed'])
    .select('id')
    .maybeSingle();

  if (claimError || !claimed) finish('publish-failed');

  try {
    const remoteId = await publishLinkedInPost(post.body);
    const { error } = await supabaseAdmin
      .from('brand_content_posts')
      .update({
        status: 'published',
        remote_post_id: remoteId,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'publishing');

    if (error) finish('publish-uncertain');
    finish('published');
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : 'Unknown LinkedIn error';
    await supabaseAdmin
      .from('brand_content_posts')
      .update({ status: 'failed', error_message: message, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'publishing');
    finish('publish-failed');
  }
}

export async function markContraPublished(formData: FormData) {
  await requireAdminUser();
  const id = String(formData.get('id') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) finish('invalid');

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('brand_content_posts')
    .update({ status: 'published', published_at: now, updated_at: now })
    .eq('id', id)
    .eq('platform', 'contra')
    .in('status', ['pending', 'approved'])
    .select('id')
    .maybeSingle();

  if (error || !data) finish('mark-failed');
  finish('marked');
}
