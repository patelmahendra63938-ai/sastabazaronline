'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Image as ImageIcon,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';

type ProductRow = {
  id: string;
  title: string;
  images: string[] | null;
};

type ReportRow = {
  productId: string;
  productTitle: string;
  imageIndex: number;
  originalUrl: string;
  optimizedUrl?: string;
  originalBytes?: number;
  optimizedBytes?: number;
  savedPercent?: number;
  originalWidth?: number;
  originalHeight?: number;
  outputWidth?: number;
  outputHeight?: number;
  status: 'optimized' | 'skipped' | 'failed';
  note: string;
};

type OptimizedImage = {
  blob: Blob;
  originalBytes: number;
  optimizedBytes: number;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
  savedPercent: number;
  shouldReplace: boolean;
  note: string;
};

const TARGET_MAX_DIMENSION = 1600;
const SMALL_IMAGE_BYTES = 250 * 1024;
const MIN_SAVING_PERCENT = 8;

function formatBytes(bytes?: number) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function chooseQuality(bytes: number) {
  if (bytes > 5 * 1024 * 1024) return 0.76;
  if (bytes > 2 * 1024 * 1024) return 0.8;
  if (bytes > 1 * 1024 * 1024) return 0.83;
  if (bytes > 500 * 1024) return 0.85;
  return 0.87;
}

async function decodeImage(blob: Blob): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Could not decode image.'));
    });
    return image;
  } finally {
    // Kept until draw completes by the caller. Revocation happens there.
  }
}

async function optimizeImageBlob(sourceBlob: Blob): Promise<OptimizedImage> {
  const originalBytes = sourceBlob.size;
  const image = await decodeImage(sourceBlob);
  const objectUrl = image.src;

  try {
    const originalWidth = image.naturalWidth || image.width;
    const originalHeight = image.naturalHeight || image.height;
    const largestSide = Math.max(originalWidth, originalHeight);

    if (
      originalBytes <= SMALL_IMAGE_BYTES &&
      largestSide <= TARGET_MAX_DIMENSION &&
      sourceBlob.type === 'image/webp'
    ) {
      return {
        blob: sourceBlob,
        originalBytes,
        optimizedBytes: originalBytes,
        originalWidth,
        originalHeight,
        outputWidth: originalWidth,
        outputHeight: originalHeight,
        savedPercent: 0,
        shouldReplace: false,
        note: 'Already small WebP; left untouched.',
      };
    }

    const scale = largestSide > TARGET_MAX_DIMENSION ? TARGET_MAX_DIMENSION / largestSide : 1;
    const outputWidth = Math.max(1, Math.round(originalWidth * scale));
    const outputHeight = Math.max(1, Math.round(originalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas image optimizer is not available in this browser.');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outputWidth, outputHeight);
    ctx.drawImage(image, 0, 0, outputWidth, outputHeight);

    const quality = chooseQuality(originalBytes);
    const optimizedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('WebP conversion failed.'))),
        'image/webp',
        quality,
      );
    });

    const optimizedBytes = optimizedBlob.size;
    const savedPercent = Math.max(0, Math.round(((originalBytes - optimizedBytes) / originalBytes) * 100));
    const resized = outputWidth !== originalWidth || outputHeight !== originalHeight;
    const shouldReplace = optimizedBytes < originalBytes && (savedPercent >= MIN_SAVING_PERCENT || resized);

    return {
      blob: shouldReplace ? optimizedBlob : sourceBlob,
      originalBytes,
      optimizedBytes: shouldReplace ? optimizedBytes : originalBytes,
      originalWidth,
      originalHeight,
      outputWidth: shouldReplace ? outputWidth : originalWidth,
      outputHeight: shouldReplace ? outputHeight : originalHeight,
      savedPercent: shouldReplace ? savedPercent : 0,
      shouldReplace,
      note: shouldReplace
        ? `Adaptive WebP optimization applied at quality ${Math.round(quality * 100)}.`
        : 'Optimization would not save enough space; original URL kept.',
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function OldImageOptimizerPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [scanning, setScanning] = useState(false);
  const [running, setRunning] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);
  const [currentLabel, setCurrentLabel] = useState('');
  const [processedImages, setProcessedImages] = useState(0);
  const [report, setReport] = useState<ReportRow[]>([]);
  const [error, setError] = useState('');
  const stopRef = useRef(false);

  const totalImages = useMemo(
    () => products.reduce((sum, product) => sum + (Array.isArray(product.images) ? product.images.length : 0), 0),
    [products],
  );

  const optimizedCount = report.filter((row) => row.status === 'optimized').length;
  const failedCount = report.filter((row) => row.status === 'failed').length;
  const skippedCount = report.filter((row) => row.status === 'skipped').length;
  const totalOriginalBytes = report.reduce((sum, row) => sum + (row.originalBytes || 0), 0);
  const totalOptimizedBytes = report.reduce(
    (sum, row) => sum + (row.optimizedBytes ?? row.originalBytes ?? 0),
    0,
  );
  const totalSavedBytes = Math.max(0, totalOriginalBytes - totalOptimizedBytes);

  const scanProducts = async () => {
    setScanning(true);
    setError('');
    setProducts([]);
    setReport([]);
    setProcessedImages(0);
    setCurrentLabel('');

    try {
      const { data, error: queryError } = await supabase
        .from('products')
        .select('id, title, images')
        .not('images', 'is', null)
        .order('created_at', { ascending: true });

      if (queryError) throw queryError;
      const rows = (data || []).filter(
        (product: ProductRow) => Array.isArray(product.images) && product.images.length > 0,
      );
      setProducts(rows);
    } catch (err: any) {
      setError(err?.message || 'Could not scan old product images.');
    } finally {
      setScanning(false);
    }
  };

  const requestStop = () => {
    stopRef.current = true;
    setStopRequested(true);
  };

  const runOptimizer = async () => {
    if (products.length === 0 || totalImages === 0) return;

    const confirmed = window.confirm(
      `Optimize ${totalImages} existing product images?\n\nOriginal Supabase files will NOT be deleted. New optimized WebP files will be created and product URLs will be updated only after each product succeeds.`,
    );
    if (!confirmed) return;

    setRunning(true);
    setStopRequested(false);
    stopRef.current = false;
    setError('');
    setReport([]);
    setProcessedImages(0);

    const nextReport: ReportRow[] = [];
    let completedImages = 0;

    try {
      for (const product of products) {
        if (stopRef.current) break;

        const originalUrls = Array.isArray(product.images) ? product.images : [];
        const replacementUrls = [...originalUrls];
        const uploadedForProduct: string[] = [];
        let productHasReplacement = false;

        for (let index = 0; index < originalUrls.length; index += 1) {
          if (stopRef.current) break;

          const originalUrl = originalUrls[index];
          setCurrentLabel(`${product.title} — image ${index + 1}/${originalUrls.length}`);

          const baseRow: ReportRow = {
            productId: product.id,
            productTitle: product.title,
            imageIndex: index,
            originalUrl,
            status: 'failed',
            note: '',
          };

          try {
            const response = await fetch(originalUrl, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Image fetch failed (${response.status}).`);
            const sourceBlob = await response.blob();
            if (!sourceBlob.type.startsWith('image/')) throw new Error('URL did not return an image.');

            const result = await optimizeImageBlob(sourceBlob);
            baseRow.originalBytes = result.originalBytes;
            baseRow.optimizedBytes = result.optimizedBytes;
            baseRow.savedPercent = result.savedPercent;
            baseRow.originalWidth = result.originalWidth;
            baseRow.originalHeight = result.originalHeight;
            baseRow.outputWidth = result.outputWidth;
            baseRow.outputHeight = result.outputHeight;

            if (!result.shouldReplace) {
              baseRow.status = 'skipped';
              baseRow.note = result.note;
              nextReport.push(baseRow);
            } else {
              const fileName = `optimized/${product.id}/img-${index + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;
              const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(fileName, result.blob, {
                  contentType: 'image/webp',
                  cacheControl: '31536000',
                  upsert: false,
                });

              if (uploadError) throw uploadError;
              uploadedForProduct.push(fileName);

              const { data: publicUrlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);

              if (!publicUrlData?.publicUrl) throw new Error('Could not create optimized public URL.');

              replacementUrls[index] = publicUrlData.publicUrl;
              productHasReplacement = true;
              baseRow.optimizedUrl = publicUrlData.publicUrl;
              baseRow.status = 'optimized';
              baseRow.note = result.note;
              nextReport.push(baseRow);
            }
          } catch (imageError: any) {
            baseRow.status = 'failed';
            baseRow.note = imageError?.message || 'Unknown optimization error.';
            nextReport.push(baseRow);
          } finally {
            completedImages += 1;
            setProcessedImages(completedImages);
            setReport([...nextReport]);
          }
        }

        if (stopRef.current) break;

        if (productHasReplacement) {
          const { error: updateError } = await supabase
            .from('products')
            .update({ images: replacementUrls })
            .eq('id', product.id);

          if (updateError) {
            for (const row of nextReport) {
              if (row.productId === product.id && row.status === 'optimized') {
                row.status = 'failed';
                row.note = `Optimized file uploaded but product URL update failed: ${updateError.message}`;
              }
            }
            setReport([...nextReport]);
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Optimizer stopped because of an unexpected error.');
    } finally {
      setRunning(false);
      setCurrentLabel('');
    }
  };

  const downloadReport = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      safety: 'Original Supabase files were not deleted by this optimizer.',
      totals: {
        scannedProducts: products.length,
        scannedImages: totalImages,
        optimized: optimizedCount,
        skipped: skippedCount,
        failed: failedCount,
        originalBytes: totalOriginalBytes,
        resultingBytes: totalOptimizedBytes,
        savedBytes: totalSavedBytes,
      },
      rows: report,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sastabazaronline-old-image-optimizer-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#F8F9FB] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href="/admin/products"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
              aria-label="Back to admin products"
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-indigo-700" aria-hidden="true" />
                <h1 className="text-xl font-black text-indigo-950">One-Time Old Image Optimizer</h1>
              </div>
              <p className="mt-1 max-w-3xl text-sm text-gray-600">
                Creates optimized WebP copies for existing catalog images and updates product image URLs. Original Supabase files are kept as backup and are never deleted here.
              </p>
            </div>
          </div>
          <Link
            href="/admin/add-product"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-950 px-4 text-sm font-bold text-white hover:bg-indigo-900"
          >
            Add Product
          </Link>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          <div className="flex items-start gap-3">
            <TriangleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-black">Safety mode</p>
              <p className="mt-1 leading-6">
                Scan first. Optimization runs sequentially, leaves small/efficient images untouched, limits large images to {TARGET_MAX_DIMENSION}px, uploads new WebP files with long cache headers, then updates each product only after its replacements are ready.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Products', products.length],
            ['Images', totalImages],
            ['Optimized', optimizedCount],
            ['Failed', failedCount],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-black text-indigo-950">{value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={scanProducts}
              disabled={scanning || running}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-black text-indigo-950 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {scanning ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
              {scanning ? 'Scanning…' : '1. Scan Old Images'}
            </button>

            <button
              type="button"
              onClick={runOptimizer}
              disabled={running || totalImages === 0}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-black text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? <Loader2 size={17} className="animate-spin" /> : <Play size={17} />}
              {running ? 'Optimizing…' : '2. Optimize Scanned Images'}
            </button>

            {running && (
              <button
                type="button"
                onClick={requestStop}
                disabled={stopRequested}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                <Pause size={17} />
                {stopRequested ? 'Stopping safely…' : 'Stop After Current Image'}
              </button>
            )}

            <button
              type="button"
              onClick={downloadReport}
              disabled={report.length === 0 || running}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={17} />
              Download Report
            </button>
          </div>

          {totalImages > 0 && (
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between gap-4 text-xs font-bold text-gray-600">
                <span>{currentLabel || 'Ready'}</span>
                <span>{processedImages} / {totalImages}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-indigo-700 transition-all"
                  style={{ width: `${totalImages ? Math.min(100, (processedImages / totalImages) * 100) : 0}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </div>
          )}
        </div>

        {report.length > 0 && (
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-black text-indigo-950">Optimization Result</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Original {formatBytes(totalOriginalBytes)} → resulting {formatBytes(totalOptimizedBytes)} · saved {formatBytes(totalSavedBytes)} · skipped {skippedCount}
                </p>
              </div>
              {failedCount === 0 && processedImages > 0 && !running && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                  <CheckCircle2 size={14} /> Completed without image errors
                </span>
              )}
            </div>

            <div className="max-h-[520px] overflow-auto rounded-2xl border border-gray-200">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="sticky top-0 bg-gray-50 text-[10px] font-black uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3">Image</th>
                    <th className="p-3">Original</th>
                    <th className="p-3">Result</th>
                    <th className="p-3">Saved</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.map((row, index) => (
                    <tr key={`${row.productId}-${row.imageIndex}-${index}`}>
                      <td className="max-w-52 p-3 font-bold text-gray-800">{row.productTitle}</td>
                      <td className="p-3">#{row.imageIndex + 1}</td>
                      <td className="p-3">
                        {formatBytes(row.originalBytes)}
                        {row.originalWidth && row.originalHeight ? ` · ${row.originalWidth}×${row.originalHeight}` : ''}
                      </td>
                      <td className="p-3">
                        {formatBytes(row.optimizedBytes)}
                        {row.outputWidth && row.outputHeight ? ` · ${row.outputWidth}×${row.outputHeight}` : ''}
                      </td>
                      <td className="p-3 font-black text-green-700">{row.savedPercent ? `${row.savedPercent}%` : '—'}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-1 font-black ${
                          row.status === 'optimized'
                            ? 'bg-green-50 text-green-700'
                            : row.status === 'skipped'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-red-50 text-red-700'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="max-w-72 p-3 text-gray-600">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {products.length === 0 && !scanning && (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            <ImageIcon size={34} className="mx-auto mb-3 text-gray-300" aria-hidden="true" />
            <p className="text-sm font-bold">Run the scan first. Nothing is changed during scanning.</p>
          </div>
        )}
      </div>
    </main>
  );
}
