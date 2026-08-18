export interface Campaign {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  campaign_mode: 'AUTOMATIC' | 'COUPON' | 'BOTH';
  coupon_code: string | null;
  target_category?: string | null;
  target_product_id?: string | null;
  start_at: string;
  end_at: string;
  is_enabled: boolean;
  is_homepage_visible: boolean;
  theme: string;
  banner_url: string | null;
  mobile_banner_url: string | null;
  priority: number;
  allow_stacking?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
}

export interface OfferOption {
  campaignId: string;
  offerName: string;
  offerLabel: string; // e.g. "Festival Discount — 10% OFF"
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  discountAmount: number;
  finalPrice: number;
  couponCode?: string | null;
}

// Backward-compatible type alias so components importing either name compile cleanly
export type AppliedOffer = OfferOption;

/**
 * Validates active campaigns against timestamps and enabled status
 */
export function getActiveCampaigns(campaigns: Campaign[]): Campaign[] {
  const now = new Date().getTime();
  return (campaigns || []).filter(p => {
    if (!p.is_enabled) return false;
    const start = new Date(p.start_at).getTime();
    const end = new Date(p.end_at).getTime();
    return now >= start && now <= end;
  });
}

/**
 * Checks product category and product ID eligibility
 */
export function isProductEligibleForCampaign(
  productCategory: string,
  campaign: Campaign,
  productId?: string
): boolean {
  if (!campaign.is_enabled) return false;

  const isAllCategories = !campaign.target_category || campaign.target_category.toUpperCase() === 'ALL';
  const matchesCategory = isAllCategories || 
    productCategory === campaign.target_category || 
    (productCategory && productCategory.startsWith(`${campaign.target_category} `));

  const matchesProduct = campaign.target_product_id ? campaign.target_product_id === productId : true;

  if (campaign.target_product_id && campaign.target_category) {
    return matchesProduct;
  }

  return Boolean(matchesCategory);
}

/**
 * Returns all available valid offers for a product
 */
export function getAvailableOffersForProduct(
  originalPrice: number,
  activeCampaigns: Campaign[],
  category?: string,
  productId?: string,
  appliedCouponCode?: string
): OfferOption[] {
  const eligible = (activeCampaigns || []).filter(p => {
    const isTargetMatch = isProductEligibleForCampaign(category || '', p, productId);
    const isAutomatic = p.campaign_mode === 'AUTOMATIC' || p.campaign_mode === 'BOTH';
    const isCouponMatch = (p.campaign_mode === 'COUPON' || p.campaign_mode === 'BOTH') &&
                          p.coupon_code &&
                          p.coupon_code.toUpperCase() === appliedCouponCode?.toUpperCase();

    return isTargetMatch && (isAutomatic || isCouponMatch);
  });

  return eligible.map(camp => {
    let discountAmount = 0;
    if (camp.discount_type === 'PERCENTAGE') {
      discountAmount = Math.round((originalPrice * (camp.discount_value / 100)) * 100) / 100;
    } else {
      discountAmount = Math.min(camp.discount_value, originalPrice);
    }

    const offerLabel = camp.discount_type === 'PERCENTAGE'
      ? `${camp.name} — ${camp.discount_value}% OFF`
      : `${camp.name} — ₹${camp.discount_value} OFF`;

    return {
      campaignId: camp.id,
      offerName: camp.name,
      offerLabel,
      discountType: camp.discount_type,
      discountValue: camp.discount_value,
      discountAmount,
      finalPrice: Math.max(0, originalPrice - discountAmount),
      couponCode: camp.coupon_code
    };
  });
}

/**
 * Enforces single-offer selection policy.
 * Compatible with Product Cards, PDPs, and Checkout Actions.
 */
export function calculateDiscountedPrice(
  originalPrice: number,
  activeCampaigns: Campaign[],
  category?: string,
  productId?: string,
  appliedCouponCode?: string,
  selectedCampaignId?: string
): { 
  finalPrice: number; 
  appliedOffer: OfferOption | null; 
  availableOffers: OfferOption[];
  appliedCampaign?: Campaign | null;
} {
  const availableOffers = getAvailableOffersForProduct(
    originalPrice,
    activeCampaigns,
    category,
    productId,
    appliedCouponCode
  );

  if (availableOffers.length === 0) {
    return { 
      finalPrice: originalPrice, 
      appliedOffer: null, 
      availableOffers: [],
      appliedCampaign: null 
    };
  }

  // 1. If customer explicitly selected one offer ID, apply that chosen offer
  let chosenOffer: OfferOption | undefined;
  if (selectedCampaignId) {
    chosenOffer = availableOffers.find(o => o.campaignId === selectedCampaignId);
  }

  // 2. Default: Priority order, then highest discount value
  if (!chosenOffer) {
    availableOffers.sort((a, b) => {
      const campA = activeCampaigns.find(c => c.id === a.campaignId);
      const campB = activeCampaigns.find(c => c.id === b.campaignId);
      const priorityDiff = (campB?.priority || 1) - (campA?.priority || 1);
      if (priorityDiff !== 0) return priorityDiff;
      return b.discountAmount - a.discountAmount;
    });
    chosenOffer = availableOffers[0];
  }

  const matchedCampaign = activeCampaigns.find(c => c.id === chosenOffer?.campaignId) || null;

  return {
    finalPrice: chosenOffer.finalPrice,
    appliedOffer: chosenOffer,
    availableOffers,
    appliedCampaign: matchedCampaign
  };
}