import { MonitorCog } from 'lucide-react';
import { getHomepageDisplaySettings } from '@/lib/settings/homepage-display';
import HomepageDisplayForm from './HomepageDisplayForm';

export default async function HomepageDisplaySettingsPage() {
  const settings = await getHomepageDisplaySettings();
  return <div className="max-w-4xl space-y-6 p-6">
    <div><h1 className="flex items-center gap-2 text-xl font-bold text-indigo-950"><MonitorCog size={20} className="text-orange-500" />Homepage Display Settings</h1>
      <p className="mt-1 text-xs text-gray-500">Control homepage filters and individual marketplace links without changing their existing content.</p></div>
    <HomepageDisplayForm initialValue={settings} />
  </div>;
}
