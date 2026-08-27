import {
  Boxes,
  IndianRupee,
  PackageCheck,
  PhoneCall,
  Truck,
} from 'lucide-react';
import { BUSINESS_INFO } from '@/lib/business-info';

const benefits = [
  {
    title: 'Better Bulk Pricing',
    detail: 'Larger-quantity orders may qualify for improved pricing based on product and quantity.',
    icon: IndianRupee,
  },
  {
    title: 'Combined Shipping Value',
    detail: 'Multiple items in one order can be shipped together, helping reduce per-item delivery cost.',
    icon: Truck,
  },
  {
    title: 'Business & Reseller Orders',
    detail: 'Suitable for boutiques, resellers, events and repeat business purchases.',
    icon: Boxes,
  },
];

export default function BulkWholesaleAdvantage() {
  return (
    <section
      aria-labelledby="bulk-wholesale-heading"
      className="overflow-hidden rounded-3xl border border-[#ead8b8] bg-[#fff7e8] shadow-xs"
    >
      <div className="grid gap-0 lg:grid-cols-[1.15fr_1.85fr]">
        <div className="bg-[#741f23] p-6 text-white sm:p-8">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-[#f0c987]">
            <PackageCheck size={22} aria-hidden="true" />
          </div>

          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-[#f0c987]">
            Buy More, Get Better Value
          </p>

          <h2
            id="bulk-wholesale-heading"
            className="mt-2 text-2xl font-black tracking-tight sm:text-3xl"
          >
            Bulk & Business Orders
          </h2>

          <p className="mt-3 max-w-md text-xs leading-relaxed text-[#f4dfbf] sm:text-sm">
            Planning a larger purchase? Contact us before ordering. We can review quantity,
            product availability, applicable bulk pricing and combined shipping options.
          </p>

          <a
            href={BUSINESS_INFO.officePhoneHref}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#f0c987] px-4 py-2.5 text-xs font-black text-[#741f23] transition hover:bg-white"
          >
            <PhoneCall size={15} aria-hidden="true" />
            Call for Bulk Order
          </a>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-6">
          {benefits.map(({ title, detail, icon: Icon }) => (
            <div
              key={title}
              className="rounded-2xl border border-[#ead8b8] bg-white p-4 shadow-2xs"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#fff2dc] text-[#741f23]">
                <Icon size={18} aria-hidden="true" />
              </div>
              <h3 className="mt-3 text-xs font-black text-[#741f23]">{title}</h3>
              <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">{detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#ead8b8] bg-white px-4 py-3 text-center text-[10px] leading-relaxed text-gray-500 sm:text-[11px]">
        Bulk pricing is not automatic on every item and depends on product, quantity and availability.
        Shipping charges depend on the combined shipment weight and delivery location.
      </div>
    </section>
  );
}
