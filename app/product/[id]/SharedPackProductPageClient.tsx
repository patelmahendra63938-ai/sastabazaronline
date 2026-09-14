'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { resolveStorefrontImageSrc } from '@/lib/storefront-image';
import { getActiveCampaigns, calculateDiscountedPrice, type Campaign } from '@/lib/promotions';
import { availablePackUnits, SHARED_STOCK_SIZE, type ProductPackOption } from '@/lib/catalog/pack-options';
import { AlertCircle, Check, ChevronLeft, ChevronRight, Minus, Plus, ShoppingCart, Truck, Zap } from 'lucide-react';

type SharedPackProduct = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  brand?: string | null;
  price: number;
  mrp?: number | null;
  images?: string[] | null;
  hsn_code?: string | null;
  gst_rate?: number | null;
  net_weight_grams?: number | null;
  selling_mode?: string | null;
};

type SharedInventory = {
  available_quantity: number;
  sku?: string | null;
};

export default function SharedPackProductPageClient({
  productId,
  initialProduct,
}: {
  productId: string;
  initialProduct: SharedPackProduct;
}) {
  const router = useRouter();
  const [product] = useState(initialProduct);
  const [packOptions, setPackOptions] = useState<ProductPackOption[]>([]);
  const [sharedInventory, setSharedInventory] = useState<SharedInventory | null>(null);
  const [selectedPackId, setSelectedPackId] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pincode, setPincode] = useState('');
  const [deliveryMessage, setDeliveryMessage] = useState('');
  const [checkingPin, setCheckingPin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [packsResult, inventoryResult, promosResult] = await Promise.all([
        supabase.from('product_pack_options').select('id,product_id,label,pieces_per_unit,price,mrp,sku,display_order,is_active').eq('product_id', productId).eq('is_active', true).order('display_order'),
        supabase.from('inventory').select('available_quantity,sku').eq('product_id', productId).eq('size', SHARED_STOCK_SIZE).maybeSingle(),
        supabase.from('promotions').select('*').eq('is_enabled', true),
      ]);

      if (cancelled) return;
      if (packsResult.error) {
        setError('Pack options could not be loaded.');
        setLoading(false);
        return;
      }
      if (inventoryResult.error) {
        setError('Product stock could not be loaded.');
        setLoading(false);
        return;
      }

      const packs = (packsResult.data || []) as ProductPackOption[];
      const inventory = inventoryResult.data as SharedInventory | null;
      setPackOptions(packs);
      setSharedInventory(inventory);
      setCampaigns(getActiveCampaigns((promosResult.data as Campaign[]) || []));

      const physicalStock = Number(inventory?.available_quantity || 0);
      const firstAvailable = packs.find((pack) => availablePackUnits(physicalStock, pack.pieces_per_unit) > 0) || packs[0];
      setSelectedPackId(firstAvailable?.id || '');
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [productId]);

  const activePack = packOptions.find((pack) => pack.id === selectedPackId) || packOptions[0];
  const physicalStock = Number(sharedInventory?.available_quantity || 0);
  const availableUnits = activePack ? availablePackUnits(physicalStock, activePack.pieces_per_unit) : 0;
  const originalPrice = Number(activePack?.price || product.price || 0);
  const mrp = Number(activePack?.mrp || originalPrice);

  const { finalPrice, appliedOffer, availableOffers } = useMemo(() => calculateDiscountedPrice(
    originalPrice,
    campaigns,
    product.category || '',
    product.id,
    undefined,
    selectedCampaignId
  ), [originalPrice, campaigns, product.category, product.id, selectedCampaignId]);

  useEffect(() => {
    setQuantity(1);
    setDeliveryMessage('');
  }, [selectedPackId]);

  useEffect(() => {
    setDeliveryMessage('');
  }, [quantity, selectedCampaignId]);

  const images = (product.images || []).map((src) => resolveStorefrontImageSrc(src));
  const currentImage = images[selectedImage] || resolveStorefrontImageSrc(null);
  const outOfStock = !activePack || availableUnits <= 0;

  const addToCart = () => {
    if (!activePack || outOfStock) return;
    const cartItem = {
      id: product.id,
      product_id: product.id,
      title: product.title,
      price: finalPrice,
      original_price: originalPrice,
      mrp,
      applied_offer_label: appliedOffer?.offerLabel || null,
      selected_campaign_id: appliedOffer?.campaignId || selectedCampaignId || null,
      image: product.images?.[0] || currentImage,
      size: activePack.label,
      pack_option_id: activePack.id,
      pieces_per_unit: Number(activePack.pieces_per_unit),
      sku: activePack.sku || sharedInventory?.sku || undefined,
      weight_kg: Math.max(0.001, (Number(product.net_weight_grams || 0) * Number(activePack.pieces_per_unit)) / 1000),
      quantity,
      hsn_code: product.hsn_code || '6204',
      gst_rate: product.gst_rate || 5,
    };

    const existingCart = JSON.parse(localStorage.getItem('sastabazar_cart') || '[]');
    const existingIndex = existingCart.findIndex((item: any) =>
      (item.id === product.id || item.product_id === product.id) &&
      (item.pack_option_id === activePack.id || (!item.pack_option_id && item.size === activePack.label))
    );

    if (existingIndex >= 0) {
      existingCart[existingIndex].quantity = Math.min(5, Number(existingCart[existingIndex].quantity || 1) + quantity);
      existingCart[existingIndex].price = finalPrice;
      existingCart[existingIndex].original_price = originalPrice;
      existingCart[existingIndex].mrp = mrp;
      existingCart[existingIndex].pack_option_id = activePack.id;
      existingCart[existingIndex].pieces_per_unit = activePack.pieces_per_unit;
    } else {
      existingCart.push(cartItem);
    }

    localStorage.setItem('sastabazar_cart', JSON.stringify(existingCart));
    window.dispatchEvent(new Event('cartUpdated'));
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const buyNow = () => {
    addToCart();
    if (!outOfStock) router.push('/checkout');
  };

  const checkDelivery = async () => {
    if (!activePack || !/^\d{6}$/.test(pincode)) {
      setDeliveryMessage('Enter a valid 6-digit PIN code.');
      return;
    }
    setCheckingPin(true);
    setDeliveryMessage('Checking delivery…');
    try {
      const response = await fetch('/api/shipping/check-pincode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pincode,
          paymentMethod: 'ONLINE',
          cart: [{
            product_id: product.id,
            size: activePack.label,
            pack_option_id: activePack.id,
            quantity,
            selected_campaign_id: appliedOffer?.campaignId || selectedCampaignId || undefined,
          }],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.serviceable) {
        const shippingCharge = Number(data.shippingCharge || 0);
        const totalPayable = Number(data.totalPayable || 0);
        const chargeableWeightKg = Number(data.chargeableWeightGrams || 0) / 1000;
        const shippingLabel = shippingCharge > 0 ? `Shipping ₹${shippingCharge.toLocaleString('en-IN')}` : 'Free shipping';
        const weightLabel = chargeableWeightKg > 0 ? ` • Chargeable wt. ${chargeableWeightKg.toFixed(2)} kg` : '';
        const totalLabel = Number.isFinite(totalPayable) && totalPayable > 0 ? ` • Total ₹${totalPayable.toLocaleString('en-IN')}` : '';
        setDeliveryMessage(`Delivery available • ${shippingLabel}${weightLabel}${totalLabel}`);
      } else {
        setDeliveryMessage(data.message || 'Delivery is not available for this PIN code.');
      }
    } catch {
      setDeliveryMessage('Delivery could not be checked right now.');
    } finally {
      setCheckingPin(false);
    }
  };

  if (loading) {
    return <main className="min-h-screen bg-[#fffaf5]"><Header /><div className="mx-auto max-w-7xl p-8 text-sm font-bold text-gray-500">Loading product options…</div><Footer /></main>;
  }

  if (error || !packOptions.length) {
    return <main className="min-h-screen bg-[#fffaf5]"><Header /><div className="mx-auto max-w-xl p-12 text-center"><AlertCircle className="mx-auto text-red-500" /><h1 className="mt-3 text-xl font-black">Product options unavailable</h1><p className="mt-2 text-sm text-gray-500">{error || 'No active pack options are configured.'}</p></div><Footer /></main>;
  }

  return (
    <main className="min-h-screen bg-[#fffaf5] pb-24 lg:pb-0">
      <Header />
      <div className="mx-auto max-w-7xl px-3 py-4 md:px-6 md:py-8">
        <nav className="mb-4 flex items-center gap-2 text-xs text-gray-500"><Link href="/">Home</Link><ChevronRight size={13} /><Link href={`/category/${encodeURIComponent(product.category)}`}>{product.category}</Link><ChevronRight size={13} /><span className="truncate font-bold text-gray-800">{product.title}</span></nav>

        <div className="grid grid-cols-1 gap-6 rounded-3xl border border-[#ead8b8] bg-white p-4 shadow-sm lg:grid-cols-2 lg:p-8">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-[#ead8b8] bg-[#fffaf5]">
              <Image src={currentImage} alt={product.title} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain" priority />
              {images.length > 1 && <><button type="button" onClick={() => setSelectedImage((selectedImage - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 rounded-full bg-white/90 p-2 shadow"><ChevronLeft /></button><button type="button" onClick={() => setSelectedImage((selectedImage + 1) % images.length)} className="absolute right-3 top-1/2 rounded-full bg-white/90 p-2 shadow"><ChevronRight /></button></>}
            </div>
            {images.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{images.map((image, index) => <button key={image} type="button" onClick={() => setSelectedImage(index)} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${index === selectedImage ? 'border-[#741f23]' : 'border-[#ead8b8]'}`}><Image src={image} alt="" fill sizes="64px" className="object-cover" /></button>)}</div>}
          </div>

          <div className="space-y-5">
            <div><p className="text-[11px] font-black uppercase tracking-widest text-[#b5843d]">{product.brand || 'Product'}</p><h1 className="mt-1 text-2xl font-black leading-tight text-gray-900 md:text-3xl">{product.title}</h1></div>

            <div className="rounded-2xl border border-[#ead8b8] bg-[#fffdf9] p-4">
              {appliedOffer && <p className="mb-1 text-xs font-black text-green-700">{appliedOffer.offerLabel}</p>}
              <div className="flex items-baseline gap-3"><span className="text-3xl font-black text-[#741f23]">₹{finalPrice.toLocaleString('en-IN')}</span>{mrp > finalPrice && <span className="text-sm font-bold text-gray-400 line-through">₹{mrp.toLocaleString('en-IN')}</span>}</div>
              <p className="mt-1 text-[10px] font-semibold text-gray-500">Inclusive of GST ({product.gst_rate ?? 5}%)</p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between"><label className="text-xs font-black uppercase tracking-wider text-gray-800">Choose Pack / Set</label><span className="text-[11px] font-bold text-green-700">{availableUnits > 0 ? `${availableUnits} packs available` : 'Out of stock'}</span></div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{packOptions.map((pack) => {
                const units = availablePackUnits(physicalStock, pack.pieces_per_unit);
                const selected = pack.id === activePack?.id;
                return <button key={pack.id} type="button" disabled={units <= 0} onClick={() => setSelectedPackId(pack.id)} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${selected ? 'border-[#741f23] bg-[#fff2dc] ring-2 ring-[#741f23]/10' : 'border-[#ead8b8] bg-white'} disabled:cursor-not-allowed disabled:opacity-40`}><div><p className="text-xs font-black text-gray-900">{pack.label}</p><p className="text-[10px] text-gray-500">{pack.pieces_per_unit} physical pieces</p></div><strong className="text-sm text-[#741f23]">₹{Number(pack.price).toLocaleString('en-IN')}</strong></button>;
              })}</div>
            </div>

            {availableOffers.length > 0 && <div className="rounded-2xl border border-green-200 bg-green-50 p-3"><p className="mb-2 text-[11px] font-black uppercase text-green-800">Available offers</p><div className="flex flex-wrap gap-2">{availableOffers.map((offer) => <button key={offer.campaignId} type="button" onClick={() => setSelectedCampaignId(offer.campaignId)} className={`rounded-lg border px-3 py-2 text-[11px] font-bold ${appliedOffer?.campaignId === offer.campaignId ? 'border-green-700 bg-white text-green-800' : 'border-green-200 text-green-700'}`}>{offer.offerLabel} · ₹{offer.finalPrice.toLocaleString('en-IN')}</button>)}</div></div>}

            <div className="flex items-center gap-3"><span className="text-xs font-black uppercase">Quantity</span><div className="flex items-center overflow-hidden rounded-xl border border-[#ead8b8]"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2"><Minus size={15} /></button><span className="min-w-10 text-center text-sm font-black">{quantity}</span><button type="button" disabled={quantity >= Math.min(5, availableUnits)} onClick={() => setQuantity(Math.min(5, availableUnits, quantity + 1))} className="p-2 disabled:opacity-30"><Plus size={15} /></button></div><span className="text-[10px] text-gray-500">1 quantity = {activePack?.pieces_per_unit} pieces</span></div>

            <div className="grid grid-cols-2 gap-3"><button type="button" disabled={outOfStock} onClick={addToCart} className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#741f23] px-4 py-3 text-xs font-black text-[#741f23] disabled:opacity-40">{added ? <Check size={17} /> : <ShoppingCart size={17} />}{added ? 'Added' : 'Add to Cart'}</button><button type="button" disabled={outOfStock} onClick={buyNow} className="flex items-center justify-center gap-2 rounded-xl bg-[#741f23] px-4 py-3 text-xs font-black text-white disabled:opacity-40"><Zap size={17} /> Buy Now</button></div>

            <div className="rounded-2xl border border-[#ead8b8] p-3"><div className="flex gap-2"><input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Delivery PIN code" className="min-w-0 flex-1 rounded-xl border border-[#ead8b8] px-3 py-2 text-xs" /><button type="button" onClick={checkDelivery} disabled={checkingPin} className="flex items-center gap-1 rounded-xl bg-[#fff2dc] px-3 text-xs font-black text-[#741f23]"><Truck size={14} /> {checkingPin ? 'Checking' : 'Check'}</button></div>{deliveryMessage && <p className="mt-2 text-[11px] font-semibold text-gray-600">{deliveryMessage}</p>}</div>
          </div>
        </div>

        <section className="mt-6 rounded-3xl border border-[#ead8b8] bg-white p-5 md:p-7"><h2 className="text-lg font-black text-[#741f23]">Product Details</h2><div className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-700">{product.description || 'Product details will be updated soon.'}</div></section>
      </div>
      <Footer />
    </main>
  );
}
