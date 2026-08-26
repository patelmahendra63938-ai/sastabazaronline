import { NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/api/admin-authorization';

const MAX_BASE64_CHARACTERS = 10_000_000;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export async function POST(req: Request) {
  const admin = await requireAdminApiSession();
  if (!admin.authorized) return admin.response;

  try {
    const body = await req.json().catch(() => null);
    const imageBase64 =
      body && typeof body === 'object' && 'imageBase64' in body
        ? body.imageBase64
        : null;
    if (typeof imageBase64 !== 'string' || !imageBase64) {
      return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
    }

    if (imageBase64.length > MAX_BASE64_CHARACTERS) {
      return NextResponse.json({ error: 'The image is too large.' }, { status: 413 });
    }

    const dataUrlMatch = imageBase64.match(
      /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/
    );
    const mimeType = dataUrlMatch?.[1] || 'image/jpeg';
    const base64Data = dataUrlMatch?.[2] || imageBase64;

    if (!BASE64_PATTERN.test(base64Data)) {
      return NextResponse.json({ error: 'Invalid image data.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Image analysis is not configured.' }, { status: 503 });
    }

    // 🎯 Updated to gemini-2.5-flash
    const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Analyze this e-commerce product image. Give me 1 to 3 simple search keywords for this product (e.g. 'shoes', 'watch', 'tshirt'). Return ONLY keywords, no markdown, no quotes."
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ]
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error('Gemini image analysis failed.', {
        status: apiResponse.status,
      });
      return NextResponse.json(
        { error: 'Image analysis is temporarily unavailable.' },
        { status: 502 }
      );
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const keywords = rawText.trim().replace(/[*#`"]/g, '');

    return NextResponse.json({ keywords });

  } catch (error: unknown) {
    console.error('Vision route failed.', error);
    return NextResponse.json({ error: 'Failed to analyze the image.' }, { status: 500 });
  }
}
