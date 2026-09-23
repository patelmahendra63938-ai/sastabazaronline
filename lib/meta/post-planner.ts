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

function instagramDetails(title: string, category?: string | null) {
  const lower = title.toLowerCase();
  const details: string[] = [];
  const push = (value: string) => {
    if (!details.includes(value) && details.length < 3) details.push(value);
  };

  const capacity = title.match(/\b\d+(?:\.\d+)?\s?ml\b/i)?.[0];
  if (capacity) push(`📏 Capacity: ${capacity.replace(/\s+/g, ' ')}`);

  if (lower.includes('ceramic')) push('🍽️ Ceramic material');
  else if (lower.includes('wooden')) push('🪵 Wooden design');
  else if (lower.includes('pvc')) push('🧩 PVC material');
  else if (lower.includes('glass')) push('🫙 Glass material');
  else if (lower.includes('velvet')) push('✨ Velvet fabric');

  if (lower.includes('airtight')) push('🔒 Airtight storage');
  if (lower.includes('clip lock')) push('🔐 Clip-lock closure');
  if (lower.includes('anti-slip')) push('🛡️ Anti-slip design');
  if (lower.includes('oven safe')) push('🔥 Oven-safe bakeware');
  if (lower.includes('wall-mounted')) push('🧱 Wall-mounted design');
  if (lower.includes('space-saving')) push('📐 Space-saving design');
  if (lower.includes('360° swivel') || lower.includes('360°')) push('🔄 360° swivel');
  if (lower.includes('3 mode')) push('🚿 3 operating modes');
  if (lower.includes('water saving')) push('💧 Water-saving design');
  if (lower.includes('1m hose') || lower.includes('1 m hose')) push('📏 Includes 1 m hose');
  if (lower.includes('manual siphon') || lower.includes('hand liquid transfer')) push('🖐️ Manual liquid transfer');
  if (lower.includes('leak & odor guard') || lower.includes('leak and odor guard')) push('🛡️ Leak & odor guard');
  if (lower.includes('bamboo lids')) push('🎋 Bamboo lids');
  if (lower.includes('embroidered')) push('🧵 Embroidered detailing');
  if (lower.includes('sequin')) push('✨ Sequin work');
  if (lower.includes('wedding wear')) push('💍 Wedding wear');
  else if (lower.includes('festive')) push('🎉 Festive wear');

  const setMatch = title.match(/\b(?:set|pack) of\s+(\d+)\b/i);
  if (setMatch) push(`📦 ${setMatch[0].replace(/^./, (c) => c.toUpperCase())}`);
  const pieceMatch = title.match(/\b(\d+)-piece\b/i);
  if (pieceMatch) push(`📦 ${pieceMatch[1]}-piece set`);

  if (details.length < 2 && lower.includes('cereal bowl')) push('🥣 For cereal, soup, salad & rice');
  if (details.length < 2 && lower.includes('coaster')) push('☕ For tea, coffee & dining tables');

  if (details.length < 2 && category) {
    if (category === 'Home & Kitchen') push('🏠 Home & Kitchen');
    else if (category === 'Fashion & Apparel') push('👗 Fashion & Apparel');
    else if (category === 'Automotive & Utility') push('🚗 Automotive & Utility');
  }

  return details;
}

export function productCaption(
  title: string,
  price: number,
  id: string,
  channel: SocialChannel,
  category?: string | null,
) {
  const priceText = `₹${new Intl.NumberFormat('en-IN').format(price)}`;
  if (channel === 'instagram') {
    const details = instagramDetails(title, category);
    const detailBlock = details.length ? `\n\n${details.join('\n')}` : '';
    return `${title}${detailBlock}\n\nPrice: ${priceText}\n🛍️ Shop now — link in bio.`;
  }

  return `${title}\n\n${priceText}\nShop: https://adhyeybrothers.in/product/${id}\n\n#AdhyeyBrothers #ShopOnline`;
}
