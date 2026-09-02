import React from 'react';
import { ShieldCheck, ExternalLink, Store, BadgeCheck } from 'lucide-react';
import { sanitizeMarketplaceUrl, sanitizeMarketplaceName } from '@/lib/utils';

type Marketplace = {
  name?: string | null;
  url?: string | null;
  rating?: number | string | null;
  reviews?: number | string | null;
};

export function SellerMarketplaceTrust({ marketplaces = [] }: { marketplaces?: Marketplace[] }) {
  const valid = marketplaces
    .map((marketplace) => ({
      ...marketplace,
      name: sanitizeMarketplaceName(marketplace?.name),
      url: sanitizeMarketplaceUrl(marketplace?.url),
    }))
    .filter((marketplace) => marketplace.name && marketplace.url);

  if (valid.length === 0) return null;

  return (
    <section className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
      <div className="flex items-center gap-2 text-emerald-900">
        <ShieldCheck size={18} />
        <h3 className="text-sm font-black">Seller Marketplace Presence</h3>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-emerald-800/80">
        You can also review our seller presence on supported marketplaces.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {valid.map((marketplace, index) => (
          <a
            key={`${marketplace.name}-${index}`}
            href={marketplace.url || '#'}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-white px-3 py-2.5 transition hover:border-emerald-200 hover:shadow-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Store size={15} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-black text-gray-900">{marketplace.name}</span>
                {(marketplace.rating || marketplace.reviews) && (
                  <span className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                    <BadgeCheck size={11} className="text-emerald-600" />
                    {marketplace.rating ? `${marketplace.rating} rating` : 'Marketplace profile'}
                    {marketplace.reviews ? ` • ${marketplace.reviews} reviews` : ''}
                  </span>
                )}
              </span>
            </span>
            <ExternalLink size={14} className="shrink-0 text-gray-400" />
          </a>
        ))}
      </div>
    </section>
  );
}

export default SellerMarketplaceTrust;
