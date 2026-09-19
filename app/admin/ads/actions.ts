'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminUser } from '@/lib/auth';
import { registerMerchantDeveloper, uploadGoogleAdsImageAsset } from '@/lib/google/integrations';
import { renderSafeFitGoogleImage } from '@/lib/google/creative-images';

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


type GoogleCreativeProduct = {
  id: string;
  title: string;
  price: number | string;
  stock: number | null;
  images: string[] | null;
};

const GOOGLE_CREATIVE_COLOURS = [
  { label: 'Wine Purple', match: ['wine purple'] },
  { label: 'Black', match: ['black'] },
  { label: 'Yellow', match: ['yellow'] },
  { label: 'Green', match: ['green'] },
] as const;

function pickCreativeProducts(products: GoogleCreativeProduct[]) {
  const used = new Set<string>();
  const selected: Array<GoogleCreativeProduct & { colour: string }> = [];

  for (const colour of GOOGLE_CREATIVE_COLOURS) {
    const product = products.find((item) => {
      if (used.has(item.id) || !item.images?.[0]) return false;
      const title = item.title.toLowerCase();
      return colour.match.some((term) => title.includes(term));
    });
    if (product) {
      used.add(product.id);
      selected.push({ ...product, colour: colour.label });
    }
  }

  if (selected.length < 4) {
    for (const product of products) {
      if (selected.length >= 4) break;
      if (used.has(product.id) || !product.images?.[0]) continue;
      used.add(product.id);
      selected.push({ ...product, colour: 'Additional' });
    }
  }

  return selected.slice(0, 4);
}

export async function prepareGoogleAdsCreativeAssetsAction(formData: FormData) {
  const currentUser = await requireAdminUser();
  const proposalId = String(formData.get('proposalId') ?? '').trim();
  if (!proposalId) redirect('/admin/ads?google=proposal-missing');

  const { createServerSupabaseClient } = await import('@/lib/supabase/server');
  const supabase = await createServerSupabaseClient();

  const { data: proposal, error: proposalError } = await supabase
    .from('google_ads_proposals')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (proposalError || !proposal) {
    console.error('Google Ads creative proposal read failed:', proposalError);
    redirect('/admin/ads?google=creative-proposal-read-failed');
  }

  if (proposal.status !== 'approved') {
    redirect('/admin/ads?google=creative-approval-required');
  }

  const previousSettings = (proposal.settings ?? {}) as Record<string, unknown>;
  const existingAssets = Array.isArray(previousSettings.creative_assets)
    ? previousSettings.creative_assets
    : [];
  if (existingAssets.length >= 4 && previousSettings.creative_assets_prepared_at) {
    redirect('/admin/ads?google=creative-already-prepared');
  }

  const { data: productRows, error: productError } = await supabase
    .from('products')
    .select('id,title,price,stock,images')
    .eq('is_active', true)
    .eq('status', 'ACTIVE')
    .gt('price', 500)
    .ilike('title', '%Dhoti Choli%')
    .order('stock', { ascending: false })
    .limit(30);

  if (productError) {
    console.error('Google Ads creative product lookup failed:', productError);
    redirect('/admin/ads?google=creative-products-failed');
  }

  const selected = pickCreativeProducts((productRows ?? []) as GoogleCreativeProduct[]);
  if (selected.length < 4) {
    redirect('/admin/ads?google=creative-products-insufficient');
  }

  try {
    const preparedAssets = [];

    for (const product of selected) {
      const sourceUrl = product.images![0];
      const squareBytes = await renderSafeFitGoogleImage(sourceUrl, 1200, 1200);
      const landscapeBytes = await renderSafeFitGoogleImage(sourceUrl, 1200, 628);

      const [squareResourceName, landscapeResourceName] = await Promise.all([
        uploadGoogleAdsImageAsset({
          name: `Dhoti Choli - ${product.colour} - Square`,
          pngBytes: squareBytes,
          width: 1200,
          height: 1200,
        }),
        uploadGoogleAdsImageAsset({
          name: `Dhoti Choli - ${product.colour} - Landscape`,
          pngBytes: landscapeBytes,
          width: 1200,
          height: 628,
        }),
      ]);

      preparedAssets.push({
        product_id: product.id,
        title: product.title,
        colour: product.colour,
        source_url: sourceUrl,
        square: {
          width: 1200,
          height: 1200,
          resource_name: squareResourceName,
        },
        landscape: {
          width: 1200,
          height: 628,
          resource_name: landscapeResourceName,
        },
      });
    }

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
      creative_colours: preparedAssets.map((asset) => asset.colour),
      creative_assets: preparedAssets,
      creative_assets_prepared_at: now,
      creative_asset_policy: {
        square: '1200x1200',
        landscape: '1200x628',
        resize: 'safe-fit',
        crop: 'never cut the model or garment; preserve full outfit with white canvas padding',
        live_campaign_change: false,
      },
      creative_copy: creativeCopy,
      launch_state: 'creative_ready_waiting_final_launch',
    };

    const { error: updateError } = await supabase
      .from('google_ads_proposals')
      .update({
        settings: updatedSettings,
        updated_at: now,
      })
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
        colours: preparedAssets.map((asset) => asset.colour),
        image_asset_count: preparedAssets.length * 2,
      },
      metadata: {
        live_mutation_executed: true,
        mutation_scope: 'Google Ads asset library only',
        campaign_launched: false,
        old_campaigns_paused: false,
        safe_fit: true,
      },
    });

    revalidatePath('/admin/ads');
  } catch (error) {
    console.error('Google Ads creative preparation failed:', error);
    await supabase.from('google_ads_audit_logs').insert({
      proposal_id: proposalId,
      actor_id: currentUser.user!.id,
      action: 'creative_assets_upload_failed',
      metadata: {
        live_mutation_executed: false,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    redirect('/admin/ads?google=creative-upload-failed');
  }

  redirect('/admin/ads?google=creative-prepared');
}
