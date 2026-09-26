export type BrandPlatform = 'linkedin' | 'contra';

export function istDate(offsetDays = 0) {
  return new Date(Date.now() + 330 * 60_000 + offsetDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export function scheduledUtc(date: string, platform: BrandPlatform) {
  // LinkedIn: 10:30 AM IST. Contra is a review reminder slot only: 9:00 AM IST.
  const time = platform === 'linkedin' ? '05:00' : '03:30';
  return `${date}T${time}:00.000Z`;
}

export function linkedinCaption(input: {
  title: string;
  price: number;
  id: string;
  category?: string | null;
}) {
  const price = new Intl.NumberFormat('en-IN').format(input.price);
  const category = input.category ? ` • ${input.category}` : '';
  return [
    `${input.title}${category}`,
    '',
    'Designed for direct-to-customer selling by Adhyey Brothers, Surat.',
    `Price: ₹${price}`,
    `View product: https://adhyeybrothers.in/product/${input.id}`,
    '',
    'We manufacture and sell through our own D2C channel, with catalog, inventory, order and marketing workflows managed in one system.',
    '',
    '#AdhyeyBrothers #D2C #ApparelManufacturing #Ecommerce'
  ].join('\n');
}

const contraTopics = [
  {
    title: 'Building the Adhyey Brothers D2C Commerce System',
    body: [
      'Adhyey Brothers is building a direct-to-customer commerce operation around its own manufactured products.',
      '',
      'Scope',
      '• Next.js storefront and admin operations',
      '• Product catalog and inventory workflows',
      '• Checkout, COD/UPI, orders and GST invoicing',
      '• Shipping and fulfillment integrations',
      '• Marketing and analytics connections',
      '',
      'Outcome',
      'A single operational system that connects manufacturing, catalog management, selling, fulfillment and marketing.',
      '',
      'Website: https://adhyeybrothers.in'
    ].join('\n')
  },
  {
    title: 'Automating Product Content for Adhyey Brothers',
    body: [
      'This project connects the Adhyey Brothers product catalog with a controlled social-content workflow.',
      '',
      'Workflow',
      '• Select eligible in-stock products',
      '• Generate platform-specific draft copy',
      '• Review and approve before publishing',
      '• Track scheduled, published and failed posts',
      '• Keep product links and pricing aligned with the live catalog',
      '',
      'The goal is repeatable content operations without losing manual control over what gets published.',
      '',
      'Website: https://adhyeybrothers.in'
    ].join('\n')
  },
  {
    title: 'From Manufacturing to D2C: Adhyey Brothers Operations',
    body: [
      'Adhyey Brothers combines apparel manufacturing with its own D2C selling stack.',
      '',
      'The operating model covers:',
      '• Product creation and catalog publishing',
      '• Inventory and variant management',
      '• Direct customer checkout',
      '• Order processing and shipping',
      '• Marketing automation and reporting',
      '',
      'This reduces dependence on marketplace-only selling and gives the brand direct control over customer experience and data.',
      '',
      'Website: https://adhyeybrothers.in'
    ].join('\n')
  },
  {
    title: 'E-commerce Operations Automation for Adhyey Brothers',
    body: [
      'A practical commerce automation project focused on reducing repetitive operational work.',
      '',
      'Automated areas include:',
      '• Product and image workflows',
      '• Social-post planning',
      '• Order status operations',
      '• Shipping calculations',
      '• Analytics and conversion tracking',
      '',
      'The system is designed to keep human approval at important checkpoints while automating repeatable tasks.',
      '',
      'Website: https://adhyeybrothers.in'
    ].join('\n')
  }
];

export function contraDraft(index: number) {
  return contraTopics[index % contraTopics.length];
}
