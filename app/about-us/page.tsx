import type { Metadata } from 'next';
import { LegalPage, PolicySection } from '@/components/LegalPage';
import { businessInfo } from '@/lib/business-info';

export const metadata: Metadata = {
  title: 'About Us | SASTABAZARONLINE',
  description: 'Learn about SASTABAZARONLINE, an Indian e-commerce business owned and operated by ADHYEY BROTHERS.',
};

export default function AboutUsPage() {
  return (
    <LegalPage title="About Us">
      <PolicySection title="Who We Are">
        <p>{businessInfo.legalIdentity} We are an Indian e-commerce business serving customers through this website.</p>
      </PolicySection>
      <PolicySection title="What We Offer">
        <p>We sell products displayed in our live catalogue. Depending on current availability, this may include home, kitchen, lifestyle, fashion and other consumer products. The catalogue, product pages and checkout show the products currently offered for sale.</p>
      </PolicySection>
      <PolicySection title="Our Responsibility">
        <p>ADHYEY BROTHERS is responsible for order fulfilment, customer service, shipping, and processing eligible cancellations, returns and refunds in accordance with the policies published on this website and applicable law.</p>
      </PolicySection>
      <PolicySection title="Our Approach">
        <p>We aim to provide clear product, pricing, delivery and support information so customers can make informed purchasing decisions. Product availability, offers and serviceability may change and are shown through the live storefront and checkout.</p>
      </PolicySection>
    </LegalPage>
  );
}
