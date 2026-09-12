'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, ShieldCheck } from 'lucide-react';

type MeeshoReviewSource = {
  productId: string;
  meeshoUrl: string;
  sourceTitle: string;
};

const PRODUCT_REVIEW_SOURCES: MeeshoReviewSource[] = [
  {
    productId: '2c17feb3-11c8-406f-96b7-282aeb3935bc',
    meeshoUrl: 'https://www.meesho.com/shop-a-vichitra-silk-indo-western-dhoti-set-for-women-with-sequin-bustier-crop-top-draped-bottom-and-long-cape-shrug-ideal-for-garba-weddings-sangeet-and-festive-occasions/p/b3cd0e?ms=2&source=Meri+Shop',
    sourceTitle: 'Vichitra Silk Indo-Western Dhoti Set',
  },
  {
    productId: 'aa35dfa6-5a0c-40cb-8ef1-599062f6c18f',
    meeshoUrl: 'https://www.meesho.com/shop-a-mustard-vichitra-silk-dhoti-choli-set-for-women-with-sequin-crop-top-draped-dhoti-skirt-and-embroidered-shrug-ideal-for-haldi-mehendi-garba-weddings-and-festive-occasions/p/arllkb?ms=2&source=Meri+Shop',
    sourceTitle: 'Mustard Vichitra Silk Dhoti Choli Set',
  },
  {
    productId: '2bd24aa8-569f-4c54-9135-d3c2f0dfe154',
    meeshoUrl: 'https://www.meesho.com/shop-a-wine-velvet-indo-western-dhoti-suit-for-women-with-crop-top-dhoti-pants-and-sequin-vichitra-silk-shrug-ideal-for-garba-weddings-sangeet-and-festive-occasions/p/b8elcx?ms=2&source=Meri+Shop',
    sourceTitle: 'Wine Velvet Indo-Western Dhoti Suit',
  },
  {
    productId: '87d20840-ef01-4170-be4a-86336f7d258f',
    meeshoUrl: 'https://www.meesho.com/verdant-whisper-velvet-cape-ensemble-with-hand-embroidery-and-cascading-ruffles-in-a-forest-dream-silhouette/p/9887xz?ms=2&source=Meri+Shop',
    sourceTitle: 'Verdant Whisper Velvet Cape Ensemble',
  },
];

export default function MeeshoReviewsPreview({ productId }: { productId: string }) {
  const source = PRODUCT_REVIEW_SOURCES.find((item) => item.productId === productId);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!source) return;

    const mount = document.createElement('div');
    mount.setAttribute('data-meesho-reviews-mount', 'true');

    const placeSection = () => {
      const headings = Array.from(document.querySelectorAll('h3'));
      const detailsHeading = headings.find((heading) =>
        heading.textContent?.trim().includes('Product Specifications & Details')
      );

      const detailsCard = detailsHeading?.parentElement?.parentElement;
      const marketplaceCard = document.querySelector('.marketplace-trust-container');
      const anchor = detailsCard || marketplaceCard;
      const parent = anchor?.parentElement;

      if (!anchor || !parent) return false;

      parent.insertBefore(mount, anchor);
      setPortalTarget(mount);
      return true;
    };

    if (!placeSection()) {
      const observer = new MutationObserver(() => {
        if (placeSection()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });

      const timeout = window.setTimeout(() => observer.disconnect(), 5000);
      return () => {
        window.clearTimeout(timeout);
        observer.disconnect();
        mount.remove();
      };
    }

    return () => mount.remove();
  }, [source]);

  if (!source || !portalTarget) return null;

  const section = (
    <section className="mt-10 overflow-hidden rounded-3xl border border-[#ead8b8] bg-white shadow-xs">
      <div className="border-b border-[#f0e3cf] bg-[#fffaf5] px-5 py-4 sm:px-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f43397] text-base font-black text-white">m</div>
            <div>
              <h2 className="text-lg font-black text-[#741f23]">Customer Reviews on Meesho</h2>
              <p className="text-xs text-gray-500">Check genuine marketplace ratings and reviews for this matching product on Meesho.</p>
            </div>
          </div>
          <a
            href={source.meeshoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#f43397]/30 bg-[#fff0f7] px-4 text-xs font-black text-[#c32274] transition hover:bg-[#ffe2f0]"
          >
            View Reviews on Meesho <ExternalLink size={13} />
          </a>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-7 sm:py-6">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-black text-gray-900">{source.sourceTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              These reviews are hosted on Meesho and are separate from reviews submitted on adhyeybrothers.in. Open the source page to see the current rating, review count, customer comments and review photos directly on Meesho.
            </p>
            <div className="mt-3 inline-flex items-start gap-2 rounded-xl bg-green-50 px-3 py-2 text-[11px] font-semibold text-green-800">
              <ShieldCheck size={15} className="mt-0.5 shrink-0" />
              <span>Marketplace source is clearly identified so buyers can verify the reviews themselves.</span>
            </div>
          </div>
          <a
            href={source.meeshoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#f43397] px-5 text-xs font-black text-white transition hover:bg-[#d52b83]"
          >
            Check on Meesho <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </section>
  );

  return createPortal(section, portalTarget);
}
