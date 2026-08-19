import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { pincode, totalWeightKg, subtotal, paymentType } = await request.json();

    if (!pincode || pincode.length !== 6) {
      return NextResponse.json({ serviceable: false, message: 'Invalid PIN code format.' }, { status: 400 });
    }

    // સર્વર-સાઇડ એન્વાયર્નમેન્ટ વેરીએબલમાંથી કી મેળવો (સુરક્ષિત રીતે)
    const apiToken = process.env.NIMBUSPOST_API_TOKEN;

    // જો તમારી પાસે લાઈવ કુરિયર API કી હોય તો અહીં કુરિયર કંપનીનું API કૉલ કરો:
    /*
    const courierRes = await fetch('https://api.nimbuspost.com/v1/shipment/serviceability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        destination_pincode: pincode,
        weight: totalWeightKg,
        payment_type: paymentType
      })
    });
    const courierData = await courierRes.json();
    */

    // વજન આધારિત સ્લેબ ગણતરી (જે તમારા નિયમ મુજબ છે)
    const grams = totalWeightKg * 1000;
    let rate = 80;
    if (grams <= 500) rate = 80;
    else if (grams <= 1000) rate = 110;
    else if (grams <= 2000) rate = 140;
    else rate = 140;

    return NextResponse.json({
      serviceable: true,
      rate: rate,
      displayWeight: `${Math.max(0.5, totalWeightKg).toFixed(2)} kg`,
      courierPartnerName: 'Standard Express'
    });

  } catch (error: any) {
    return NextResponse.json({ serviceable: false, message: 'Serviceability check failed temporarily.' }, { status: 500 });
  }
}