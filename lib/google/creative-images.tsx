import { ImageResponse } from 'next/og';

function assertSourceUrl(sourceUrl: string) {
  const parsed = new URL(sourceUrl);
  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname !== 'ozzxrzyahbnavldyrlms.supabase.co' ||
    !parsed.pathname.startsWith('/storage/v1/object/public/product-images/')
  ) {
    throw new Error('Creative source must be a public product image from the store storage bucket.');
  }
  return parsed.toString();
}

export async function renderSafeFitGoogleImage(
  sourceUrl: string,
  width: number,
  height: number
): Promise<Buffer> {
  const safeSource = assertSourceUrl(sourceUrl);
  const padding = Math.max(36, Math.round(Math.min(width, height) * 0.055));

  const image = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          padding,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={safeSource}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center center',
          }}
        />
      </div>
    ),
    {
      width,
      height,
    }
  );

  return Buffer.from(await image.arrayBuffer());
}
