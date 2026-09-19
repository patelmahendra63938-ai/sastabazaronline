'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminUser } from '@/lib/auth';
import { registerMerchantDeveloper, uploadGoogleAdsImageAsset } from '@/lib/google/integrations';

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


export async function updateGoogleAdsProposalBudgetAction(formData: FormData) {
  const currentUser = await requireAdminUser();
  const proposalId = String(formData.get('proposalId') ?? '').trim();
  const dailyBudget = Number(formData.get('dailyBudget'));
  const testDays = Number(formData.get('testDays'));
  const landingUrl = String(formData.get('landingUrl') ?? '').trim();

  if (!proposalId) redirect('/admin/ads?google=proposal-missing');
  if (!Number.isInteger(dailyBudget) || dailyBudget < 1) {
    redirect('/admin/ads?google=invalid-daily-budget');
  }
  if (!Number.isInteger(testDays) || testDays < 1 || testDays > 365) {
    redirect('/admin/ads?google=invalid-test-days');
  }

  let parsedLandingUrl: URL;
  try {
    parsedLandingUrl = new URL(landingUrl);
  } catch {
    redirect('/admin/ads?google=invalid-landing-url');
  }

  if (
    parsedLandingUrl.protocol !== 'https:' ||
    !['adhyeybrothers.in', 'www.adhyeybrothers.in'].includes(parsedLandingUrl.hostname)
  ) {
    redirect('/admin/ads?google=invalid-landing-url');
  }

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

  const previousSettings = proposal.settings ?? {};
  const updatedSettings = {
    ...previousSettings,
    daily_budget_inr: dailyBudget,
    test_days: testDays,
    planned_max_spend_inr: dailyBudget * testDays,
    first_7_day_max_spend_inr: dailyBudget * Math.min(testDays, 7),
    landing_url: parsedLandingUrl.toString(),
  };

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('google_ads_proposals')
    .update({
      settings: updatedSettings,
      status: 'draft',
      approved_by: null,
      approved_at: null,
      rejected_by: null,
      rejected_at: null,
      updated_at: now,
    })
    .eq('id', proposalId);

  if (updateError) {
    console.error('Google Ads proposal budget update failed:', updateError);
    redirect('/admin/ads?google=proposal-budget-update-failed');
  }

  await supabase.from('google_ads_audit_logs').insert({
    proposal_id: proposalId,
    actor_id: currentUser.user!.id,
    action: 'proposal_budget_days_updated',
    before_state: {
      daily_budget_inr: previousSettings.daily_budget_inr,
      test_days: previousSettings.test_days ?? 7,
      landing_url: previousSettings.landing_url ?? 'https://adhyeybrothers.in/collections/dhoti-choli',
      status: proposal.status,
    },
    after_state: {
      daily_budget_inr: dailyBudget,
      test_days: testDays,
      planned_max_spend_inr: dailyBudget * testDays,
      landing_url: parsedLandingUrl.toString(),
      status: 'draft',
    },
    metadata: {
      live_mutation_executed: false,
      approval_required_again: true,
    },
  });

  revalidatePath('/admin/ads');
  redirect('/admin/ads?google=proposal-updated');
}



function assertGoogleAssetResourceName(resourceName: string) {
  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').replace(/\D/g, '');
  const prefix = 'customers/' + customerId + '/assets/';
  if (!customerId || !resourceName.startsWith(prefix)) {
    throw new Error('Unexpected Google Ads asset resource name.');
  }
  return resourceName;
}

export async function uploadGoogleAdsCreativeImageAction(formData: FormData) {
  await requireAdminUser();

  const proposalId = String(formData.get('proposalId') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const width = Number(formData.get('width'));
  const height = Number(formData.get('height'));
  const image = formData.get('image');

  if (!proposalId || !name || !(image instanceof File)) {
    throw new Error('Creative upload payload is incomplete.');
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 600 || height < 600) {
    throw new Error('Creative dimensions are invalid.');
  }
  if (!['image/jpeg', 'image/png'].includes(image.type)) {
    throw new Error('Creative image must be JPEG or PNG.');
  }
  if (image.size < 10_000 || image.size > 5_000_000) {
    throw new Error('Creative image size is outside the allowed range.');
  }

  const { createServerSupabaseClient } = await import('@/lib/supabase/server');
  const supabase = await createServerSupabaseClient();
  const { data: proposal, error } = await supabase
    .from('google_ads_proposals')
    .select('id,status,settings')
    .eq('id', proposalId)
    .single();

  if (error || !proposal || proposal.status !== 'approved') {
    throw new Error('Approved Google Ads proposal is required.');
  }

  const imageBytes = Buffer.from(await image.arrayBuffer());
  const resourceName = await uploadGoogleAdsImageAsset({
    name,
    imageBytes,
    width,
    height,
    mimeType: image.type === 'image/png' ? 'IMAGE_PNG' : 'IMAGE_JPEG',
  });

  return { resourceName: assertGoogleAssetResourceName(resourceName) };
}

export async function finalizeGoogleAdsCreativeAssetsAction(formData: FormData) {
  const currentUser = await requireAdminUser();
  const proposalId = String(formData.get('proposalId') ?? '').trim();
  const rawAssets = String(formData.get('assets') ?? '');

  if (!proposalId || !rawAssets) {
    throw new Error('Creative finalization payload is incomplete.');
  }

  const parsed = JSON.parse(rawAssets) as Array<{
    product_id: string;
    title: string;
    colour: string;
    source_url: string;
    square: { width: number; height: number; resource_name: string };
    landscape: { width: number; height: number; resource_name: string };
  }>;

  if (!Array.isArray(parsed) || parsed.length !== 4) {
    throw new Error('Exactly four product creatives are required.');
  }

  const allowedColours = ['Wine Purple', 'Black', 'Yellow', 'Green'];
  const seenColours = new Set<string>();
  for (const asset of parsed) {
    if (!allowedColours.includes(asset.colour) || seenColours.has(asset.colour)) {
      throw new Error('Creative colours are invalid.');
    }
    seenColours.add(asset.colour);
    assertGoogleAssetResourceName(asset.square.resource_name);
    assertGoogleAssetResourceName(asset.landscape.resource_name);
    if (asset.square.width !== 1200 || asset.square.height !== 1200) {
      throw new Error('Square creative dimensions are invalid.');
    }
    if (asset.landscape.width !== 1200 || asset.landscape.height !== 628) {
      throw new Error('Landscape creative dimensions are invalid.');
    }
  }

  const { createServerSupabaseClient } = await import('@/lib/supabase/server');
  const supabase = await createServerSupabaseClient();
  const { data: proposal, error: proposalError } = await supabase
    .from('google_ads_proposals')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (proposalError || !proposal || proposal.status !== 'approved') {
    throw new Error('Approved Google Ads proposal is required.');
  }

  const previousSettings = (proposal.settings ?? {}) as Record<string, unknown>;
  const now = new Date().toISOString();
  const creativeCopy = {
    headlines: [
      'Shop Dhoti Choli Online',
      'Festive Dhoti Choli Sets',
      'Dhoti Choli for Garba',
      'Haldi & Wedding Styles',
      'Wine Black Yellow Green',
    ],
    long_headline: 'Shop colourful Dhoti Choli sets for Garba, Haldi, weddings and festive celebrations',
    descriptions: [
      'Shop Dhoti Choli sets in Wine Purple, Black, Yellow and Green for festive occasions.',
      'Explore ready-to-wear Dhoti Choli styles for Garba, Haldi, weddings and celebrations.',
    ],
  };

  const updatedSettings = {
    ...previousSettings,
    creative_colours: parsed.map((asset) => asset.colour),
    creative_assets: parsed,
    creative_assets_prepared_at: now,
    creative_asset_policy: {
      square: '1200x1200',
      landscape: '1200x628',
      resize: 'browser-safe-fit',
      crop: 'no crop; contain full source image with white canvas padding',
      live_campaign_change: false,
    },
    creative_copy: creativeCopy,
    launch_state: 'creative_ready_waiting_final_launch',
  };

  const { error: updateError } = await supabase
    .from('google_ads_proposals')
    .update({ settings: updatedSettings, updated_at: now })
    .eq('id', proposalId);
  if (updateError) throw updateError;

  await supabase.from('google_ads_audit_logs').insert({
    proposal_id: proposalId,
    actor_id: currentUser.user!.id,
    action: 'creative_assets_uploaded',
    before_state: {
      creative_assets_prepared_at: previousSettings.creative_assets_prepared_at ?? null,
    },
    after_state: {
      creative_assets_prepared_at: now,
      colours: parsed.map((asset) => asset.colour),
      image_asset_count: 8,
    },
    metadata: {
      live_mutation_executed: true,
      mutation_scope: 'Google Ads asset library only',
      campaign_launched: false,
      old_campaigns_paused: false,
      safe_fit: true,
      renderer: 'browser_canvas_webp',
    },
  });

  revalidatePath('/admin/ads');
  return { ok: true as const };
}
