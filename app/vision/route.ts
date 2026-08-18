import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "Image data missing from request" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ CRITICAL: GEMINI_API_KEY is not set in .env.local!");
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing in .env.local file. Please restart server after adding key." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Analyze this e-commerce product image. Give me 1 to 3 main search keywords for this product (e.g. 'shoes', 'watch', 'tshirt'). Return ONLY the keywords, no extra text, no markdown.";
    
    // Clean base64 header if present
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg"
        }
      }
    ]);

    const keywords = result.response.text().trim().replace(/[*#`]/g, '');
    console.log("✅ AI Detected Keywords:", keywords);

    return NextResponse.json({ keywords });

  } catch (error: any) {
    console.error("❌ Gemini API Backend Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to analyze image with Gemini API" },
      { status: 500 }
    );
  }
}