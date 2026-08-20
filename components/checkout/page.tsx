'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createClient } from '@/lib/supabase/client';
import { createVerifiedOrderAction } from '@/actions/checkout';
import LocationPermissionModal, { LocationResult } from '@/components/checkout/LocationPermissionModal';
import { resolveStorefrontImageSrc } from '@/lib/storefront-image';
import { 
  ShoppingBag, Truck, ShieldCheck, CreditCard, 
  ArrowRight, MapPin, Navigation, Mail, Lock, AlertCircle 
} from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();

  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'QR'>('COD');
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationApplied, setLocationApplied] = useState(false);

  // Form State
  const [authenticatedEmail, setAuthenticatedEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Surat');
  const [state, setState] = useState('Gujarat');
  const [pincode, setPincode] = useState('395006');

  useEffect(() => {
    // 1. Load LocalStorage Cart
    try {
      const saved = localStorage.getItem('sastabazar_cart');
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load cart:', e);
    }

    // 2. Load Authenticated User Email & Profile Server-Side
    async function loadAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAuthenticatedEmail(user.email || '');
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', user.id)
            .single();

          if (profile?.full_name) setFullName(profile.full_name);
          if (profile?.phone) setPhone(profile.phone);
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        setAuthChecking(false);
      }
    }

    loadAuth();
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * (item.quantity || 1), 0);
  const shippingCharge = subtotal >= 499 ? 0 : 49;
  const grandTotal = subtotal + shippingCharge;

  // Handle Location Detected from Modal
  const handleLocationSelected = (loc: LocationResult) => {
    setAddress(loc.address);
    setCity(loc.city);
    setState(loc.state);
    if (loc.pincode) setPincode(loc.pincode);
    setLocationApplied(true);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      alert('Your cart is empty.');
      return;
    }

    if (!authenticatedEmail) {
      alert('Please log in with your email account before placing an order.');
      router.push('/login?redirectTo=/checkout');
      return;
    }

    setLoading(true);

    try {
      const res = await createVerifiedOrderAction({
        cart: cart.map(i => ({ id: i.id, product_id: i.product_id || i.id, quantity: i.quantity || 1 })),
        customer_name: fullName,
        customer_phone: phone,
        address,
        city,
        state,
        pincode,
        paymentMethod
      });

      if (!res.success) {
        alert(res.error || 'Failed to place order. Please try again.');
        setLoading(false);
        return;
      }

      // Clear local cart on success
      localStorage.removeItem('sastabazar_cart');
      window.dispatchEvent(new Event('cartUpdated'));

      router.push(`/order-success/${res.orderId}`);
    } catch (err: any) {
      alert(err.message || 'An error occurred during order submission.');
      setLoading(false);
    }
  };

  if (!authChecking && !authenticatedEmail) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
        <Header />
        <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-950 rounded-2xl flex items-center justify-center mx-auto border">
            <Lock size={28} />
          </div>
          <h2 className="text-xl font-black text-indigo-950">Account Required for Checkout</h2>
          <p className="text-xs text-gray-500">
            Please sign in to link your verified email address to this order and receive tracking updates.
          </p>
          <button
            onClick={() => router.push('/login?redirectTo=/checkout')}
            className="w-full bg-indigo-950 text-white font-bold text-xs py-3.5 rounded-xl hover:bg-indigo-900 transition shadow-md"
          >
            Sign In / Register
          </button>
        </div>
        <Footer />
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col justify-between">
        <Header />
        <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
          <ShoppingBag size={56} className="mx-auto text-gray-300" />
          <h2 className="text-xl font-bold text-gray-800">Your Cart is Empty</h2>
          <p className="text-xs text-gray-500">Add products to your cart before proceeding.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-indigo-950 text-white font-bold text-xs px-6 py-3 rounded-xl hover:bg-indigo-900 transition"
          >
            Browse Products
          </button>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
      <Header />

      {/* Location Permission Modal */}
      <LocationPermissionModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onLocationSelected={handleLocationSelected}
      />

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-indigo-950">Secure Checkout</h1>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Lock size={12} className="text-green-600" /> 256-bit Encrypted
          </span>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Customer & Delivery Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Verified Customer Information */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                <Mail size={16} className="text-indigo-600" /> 1. Customer Account
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1 text-[10px]">Verified Account Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      readOnly
                      value={authenticatedEmail}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 font-mono text-xs cursor-not-allowed select-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md">
                      Verified
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">This email will be permanently recorded with your order.</p>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1 text-[10px]">Contact Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Shipping Address with Location Assistance */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                  <Truck size={16} className="text-indigo-600" /> 2. Delivery Address
                </h2>

                <button
                  type="button"
                  onClick={() => setLocationModalOpen(true)}
                  className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
                >
                  <Navigation size={13} className="text-indigo-600" />
                  <span>{locationApplied ? 'Location Updated' : 'Use Current Location'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 uppercase mb-1 text-[10px]">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Recipient's Name"
                    className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 uppercase mb-1 text-[10px]">Street Address / House No / Area *</label>
                  <textarea
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Flat No, Building, Street, Landmark"
                    className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1 text-[10px]">City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1 text-[10px]">State *</label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 uppercase mb-1 text-[10px]">Pincode *</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Payment Method */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                <CreditCard size={16} className="text-indigo-600" /> 3. Payment Option
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => setPaymentMethod('COD')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition ${paymentMethod === 'COD' ? 'border-indigo-600 bg-indigo-50/40' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <Truck size={20} className={paymentMethod === 'COD' ? 'text-indigo-600' : 'text-gray-400'} />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Cash on Delivery</p>
                      <p className="text-[10px] text-gray-500">Pay cash at doorstep</p>
                    </div>
                  </div>
                  <input type="radio" name="payment" checked={paymentMethod === 'COD'} readOnly className="accent-indigo-600" />
                </label>

                <label
                  onClick={() => setPaymentMethod('QR')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition ${paymentMethod === 'QR' ? 'border-indigo-600 bg-indigo-50/40' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard size={20} className={paymentMethod === 'QR' ? 'text-indigo-600' : 'text-gray-400'} />
                    <div>
                      <p className="text-xs font-bold text-gray-900">Instant UPI QR</p>
                      <p className="text-[10px] text-gray-500">GPay, PhonePe, Paytm</p>
                    </div>
                  </div>
                  <input type="radio" name="payment" checked={paymentMethod === 'QR'} readOnly className="accent-indigo-600" />
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Place Order */}
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-indigo-950 uppercase tracking-wider">
                Order Summary ({cart.length} Items)
              </h2>

              <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 pr-1">
                {cart.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      {item.image && <Image src={resolveStorefrontImageSrc(item.image)} alt="" width={40} height={40} sizes="40px" className="w-10 h-10 object-cover rounded-lg border" />}
                      <div>
                        <p className="font-bold text-gray-800 line-clamp-1">{item.title}</p>
                        <p className="text-[10px] text-gray-400">Qty: {item.quantity || 1}</p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900">₹{Number(item.price) * (item.quantity || 1)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Charges</span>
                  <span>{shippingCharge === 0 ? <strong className="text-green-600">FREE</strong> : `₹${shippingCharge}`}</span>
                </div>
                <div className="flex justify-between font-black text-base text-indigo-950 border-t pt-2">
                  <span>Grand Total</span>
                  <span>₹{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 text-xs shadow-md disabled:opacity-50 active:scale-95"
              >
                {loading ? 'Creating Verified Order...' : 'Confirm & Place Order'}
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-[11px] text-indigo-900 flex items-center gap-2.5">
              <ShieldCheck size={20} className="text-indigo-600 shrink-0" />
              <span>7-Day Replacement Guarantee & Verified Invoicing</span>
            </div>
          </div>

        </form>
      </div>

      <Footer />
    </main>
  );
}
