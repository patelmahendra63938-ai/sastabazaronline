'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CircleAlert, ImageIcon, Palette, UploadCloud } from 'lucide-react';
import {
  uploadGoogleAdsCreativeImageAction,
  finalizeGoogleAdsCreativeAssetsAction,
} from '@/app/admin/ads/actions';

type ProductCreative = {
  id: string;
  title: string;
  colour: string;
  sourceUrl: string;
};

type PreparedAsset = {
  product_id: string;
  title: string;
  colour: string;
  source_url: string;
  square?: { width: number; height: number; resource_name: string };
  landscape?: { width: number; height: number; resource_name: string };
};

function loadImage(sourceUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load product image.'));
    image.src = sourceUrl;
  });
}

async function safeFitJpeg(sourceUrl: string, width: number, height: number) {
  const source = await loadImage(sourceUrl);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable in this browser.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);

  const padding = Math.max(36, Math.round(Math.min(width, height) * 0.055));
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  const scale = Math.min(availableWidth / source.naturalWidth, availableHeight / source.naturalHeight);
  const drawWidth = Math.round(source.naturalWidth * scale);
  const drawHeight = Math.round(source.naturalHeight * scale);
  const x = Math.round((width - drawWidth) / 2);
  const y = Math.round((height - drawHeight) / 2);

  context.drawImage(source, x, y, drawWidth, drawHeight);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Could not render Google Ads image.')),
      'image/jpeg',
      0.92
    );
  });
}

async function uploadOne(
  proposalId: string,
  name: string,
  image: Blob,
  width: number,
  height: number
) {
  const formData = new FormData();
  formData.set('proposalId', proposalId);
  formData.set('name', name);
  formData.set('width', String(width));
  formData.set('height', String(height));
  formData.set('image', new File([image], name + '.jpg', { type: 'image/jpeg' }));
  return uploadGoogleAdsCreativeImageAction(formData);
}

export default function GoogleAdsCreativeBuilder({
  proposalId,
  proposalStatus,
  products,
  preparedAssets,
  preparedAt,
  headlines,
  description,
}: {
  proposalId: string;
  proposalStatus: string;
  products: ProductCreative[];
  preparedAssets: PreparedAsset[];
  preparedAt: string | null;
  headlines?: string[];
  description?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const displayProducts = preparedAssets.length
    ? preparedAssets.map((asset) => ({
        id: asset.product_id,
        title: asset.title,
        colour: asset.colour,
        sourceUrl: asset.source_url,
      }))
    : products;

  async function prepare() {
    if (products.length !== 4 || busy) return;
    setBusy(true);
    setError('');

    try {
      const finalAssets: PreparedAsset[] = [];

      for (let index = 0; index < products.length; index += 1) {
        const product = products[index];
        setProgress('Preparing ' + product.colour + ' (' + (index + 1) + '/4)…');

        const square = await safeFitJpeg(product.sourceUrl, 1200, 1200);
        const landscape = await safeFitJpeg(product.sourceUrl, 1200, 628);

        setProgress('Uploading ' + product.colour + ' square…');
        const squareResult = await uploadOne(
          proposalId,
          'Dhoti Choli - ' + product.colour + ' - Square',
          square,
          1200,
          1200
        );

        setProgress('Uploading ' + product.colour + ' landscape…');
        const landscapeResult = await uploadOne(
          proposalId,
          'Dhoti Choli - ' + product.colour + ' - Landscape',
          landscape,
          1200,
          628
        );

        finalAssets.push({
          product_id: product.id,
          title: product.title,
          colour: product.colour,
          source_url: product.sourceUrl,
          square: {
            width: 1200,
            height: 1200,
            resource_name: squareResult.resourceName,
          },
          landscape: {
            width: 1200,
            height: 628,
            resource_name: landscapeResult.resourceName,
          },
        });
      }

      setProgress('Saving creative set…');
      const finalizeData = new FormData();
      finalizeData.set('proposalId', proposalId);
      finalizeData.set('assets', JSON.stringify(finalAssets));
      await finalizeGoogleAdsCreativeAssetsAction(finalizeData);

      setProgress('8 assets ready');
      router.replace('/admin/ads?platform=google&google=creative-prepared');
      router.refresh();
    } catch (caught) {
      console.error(caught);
      setError(caught instanceof Error ? caught.message : 'Creative upload failed.');
      setProgress('');
    } finally {
      setBusy(false);
    }
  }

  const defaultHeadlines = [
    'Shop Dhoti Choli Online',
    'Festive Dhoti Choli Sets',
    'Dhoti Choli for Garba',
    'Haldi & Wedding Styles',
    'Wine Black Yellow Green',
  ];

  return (
    <div className="mt-5 rounded-2xl border border-[#ead8b8] bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#8a5a20]">
            <ImageIcon size={14} /> Automatic Creative Builder
          </div>
          <h3 className="mt-2 text-sm font-black text-[#5e171b]">Safe-fit Google Ads image set</h3>
          <p className="mt-1 max-w-3xl text-[11px] leading-5 text-stone-500">
            Browser rendering supports your WEBP product photos. Every photo is fitted inside a white Google Ads
            canvas without center-cropping, so the complete source image stays visible.
          </p>
        </div>
        <span className={
          'inline-flex w-fit items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase ' +
          (preparedAt ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')
        }>
          {preparedAt ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
          {preparedAt ? '8 assets ready' : 'not prepared'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {displayProducts.map((asset) => (
          <div key={asset.colour} className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
            <div className="aspect-square bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset.sourceUrl} alt={asset.title} className="h-full w-full object-contain" />
            </div>
            <div className="border-t border-stone-200 px-3 py-2">
              <div className="flex items-center gap-1 text-[10px] font-black text-stone-700">
                <Palette size={11} /> {asset.colour}
              </div>
              <div className="mt-1 truncate text-[9px] text-stone-400">{asset.title}</div>
            </div>
          </div>
        ))}
      </div>

      {displayProducts.length !== 4 && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">
          Four eligible colour products could not be selected. Upload is blocked until all four are available.
        </div>
      )}

      <div className="mt-4 rounded-xl bg-stone-50 p-4">
        <div className="text-[9px] font-black uppercase tracking-wider text-stone-400">Creative copy</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(headlines ?? defaultHeadlines).map((headline) => (
            <span key={headline} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-stone-700">
              {headline}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-stone-600">
          {description ?? 'Shop Dhoti Choli sets in Wine Purple, Black, Yellow and Green for festive occasions.'}
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] leading-4 text-stone-500">
            Uploads image assets only. It does not launch the new campaign or pause old campaigns.
          </p>
          {progress && <p className="mt-1 text-[10px] font-bold text-[#741f23]">{progress}</p>}
        </div>
        <button
          type="button"
          onClick={prepare}
          disabled={proposalStatus !== 'approved' || Boolean(preparedAt) || products.length !== 4 || busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#741f23] px-4 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UploadCloud size={14} />
          {preparedAt ? 'Images uploaded' : busy ? 'Preparing…' : 'Auto prepare & upload'}
        </button>
      </div>
    </div>
  );
}
