import { ExternalLink, ShieldCheck } from 'lucide-react';

interface MobileMarketplaceLinksProps {
  showAmazon?: boolean;
  showFlipkart?: boolean;
  showMeesho?: boolean;
}

const marketplaceItems = [
  {
    id: 'amazon',
    platform: 'Amazon',
    subtitle: 'Visit our Amazon seller page',
    url: 'https://www.amazon.in/l/27943762031?me=AXKNNYVWLT32Y&tag=ShopReferral_d451e877-492b-4a44-8989-d4151cfc4c54&ref=sf_seller_app_share_new_ls_srb',
    dotClass: 'bg-amber-500',
    buttonClass: 'border-amber-200 bg-amber-50 text-amber-950 active:bg-amber-100',
  },
  {
    id: 'flipkart',
    platform: 'Flipkart',
    subtitle: 'Browse ADHYEY BROTHERS on Flipkart',
    url: 'https://www.flipkart.com/adhyey-brothers-women-crop-top-skirt-ethnic-jacket-set/p/itm2881ff260ebcc?pid=ETHHJNJYHKNYXZPM',
    dotClass: 'bg-blue-600',
    buttonClass: 'border-blue-200 bg-blue-50 text-blue-950 active:bg-blue-100',
  },
  {
    id: 'meesho',
    platform: 'Meesho',
    subtitle: 'Open our Meesho marketplace profile',
    url: 'https://www.meesho.com/Adhyey?ms=2',
    dotClass: 'bg-pink-600',
    buttonClass: 'border-pink-200 bg-pink-50 text-pink-950 active:bg-pink-100',
  },
] as const;

export default function MobileMarketplaceLinks({
  showAmazon = true,
  showFlipkart = true,
  showMeesho = true,
}: MobileMarketplaceLinksProps) {
  const enabled = {
    amazon: showAmazon,
    flipkart: showFlipkart,
    meesho: showMeesho,
  };

  const items = marketplaceItems.filter((item) => enabled[item.id]);
  if (items.length === 0) return null;

  return (
    <section className="border-t border-[#ead8b8] bg-[#fffaf5] px-3 py-4 md:hidden" aria-labelledby="mobile-marketplace-heading">
      <div className="mb-3 flex items-center justify-center gap-2 text-center">
        <ShieldCheck size={15} className="text-[#b5843d]" aria-hidden="true" />
        <h2 id="mobile-marketplace-heading" className="text-sm font-black text-[#741f23]">
          Shop with us on marketplaces
        </h2>
      </div>

      <div className="grid gap-2.5">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ADHYEY BROTHERS on ${item.platform} in a new tab`}
            className={`flex min-h-[4.25rem] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-sm transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#741f23] ${item.buttonClass}`}
          >
            <span className="flex min-w-0 items-center gap-3 text-left">
              <span className={`h-3.5 w-3.5 shrink-0 rounded-full ${item.dotClass}`} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-base font-black leading-tight">{item.platform}</span>
                <span className="mt-0.5 block text-[11px] font-semibold leading-snug opacity-70">{item.subtitle}</span>
              </span>
            </span>
            <ExternalLink size={19} className="shrink-0" aria-hidden="true" />
          </a>
        ))}
      </div>
    </section>
  );
}
