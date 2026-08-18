import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key missing in environment variables" }, { status: 500 });
    }

    // 🎯 Updated to gemini-2.5-flash
    const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

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
                  mime_type: "image/jpeg",
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
      throw new Error(data?.error?.message || `Google API Error: ${apiResponse.status}`);
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const keywords = rawText.trim().replace(/[*#`"]/g, '');

    return NextResponse.json({ keywords });

  } catch (error: any) {
    console.error("Vision Route Error:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze image" }, { status: 500 });
  }
}