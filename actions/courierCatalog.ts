'use server';

import { requireAdminUser } from '@/lib/auth';

export async function pushProductToCourierCatalog(productData: {
  title: string;
  style_code: string;
  price: number;
  net_weight: string;
  hsn_code: string;
  gst_rate: number;
  category: string;
}) {
  await requireAdminUser();

  const apiKey =
    process.env.COURIER_API_KEY ||
    process.env.NIMBUSPOST_API_KEY;

  const catalogApiUrl =
    process.env.COURIER_CATALOG_API_URL ||
    'https://api.nimbuspost.com/v1/products';

  if (!apiKey) {
    return {
      success: false,
      error: 'Courier API key is not configured on the server.',
    };
  }

  const parsedWeightKg = Number.parseFloat(productData.net_weight);

  if (!Number.isFinite(parsedWeightKg) || parsedWeightKg <= 0) {
    return {
      success: false,
      error: 'Valid product weight is required before courier catalog sync.',
    };
  }

  const payload = {
    name: productData.title,
    sku:
      productData.style_code ||
      `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
    price: productData.price,
    weight: parsedWeightKg,
    hsn: productData.hsn_code,
    category: productData.category,
    tax_rate: productData.gst_rate,
  };

  try {
    const response = await fetch(catalogApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error:
          result?.message ||
          result?.error ||
          `Courier catalog API request failed with HTTP ${response.status}.`,
      };
    }

    return {
      success: true,
      result,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unknown courier catalog error';

    console.warn('Courier Catalog Sync Warning:', message);

    return {
      success: false,
      error: message,
    };
  }
}
