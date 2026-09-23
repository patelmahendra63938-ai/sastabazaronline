import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Not found', { status: 404 });
  const { data: post } = await supabaseAdmin.from('meta_product_posts')
    .select('image_url,status')
    .eq('id', id).maybeSingle();
  if (!post || !['approved', 'publishing', 'published'].includes(post.status)) {
    return new Response('Not found', { status: 404 });
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const storagePrefix = `${supabaseUrl}/storage/v1/object/public/product-images/`;
  if (!supabaseUrl || !post.image_url.startsWith(storagePrefix)) {
    return new Response('Unsupported image', { status: 422 });
  }

  try {
    const imageResponse = await fetch(post.image_url, { signal: AbortSignal.timeout(15_000) });
    if (!imageResponse.ok || Number(imageResponse.headers.get('content-length') || 0) > 10_000_000) {
      return new Response('Image unavailable', { status: 502 });
    }
    const data = Buffer.from(await imageResponse.arrayBuffer());
    if (data.length > 10_000_000) return new Response('Image too large', { status: 413 });
    const jpeg = await sharp(data).rotate().resize(1080, 1080, {
      fit: 'contain', background: '#ffffff', withoutEnlargement: true,
    }).jpeg({ quality: 86 }).toBuffer();
    return new Response(new Uint8Array(jpeg), {
      headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=3600' },
    });
  } catch {
    return new Response('Image processing failed', { status: 502 });
  }
}
