'use client';

import { ExternalLink, Star, ShieldCheck } from 'lucide-react';

type MeeshoReviewPreviewConfig = {
  productId: string;
  meeshoUrl: string;
  sourceTitle: string;
};

const PRODUCT_REVIEW_SOURCES: MeeshoReviewPreviewConfig[] = [
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

const SAMPLE_REVIEWS = [
  {
    name: 'Sample reviewer',
    rating: 5,
    text: 'Preview review card. Real Meesho review text will replace this before production.',
    date: 'Meesho review date',
  },
  {
    name: 'Sample reviewer',
    rating: 4,
    text: 'This preview shows the final layout only. No sample review will be published to customers.',
    date: 'Meesho review date',
  },
  {
    name: 'Sample reviewer',
    rating: 5,
    text: 'Each final card will keep clear Meesho attribution and a link customers can use to verify the source.',
    date: 'Meesho review date',
  },
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          size={14}
          className={value <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
        />
      ))}
    </span>
  );
}

export default function MeeshoReviewsPreview({ productId }: { productId: string }) {
  const source = PRODUCT_REVIEW_SOURCES.find((item) => item.productId === productId);
  if (!source) return null;

  return (
    <section className="mt-10 overflow-hidden rounded-3xl border border-[#ead8b8] bg-white shadow-xs">
      <div className="border-b border-[#f0e3cf] bg-[#fffaf5] px-5 py-4 sm:px-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f43397] text-sm font-black text-white">m</div>
              <div>
                <h2 className="text-lg font-black text-[#741f23]">Customer Reviews from Meesho</h2>
                <p className="text-xs text-gray-500">Marketplace reviews stay clearly separate from reviews placed on adhyeybrothers.in.</p>
              </div>
            </div>
          </div>
          <a
            href={source.meeshoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#f43397]/30 bg-[#fff0f7] px-4 text-xs font-black text-[#c32274] transition hover:bg-[#ffe2f0]"
          >
            View on Meesho <ExternalLink size={13} />
          </a>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-7 sm:py-6">
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-900">
          Preview only — the layout is real, but the rating, review count and review text below are sample content. We will replace them with genuine Meesho data before any production deployment.
        </div>

        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <div className="rounded-2xl border border-[#ead8b8] bg-[#fffdf9] p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#b5843d]">Preview rating</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-4xl font-black text-gray-900">4.5</span>
              <span className="pb-1 text-sm font-bold text-gray-500">/ 5</span>
            </div>
            <div className="mt-2"><Stars rating={5} /></div>
            <p className="mt-2 text-xs text-gray-500">Sample count: 100+ Meesho reviews</p>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-green-50 px-3 py-2 text-[11px] font-semibold text-green-800">
              <ShieldCheck size={15} className="mt-0.5 shrink-0" />
              <span>Final reviews will be labelled as Meesho reviews and will not be presented as verified purchases on this website.</span>
            </div>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-gray-900">What customers say on Meesho</h3>
                <p className="mt-0.5 text-[11px] text-gray-500">Source product: {source.sourceTitle}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {SAMPLE_REVIEWS.map((review, index) => (
                <article key={index} className="flex min-h-[190px] flex-col rounded-2xl border border-[#ead8b8] bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-black text-gray-900">{review.name}</p>
                      <div className="mt-1"><Stars rating={review.rating} /></div>
                    </div>
                    <span className="rounded-full bg-[#fff0f7] px-2 py-1 text-[9px] font-black uppercase tracking-wide text-[#c32274]">Meesho</span>
                  </div>
                  <p className="mt-3 flex-1 text-xs leading-relaxed text-gray-600">{review.text}</p>
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#f0e3cf] pt-3">
                    <span className="text-[10px] text-gray-400">{review.date}</span>
                    <a
                      href={source.meeshoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-black text-[#c32274] hover:underline"
                    >
                      View on Meesho <ExternalLink size={11} />
                    </a>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-4 text-center">
              <a
                href={source.meeshoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#fff0f7] px-5 text-xs font-black text-[#c32274] transition hover:bg-[#ffe2f0]"
              >
                View all reviews on Meesho <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
