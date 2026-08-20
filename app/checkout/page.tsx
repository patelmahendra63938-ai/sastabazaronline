'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useRouter } from 'next/navigation';
import { createVerifiedOrderAction } from '@/actions/checkout';
import { 
  ShieldCheck, Truck, CreditCard, CheckCircle2, ArrowLeft, 
  Loader2, User, Phone, QrCode, Trash2, ShoppingBag, 
  Navigation, FileText, Tag, AlertCircle, Check, XCircle, RefreshCw 
} from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<any[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [itemToRemove, setItemToRemove] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    city: 'Surat',
    pincode: '',
    paymentMethod: 'COD',
    upiRefId: ''
  });

  // Automated NimbusPost Courier Rate & Verification States
  const [isPincodeVerified, setIsPincodeVerified] = useState<boolean>(false);
  const [isCheckingPin, setIsCheckingPin] = useState<boolean>(false);
  const [pinStatus, setPinStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable' | 'error'>('idle');
  const [quote, setQuote] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('sastabazar_cart');
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch {
          setCart([]);
        }
      }
      setIsCartLoaded(true);
    }
  }, []);

  // Display-only cart subtotal until the server returns an authoritative quote.
  let originalProductPriceTotal = 0;
  let discountedSubtotal = 0;
  let primaryOfferName: string | null = null;

  for (const item of cart) {
    const qty = Number(item.quantity) || 1;
    const origPrice = Number(item.original_price || item.mrp || item.price || 0);
    const itemPrice = Number(item.price || 0);

    originalProductPriceTotal += origPrice * qty;
    discountedSubtotal += itemPrice * qty;

    if (item.applied_offer_label && !primaryOfferName) {
      primaryOfferName = item.applied_offer_label;
    }
  }

  const hasSaleDiscount = quote ? quote.discountDeductionAmount > 0 : originalProductPriceTotal > discountedSubtotal;
  const discountDeductionAmount = Math.max(0, originalProductPriceTotal - discountedSubtotal);

  const displayOriginalTotal = quote?.originalProductPriceTotal ?? originalProductPriceTotal;
  const displaySubtotal = quote?.discountedSubtotal ?? discountedSubtotal;
  const displayDiscount = quote?.discountDeductionAmount ?? discountDeductionAmount;
  const grandTotal = quote?.totalPayable ?? displaySubtotal;

  // 2. Real-Time PIN Code Check with API Route & Fallback
  const handleCheckPincode = useCallback(async (pinToCheck?: string, paymentOverride?: 'COD' | 'ONLINE') => {
    const targetPin = (pinToCheck || formData.pincode).trim();

    if (!targetPin || targetPin.length !== 6 || !/^\d{6}$/.test(targetPin)) {
      setPinStatus('error');
      setStatusMessage('Please enter a valid 6-digit delivery PIN code.');
      setIsPincodeVerified(false);
      setQuote(null);
      return;
    }

    if (cart.length === 0) {
      return;
    }

    setIsCheckingPin(true);
    setPinStatus('checking');
    setStatusMessage('Verifying authoritative delivery pricing...');
    setQuote(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/shipping/check-pincode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pincode: targetPin,
          cart: cart.map(item => ({ product_id: item.product_id || item.id, size: item.size, quantity: item.quantity, selected_campaign_id: item.selected_campaign_id })),
          paymentMethod: paymentOverride || formData.paymentMethod
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        const failed = await res.json().catch(() => ({}));
        throw new Error(failed.message || `Pricing check returned ${res.status}`);
      }

      const data = await res.json();

      if (data.serviceable === true) {
        setPinStatus('available');
        setIsPincodeVerified(true);
        setQuote(data);
        setStatusMessage(data.message);
      } else {
        setPinStatus('unavailable');
        setIsPincodeVerified(false);
        setQuote(null);
        setStatusMessage(data.message || '✕ Delivery is not available to this PIN code. Please enter another delivery PIN code.');
      }
    } catch (err: any) {
      setPinStatus('error');
      setIsPincodeVerified(false);
      setQuote(null);
      setStatusMessage(err.message || 'Authoritative pricing could not be verified.');
    } finally {
      setIsCheckingPin(false);
    }
  }, [formData.pincode, formData.paymentMethod, cart]);

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 6);
    setFormData(prev => ({ ...prev, pincode: rawVal }));
    
    setIsPincodeVerified(false);
    setPinStatus('idle');
    setQuote(null);
    setStatusMessage('');
    setErrorMsg(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePaymentMethodChange = (method: 'COD' | 'ONLINE') => {
    setFormData(prev => ({ ...prev, paymentMethod: method }));
    if (isPincodeVerified && formData.pincode.length === 6) {
      handleCheckPincode(formData.pincode, method);
    }
  };

  const handleRemoveItem = (itemToRemoveId: string, itemSize?: string) => {
    const updatedCart = cart.filter(item => {
      const idMatch = (item.id || item.product_id) === itemToRemoveId;
      const sizeMatch = itemSize ? item.size === itemSize : true;
      return !(idMatch && sizeMatch);
    });
    setCart(updatedCart);
    localStorage.setItem('sastabazar_cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('cartUpdated'));
    setItemToRemove(null);

    setIsPincodeVerified(false);
    setPinStatus('idle');
    setQuote(null);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
          );
          const data = await res.json();
          if (data && data.display_name) {
            const detectedPin = data.address?.postcode?.replace(/\D/g, '').slice(0, 6) || formData.pincode;
            setFormData(prev => ({
              ...prev,
              address: data.display_name,
              pincode: detectedPin,
              city: data.address?.city || data.address?.town || 'Surat'
            }));

            if (detectedPin.length === 6) {
              handleCheckPincode(detectedPin);
            }
          }
        } catch {
          alert('Could not resolve location automatically. Please enter your address manually.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        alert('Unable to retrieve GPS location.');
      }
    );
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      setErrorMsg('Your cart is empty.');
      return;
    }

    if (!isPincodeVerified || pinStatus !== 'available' || !quote) {
      setErrorMsg('Please verify delivery availability for your PIN code before proceeding to payment.');
      return;
    }

    if (formData.paymentMethod === 'ONLINE' && !formData.upiRefId.trim()) {
      setErrorMsg('Please enter your 12-digit UPI Reference / UTR ID after scanning the QR code.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await createVerifiedOrderAction({
        customer_name: formData.fullName.trim(),
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        customer_phone: formData.phone.trim(),
        email: formData.email.trim(),
        customer_email: formData.email.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        pincode: formData.pincode.trim(),
        paymentMethod: formData.paymentMethod === 'ONLINE' ? 'ONLINE' : 'COD',
        upiRefId: formData.upiRefId.trim(),
        cart
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to place order.');
      }

      setOrderId(result.orderNumber || '');
      setOrderPlaced(true);
      localStorage.removeItem('sastabazar_cart');
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place order.');
    } finally {
      setLoading(false);
    }
  };

  const storeUpiId = 'adhyeybrothers@okicici';
  const upiPaymentUrl = `upi://pay?pa=${storeUpiId}&pn=AdhyeyBrothers&am=${grandTotal}&cu=INR`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiPaymentUrl)}`;

  if (orderPlaced) {
    return (
      <main className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between font-sans">
        <Header />
        <div className="flex-1 max-w-xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-2xl font-black text-indigo-950">Order Placed Successfully!</h1>
          <p className="text-sm text-gray-600">
            Thank you for shopping with SASTABAZARONLINE. Your verified order reference is{' '}
            <span className="font-mono font-bold text-indigo-950">{orderId}</span>.
          </p>
          <div className="pt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              href={`/orders/${orderId}`}
              className="bg-indigo-950 hover:bg-indigo-900 text-white font-bold py-3.5 px-8 rounded-xl transition shadow-md text-xs uppercase tracking-wider"
            >
              Track My Order
            </Link>
            <Link 
              href="/" 
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-8 rounded-xl transition shadow-md text-xs uppercase tracking-wider"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  if (isCartLoaded && cart.length === 0) {
    return (
      <main className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between font-sans">
        <Header />
        <div className="flex-1 max-w-md mx-auto px-4 py-24 text-center space-y-4">
          <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <ShoppingBag size={36} />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Your cart is empty</h2>
          <p className="text-xs text-gray-500">You have no items in your checkout summary.</p>
          <Link 
            href="/" 
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition shadow text-xs uppercase tracking-wider"
          >
            Continue Shopping
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FB] flex flex-col justify-between font-sans pb-16">
      <div>
        <Header />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <Link 
            href="/cart" 
            className="inline-flex items-center gap-2 text-xs font-bold text-indigo-950 mb-6 hover:underline bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-2xs"
          >
            <ArrowLeft size={16} /> Back to Cart
          </Link>

          <h1 className="text-2xl font-black text-indigo-950 mb-6">Secure Checkout</h1>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: Customer Details & PIN Verification */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <h2 className="text-sm font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                    <User size={18} className="text-indigo-600" /> 1. Customer & Delivery Address
                  </h2>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={locating}
                    className="flex items-center gap-1.5 text-xs font-bold bg-indigo-50 text-indigo-900 hover:bg-indigo-100 px-3 py-2 rounded-xl transition border border-indigo-200 cursor-pointer"
                  >
                    {locating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                    <span>{locating ? 'Detecting...' : 'Use Current Location'}</span>
                  </button>
                </div>

                <form onSubmit={handlePlaceOrder} id="checkout-form" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name *</label>
                      <div className="relative">
                        <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          name="fullName"
                          required
                          value={formData.fullName}
                          onChange={handleChange}
                          placeholder="Recipient full name"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-indigo-950 focus:outline-hidden bg-gray-50 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone Number *</label>
                      <div className="relative">
                        <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          name="phone"
                          required
                          maxLength={10}
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="10-digit mobile number"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-mono font-medium focus:ring-2 focus:ring-indigo-950 focus:outline-hidden bg-gray-50 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="customer@example.com"
                      className="w-full px-3 py-2.5 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-indigo-950 focus:outline-hidden bg-gray-50 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Delivery Address *</label>
                    <textarea
                      name="address"
                      required
                      rows={3}
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Flat/House No, Building, Street, Landmark"
                      className="w-full px-3 py-2.5 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-indigo-950 focus:outline-hidden bg-gray-50 focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">City *</label>
                      <input
                        type="text"
                        name="city"
                        required
                        value={formData.city}
                        onChange={handleChange}
                        className="w-full px-3 py-2.5 rounded-xl border text-xs font-medium focus:ring-2 focus:ring-indigo-950 focus:outline-hidden bg-gray-50 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Delivery PIN Code *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="pincode"
                          maxLength={6}
                          required
                          value={formData.pincode}
                          onChange={handlePincodeChange}
                          placeholder="e.g. 395007"
                          className="flex-1 px-3 py-2.5 rounded-xl border text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-950 focus:outline-hidden bg-gray-50 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleCheckPincode()}
                          disabled={isCheckingPin || formData.pincode.length !== 6}
                          className="px-4 py-2.5 bg-indigo-950 hover:bg-indigo-900 text-white font-bold text-xs rounded-xl transition disabled:opacity-40 cursor-pointer shrink-0 flex items-center gap-1.5"
                        >
                          {isCheckingPin ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>Checking...</span>
                            </>
                          ) : isPincodeVerified ? (
                            <>
                              <RefreshCw size={13} />
                              <span>Recheck</span>
                            </>
                          ) : (
                            <span>Check Delivery</span>
                          )}
                        </button>
                      </div>

                      <div className="mt-2">
                        {pinStatus === 'checking' && (
                          <p className="text-[11px] font-semibold text-gray-500 animate-pulse">
                            Checking delivery availability with courier partner...
                          </p>
                        )}
                        {pinStatus === 'available' && (
                          <div className="p-2.5 bg-green-50 border border-green-200 rounded-xl text-green-800 text-xs font-bold flex items-center gap-2">
                            <Check size={15} className="text-green-600 shrink-0" />
                            <span>{statusMessage}</span>
                          </div>
                        )}
                        {pinStatus === 'unavailable' && (
                          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                            <XCircle size={15} className="text-red-600 shrink-0" />
                            <span>{statusMessage}</span>
                          </div>
                        )}
                        {pinStatus === 'error' && (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-2">
                            <AlertCircle size={15} className="text-amber-600 shrink-0" />
                            <span>{statusMessage}</span>
                          </div>
                        )}
                        {pinStatus === 'idle' && formData.pincode.length === 6 && !isPincodeVerified && (
                          <p className="text-[11px] font-bold text-orange-600">
                            Click &quot;Check Delivery&quot; to calculate shipping and enable order placement.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">
                      2. Payment Method
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label 
                        onClick={() => handlePaymentMethodChange('COD')}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${
                          formData.paymentMethod === 'COD' ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          value="COD" 
                          checked={formData.paymentMethod === 'COD'} 
                          onChange={() => handlePaymentMethodChange('COD')}
                          className="text-indigo-600"
                        />
                        <div>
                          <span className="block text-xs font-bold text-gray-900">Cash on Delivery</span>
                          <span className="block text-[10px] text-gray-500">Pay cash at doorstep</span>
                        </div>
                      </label>

                      <label 
                        onClick={() => handlePaymentMethodChange('ONLINE')}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${
                          formData.paymentMethod === 'ONLINE' ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          value="ONLINE" 
                          checked={formData.paymentMethod === 'ONLINE'} 
                          onChange={() => handlePaymentMethodChange('ONLINE')}
                          className="text-indigo-600"
                        />
                        <div>
                          <span className="block text-xs font-bold text-gray-900">Scan QR & Pay Online</span>
                          <span className="block text-[10px] text-gray-500">GPay, PhonePe, Paytm, UPI</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {formData.paymentMethod === 'ONLINE' && (
                    <div className="p-6 bg-indigo-50/80 border-2 border-indigo-200 rounded-2xl text-center space-y-4">
                      <div className="flex items-center justify-center gap-2 text-indigo-950 font-bold text-sm">
                        <QrCode size={20} className="text-orange-500" />
                        <span>Scan to Pay: <b className="text-orange-600 font-black text-base">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b></span>
                      </div>
                      <div className="w-48 h-48 bg-white p-2 rounded-xl border mx-auto flex items-center justify-center shadow-sm">
                        <img src={qrCodeImageUrl} alt="UPI QR" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-[11px] text-gray-600">UPI ID: <span className="font-mono font-bold text-indigo-950">{storeUpiId}</span></p>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Enter UPI Reference / UTR ID *</label>
                        <input
                          type="text"
                          name="upiRefId"
                          required={formData.paymentMethod === 'ONLINE'}
                          value={formData.upiRefId}
                          onChange={handleChange}
                          placeholder="e.g. 4235xxxxxxxx"
                          className="w-full max-w-sm mx-auto px-4 py-2.5 bg-white rounded-xl border text-xs font-mono text-center outline-none focus:ring-2 focus:ring-indigo-950"
                        />
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Right: Order Summary with Weight-Based Shipping & Separate COD */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm sticky top-24 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <h3 className="text-base font-bold text-gray-900">Order Summary ({cart.length} items)</h3>
                  <span className="text-[11px] font-mono font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200">
                    GSTIN: 24AKBPD1704F1Z1
                  </span>
                </div>

                {/* Items List */}
                <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto pr-1">
                  {cart.map((item) => {
                    const itemId = item.id || item.product_id;
                    const itemPrice = Number(item.price) || 0;
                    const itemQty = Number(item.quantity) || 1;
                    return (
                      <div key={`${itemId}-${item.size}`} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img 
                            src={item.image || (item.images ? item.images[0] : 'https://via.placeholder.com/150')} 
                            alt={item.title} 
                            className="w-12 h-12 object-cover rounded-xl border border-gray-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-gray-900 truncate">{item.title}</h4>
                            <p className="text-[11px] text-gray-500 font-medium">
                              Size: <span className="font-bold text-gray-800">{item.size || 'Free Size'}</span> • Qty: {itemQty} × ₹{itemPrice.toLocaleString('en-IN')}
                            </p>
                            {item.applied_offer_label && (
                              <span className="text-[10px] font-bold text-green-700 flex items-center gap-1 mt-0.5">
                                <Tag size={11} /> {item.applied_offer_label}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-black text-indigo-950">₹{(itemPrice * itemQty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          <button
                            type="button"
                            onClick={() => setItemToRemove(item)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Price Breakdown */}
                <div className="border-t border-gray-100 pt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Product Price</span>
                    <span className="font-bold text-gray-900">
                      ₹{displayOriginalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {hasSaleDiscount && (
                    <div className="flex justify-between text-green-700 font-bold bg-green-50/80 px-2.5 py-1.5 rounded-xl border border-green-200">
                      <span>{primaryOfferName || 'Festival Sale — 10% OFF'}</span>
                      <span>-₹{displayDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-700 font-semibold pt-1 border-t border-gray-100">
                    <span>Subtotal</span>
                    <span className="font-bold text-gray-900">
                      ₹{displaySubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>Shipment Weight</span>
                    <span className="font-bold text-gray-800">{quote ? `${quote.actualWeightGrams} g` : 'Pending PIN check'}</span>
                  </div>

                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>Delivery Charge</span>
                    <span className="font-bold text-gray-900">
                      {isCheckingPin ? (
                        <span className="text-gray-400 font-normal">Calculating...</span>
                      ) : !quote ? (
                        <span className="text-orange-600 font-bold">Pending PIN check</span>
                      ) : (
                        `₹${quote.shippingCharge.toFixed(2)}`
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>COD Charge</span>
                    <span className="font-bold text-gray-900">
                      {quote ? `₹${quote.codCharge.toFixed(2)}` : 'Pending PIN check'}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-3 flex justify-between items-baseline text-sm font-black text-indigo-950">
                    <span>Total Payable Amount</span>
                    <span className="text-base text-orange-600 font-black">
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  form="checkout-form"
                  disabled={loading || cart.length === 0 || !quote || !isPincodeVerified || pinStatus !== 'available' || isCheckingPin}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Verifying & Placing Order...</span>
                    </>
                  ) : !isPincodeVerified ? (
                    <>
                      <Truck size={16} />
                      <span>Verify PIN to Proceed</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Confirm & Place Order (₹{grandTotal.toLocaleString('en-IN')})</span>
                    </>
                  )}
                </button>

                <div className="bg-indigo-50/80 rounded-2xl p-3 border border-indigo-100 text-[11px] text-indigo-950 space-y-1">
                  <p className="flex items-center gap-1.5 font-bold">
                    <FileText size={14} className="text-orange-500" /> Tax Breakdown Info:
                  </p>
                  <p className="text-gray-600 text-[10px]">
                    All prices are inclusive of GST. Official tax invoice generated under <b>24AKBPD1704F1Z1</b>.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {itemToRemove && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-900">Remove from cart?</h3>
            <p className="text-xs text-gray-600">
              Are you sure you want to remove <span className="font-bold text-gray-900">{itemToRemove.title} ({itemToRemove.size || 'Free Size'})</span> from your checkout?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToRemove(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRemoveItem(itemToRemove.id || itemToRemove.product_id, itemToRemove.size)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition shadow cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
