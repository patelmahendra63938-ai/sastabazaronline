/**
 * SASTABAZARONLINE Promotion & Link Accessibility Logger
 * Tracks active promotion routing, detects dead links or expired slugs, 
 * and provides operational telemetry for campaign clicks.
 */

export interface PromotionAccessLog {
  slug: string;
  isValid: boolean;
  timestamp: string;
  clientContext?: string;
}

/**
 * Validates and logs promotion link attempts to ensure no dead 404 routes occur on SASTABAZARONLINE.
 */
export function logPromotionLinkAccess(slug: string, isValid: boolean, clientContext?: string): void {
  const timestamp = new Date().toISOString();
  
  if (!isValid) {
    console.warn(
      `[SASTABAZARONLINE LINK WARNING] ⚠️ Expired, disabled, or non-existent promotion slug accessed: "/sale/${slug}" | Context: ${clientContext || 'Storefront Navigation'} | Time: [${timestamp}]`
    );
  } else {
    console.log(
      `[SASTABAZARONLINE LINK VERIFIED] ✅ Active campaign route successfully resolved: "/sale/${slug}" | Time: [${timestamp}]`
    );
  }
}

/**
 * Tracks promotional campaign engagement metrics (clicks, views, banner impressions).
 */
export function trackCampaignEngagement(
  campaignId: string, 
  campaignName: string, 
  action: 'CLICK' | 'VIEW' | 'APPLY_DISCOUNT'
): void {
  const timestamp = new Date().toISOString();
  console.info(
    `[SASTABAZARONLINE TELEMETRY] Campaign Triggered -> [ID: ${campaignId} | Name: "${campaignName}"] Action: ${action} at ${timestamp}`
  );
}

/**
 * Diagnostic helper to print detailed runtime stats of all loaded promotions.
 */
export function auditActiveCampaigns(campaignsCount: number, activeCount: number): void {
  console.log(
    `[SASTABAZARONLINE CAMPAIGN AUDIT] Total Fetched: ${campaignsCount} | Currently Live & Active: ${activeCount}`
  );
}