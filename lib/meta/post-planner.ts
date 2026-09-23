export type SocialChannel = 'facebook' | 'instagram';

export const PAGE_ID = '107026669080963';
export const GRAPH_VERSION = 'v25.0';

export function scheduledUtc(date: string, channel: SocialChannel) {
  // IST is UTC+05:30 and has no daylight saving time.
  return `${date}T${channel === 'facebook' ? '01:30' : '13:30'}:00.000Z`;
}

export function istDate(offsetDays = 0) {
  return new Date(Date.now() + 330 * 60_000 + offsetDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export function productCaption(title: string, price: number, id: string) {
  return `${title}\n\n₹${new Intl.NumberFormat('en-IN').format(price)}\nShop: https://adhyeybrothers.in/product/${id}\n\n#AdhyeyBrothers #ShopOnline`;
}
