import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateAuthoritativeOrderPricing } from '@/lib/pricing/pricing-engine';
import {
  customerServiceabilityError,
  verifyLiveServiceability,
} from '@/lib/shipping/live-serviceability';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!/^\d{6}$/.test(String(body.pincode || '').trim()) || !Array.isArray(body.cart) || !body.cart.length) return NextResponse.json({ serviceable: false, message: 'A valid PIN code and non-empty cart are required.' }, { status: 400 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ serviceable: false, message: 'Server pricing is unavailable.' }, { status: 503 });
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const paymentMethod = body.paymentMethod === 'COD' ? 'COD' : 'ONLINE';
    const quote = await calculateAuthoritativeOrderPricing({ db, pincode: body.pincode, paymentMethod, cart: body.cart, couponCode: body.couponCode, useLiveDeliveryPricing: true });
    const liveDelivery = await verifyLiveServiceability({
      db,
      cart: body.cart,
      deliveryPincode: String(body.pincode).trim(),
      paymentMode: paymentMethod === 'COD' ? 'cod' : 'prepaid',
      orderValuePaise: Math.round(quote.discountedSubtotal * 100),
    });

    if (!liveDelivery.serviceable || !liveDelivery.selectedCourier || !liveDelivery.customerPricing) {
      return NextResponse.json({
        serviceable: false,
        message: 'No courier is currently available for this delivery PIN code.',
      });
    }

    const courierName =
      liveDelivery.selectedCourier.courierDisplayName ||
      liveDelivery.selectedCourier.courierName ||
      null;
    const deliveryCharge = liveDelivery.customerPricing.customerDeliveryPaise / 100;
    const codCharge = liveDelivery.customerPricing.customerCodPaise / 100;
    const totalPayablePaise =
      Math.round(quote.discountedSubtotal * 100) +
      liveDelivery.customerPricing.customerDeliveryPaise +
      liveDelivery.customerPricing.customerCodPaise;
    return NextResponse.json({
      originalProductPriceTotal: quote.originalProductPriceTotal,
      discountDeductionAmount: quote.discountDeductionAmount,
      primaryOfferName: quote.primaryOfferName,
      discountedSubtotal: quote.discountedSubtotal,
      actualWeightGrams: quote.actualWeightGrams,
      shipmentWeight: `${quote.actualWeightGrams} g`,
      deliveryCharge,
      shippingCharge: deliveryCharge,
      codCharge,
      totalPayable: totalPayablePaise / 100,
      courierName,
      tatDays: liveDelivery.selectedCourier.tatDays,
      serviceable: true,
      message: courierName
        ? `Delivery available via ${courierName}.`
        : 'Delivery is available for this PIN code.',
    });
  } catch (error) {
    return NextResponse.json(
      { serviceable: false, message: customerServiceabilityError(error) },
      { status: 503 }
    );
  }
}
