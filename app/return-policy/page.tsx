import { permanentRedirect } from 'next/navigation';

export default function LegacyReturnPolicyPage() {
  permanentRedirect('/refund-policy');
}
