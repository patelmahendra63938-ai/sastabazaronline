export type SocialChannel = 'facebook' | 'instagram';
export type SocialSlot = 1 | 2;

export const PAGE_ID = '107026669080963';
export const GRAPH_VERSION = 'v25.0';

export function scheduledUtc(date: string, channel: SocialChannel, slot: SocialSlot) {
  // IST is UTC+05:30 and has no daylight saving time.
  const utcTime = channel === 'facebook'
    ? (slot === 1 ? '01:30' : '05:30')
    : (slot === 1 ? '11:30' : '13:30');
  return `${date}T${utcTime}:00.000Z`;
}

export function istTime(channel: SocialChannel, slot: SocialSlot) {
  return channel === 'facebook' ? (slot === 1 ? '7:00 AM' : '11:00 AM')
    : (slot === 1 ? '5:00 PM' : '7:00 PM');
}

export function istDate(offsetDays = 0) {
  return new Date(Date.now() + 330 * 60_000 + offsetDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export function productCaption(title: string, price: number, id: string) {
  return `${title}\n\n₹${new Intl.NumberFormat('en-IN').format(price)}\nShop: https://adhyeybrothers.in/product/${id}\n\n#AdhyeyBrothers #ShopOnline`;
}
