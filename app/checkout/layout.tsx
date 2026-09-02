import type { Metadata } from 'next';
import CheckoutGstInvoiceOption from './CheckoutGstInvoiceOption';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: {
    index: false,
    follow: true,
  },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <CheckoutGstInvoiceOption />
    </>
  );
}
