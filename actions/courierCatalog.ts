'use server';

export async function pushProductToCourierCatalog(productData: {
  title: string;
  style_code: string;
  price: number;
  net_weight: string;
  hsn_code: string;
  gst_rate: number;
  category: string;
}) {
  const apiKey = process.env.COURIER_API_KEY; // npk_5582640afd6fab9b
  const catalogApiUrl = 'https://api.nimbuspost.com/v1/products'; // NimbusPost Catalog API Endpoint

  if (!apiKey) {
    return { success: false, error: 'Courier API Key missing' };
  }

  const payload = {
    name: productData.title,
    sku: productData.style_code || 'SKU-' + Math.floor(1000 + Math.random() * 9000),
    price: productData.price,
    weight: parseFloat(productData.net_weight) || 0.5, // weight in KG
    hsn: productData.hsn_code,
    category: productData.category,
    tax_rate: productData.gst_rate
  };

  try {
    const response = await fetch(catalogApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    return { success: true, result };
  } catch (err: any) {
    console.warn('Courier Catalog Sync Warning:', err.message);
    return { success: false, error: err.message };
  }
}