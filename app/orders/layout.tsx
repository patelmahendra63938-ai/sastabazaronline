import type { Metadata } from 'next';
import OrderGstInvoicePanel from './OrderGstInvoicePanel';

export const metadata: Metadata = {
  title: 'My Orders',
  robots: {
    index: false,
    follow: true,
  },
};

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <OrderGstInvoicePanel />
    </>
  );
}
