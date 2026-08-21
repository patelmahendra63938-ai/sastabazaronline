import StorefrontVisibilityForm from './StorefrontVisibilityForm';
import { getStorefrontVisibilitySetting } from '@/lib/settings/storefront-visibility';

export const dynamic = 'force-dynamic';

export default async function AdminStorefrontSettingsPage() {
  const setting = await getStorefrontVisibilitySetting();

  return <StorefrontVisibilityForm settings={setting.value} />;
}
