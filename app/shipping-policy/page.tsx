import type { Metadata } from 'next';
import LegalPage, { BusinessContact } from '@/components/legal/LegalPage';
export const metadata: Metadata = { title: 'Shipping Policy' };
export default function ShippingPolicyPage() { return <LegalPage title="Shipping Policy">
  <section><h2>Order processing</h2><p>Orders are normally processed within 24–48 hours after successful order confirmation, excluding holidays or circumstances requiring customer verification.</p></section>
  <section><h2>Delivery estimate</h2><p>Standard delivery is normally completed within 3–7 business days after dispatch. Delivery times are estimates and may vary because of courier operations, destination serviceability, weather, public disruptions, or other external conditions.</p></section>
  <section><h2>Tracking</h2><p>When tracking is available, details and delivery updates are shared through the email and/or SMS channels supplied with the order.</p></section>
  <section><h2>Shipping charges</h2><p>Any applicable shipping charge is displayed before order confirmation. Please verify the delivery address and charges before placing the order.</p></section><BusinessContact />
</LegalPage>; }
