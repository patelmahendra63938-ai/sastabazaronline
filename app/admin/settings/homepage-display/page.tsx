import { MonitorCog } from 'lucide-react';
import { getHomepageDisplaySettings } from '@/lib/settings/homepage-display';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import HomepageDisplayForm from './HomepageDisplayForm';

export default async function HomepageDisplaySettingsPage() {
  const settings = await getHomepageDisplaySettings();
  const supabase = await createServerSupabaseClient();
  const { data: filters } = await supabase
    .from('storefront_filter_settings')
    .select('id, filter_key, display_name, is_enabled, display_order')
    .order('display_order', { ascending: true });

  return <div className="max-w-4xl space-y-6 p-6">
    <div><h1 className="flex items-center gap-2 text-xl font-bold text-indigo-950"><MonitorCog size={20} className="text-orange-500" />Homepage Display Settings</h1>
      <p className="mt-1 text-xs text-gray-500">Control the main filter panel, individual storefront filters, and marketplace links.</p></div>
    <HomepageDisplayForm initialValue={settings} initialFilters={filters || []} />
  </div>;
}
