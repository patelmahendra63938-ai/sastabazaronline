'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminUser } from '@/lib/auth';
import { registerMerchantDeveloper } from '@/lib/google/integrations';

export async function registerMerchantDeveloperAction(formData: FormData) {
  await requireAdminUser();

  const developerEmail = String(formData.get('developerEmail') ?? '').trim();
  let status = 'registered';

  try {
    await registerMerchantDeveloper(developerEmail);
    revalidatePath('/admin/ads');
  } catch (error) {
    console.error('Merchant developer registration failed:', error);
    status = 'merchant-registration-failed';
  }

  redirect('/admin/ads?google=' + status);
}


export async function approveGoogleAdsProposalAction(formData: FormData) {
  const currentUser = await requireAdminUser();
  const proposalId = String(formData.get('proposalId') ?? '').trim();
  if (!proposalId) redirect('/admin/ads?google=proposal-missing');

  const { createServerSupabaseClient } = await import('@/lib/supabase/server');
  const supabase = await createServerSupabaseClient();

  const { data: proposal, error: readError } = await supabase
    .from('google_ads_proposals')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (readError || !proposal) {
    console.error('Google Ads proposal read failed:', readError);
    redirect('/admin/ads?google=proposal-read-failed');
  }

  const beforeState = {
    status: proposal.status,
    approved_by: proposal.approved_by,
    approved_at: proposal.approved_at,
    rejected_by: proposal.rejected_by,
    rejected_at: proposal.rejected_at,
  };

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('google_ads_proposals')
    .update({
      status: 'approved',
      approved_by: currentUser.user!.id,
      approved_at: now,
      rejected_by: null,
      rejected_at: null,
      updated_at: now,
    })
    .eq('id', proposalId);

  if (updateError) {
    console.error('Google Ads proposal approval failed:', updateError);
    redirect('/admin/ads?google=proposal-approve-failed');
  }

  await supabase.from('google_ads_audit_logs').insert({
    proposal_id: proposalId,
    actor_id: currentUser.user!.id,
    action: 'proposal_approved',
    before_state: beforeState,
    after_state: { status: 'approved', approved_at: now },
    metadata: {
      mode: 'approval_only',
      live_mutation_executed: false,
      note: 'Approval recorded. No Google Ads write was executed by this action.',
    },
  });

  revalidatePath('/admin/ads');
  redirect('/admin/ads?google=proposal-approved');
}

export async function rejectGoogleAdsProposalAction(formData: FormData) {
  const currentUser = await requireAdminUser();
  const proposalId = String(formData.get('proposalId') ?? '').trim();
  if (!proposalId) redirect('/admin/ads?google=proposal-missing');

  const { createServerSupabaseClient } = await import('@/lib/supabase/server');
  const supabase = await createServerSupabaseClient();

  const { data: proposal, error: readError } = await supabase
    .from('google_ads_proposals')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (readError || !proposal) {
    console.error('Google Ads proposal read failed:', readError);
    redirect('/admin/ads?google=proposal-read-failed');
  }

  const beforeState = {
    status: proposal.status,
    approved_by: proposal.approved_by,
    approved_at: proposal.approved_at,
    rejected_by: proposal.rejected_by,
    rejected_at: proposal.rejected_at,
  };

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('google_ads_proposals')
    .update({
      status: 'rejected',
      rejected_by: currentUser.user!.id,
      rejected_at: now,
      updated_at: now,
    })
    .eq('id', proposalId);

  if (updateError) {
    console.error('Google Ads proposal rejection failed:', updateError);
    redirect('/admin/ads?google=proposal-reject-failed');
  }

  await supabase.from('google_ads_audit_logs').insert({
    proposal_id: proposalId,
    actor_id: currentUser.user!.id,
    action: 'proposal_rejected',
    before_state: beforeState,
    after_state: { status: 'rejected', rejected_at: now },
    metadata: {
      mode: 'approval_only',
      live_mutation_executed: false,
    },
  });

  revalidatePath('/admin/ads');
  redirect('/admin/ads?google=proposal-rejected');
}
