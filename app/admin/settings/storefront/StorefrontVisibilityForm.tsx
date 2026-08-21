'use client';

import { useActionState } from 'react';
import { Eye, Filter, Save, ShoppingBag } from 'lucide-react';
import {
  saveStorefrontVisibility,
  StorefrontVisibilityActionState,
} from './actions';
import type { StorefrontVisibilitySettings } from '@/lib/settings/storefront-visibility';

const initialState: StorefrontVisibilityActionState = {
  status: 'idle',
  message: '',
};

function ToggleRow({
  name,
  title,
  description,
  defaultChecked,
}: {
  name: string;
  title: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-indigo-300">
      <div className="min-w-0">
        <p className="text-sm font-black text-indigo-950">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>
      </div>

      <span className="relative shrink-0">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <span className="block h-7 w-12 rounded-full bg-gray-300 transition peer-checked:bg-green-500" />
        <span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export default function StorefrontVisibilityForm({
  settings,
}: {
  settings: StorefrontVisibilitySettings;
}) {
  const [state, formAction, pending] = useActionState(
    saveStorefrontVisibility,
    initialState
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
          Storefront Control
        </p>
        <h1 className="mt-1 text-2xl font-black text-indigo-950">
          Storefront Visibility
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          Show or hide the storefront filter panel and marketplace links without deleting any saved links or settings.
        </p>
      </div>

      {state.message && (
        <div
          className={`rounded-xl border p-3 text-xs font-bold ${
            state.status === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {state.message}
        </div>
      )}

      <form action={formAction} className="space-y-6">
        <section className="rounded-3xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Filter size={18} />
            </span>
            <div>
              <h2 className="text-base font-black text-indigo-950">
                Product Filter Panel
              </h2>
              <p className="text-xs text-gray-500">
                Controls the full Filters box shown beside the product catalog.
              </p>
            </div>
          </div>

          <ToggleRow
            name="filter_panel_enabled"
            title="Filter Panel"
            description="OFF hides the complete Categories, Price, Size, Brand and other filter box from the storefront."
            defaultChecked={settings.filter_panel_enabled}
          />
        </section>

        <section className="rounded-3xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <ShoppingBag size={18} />
            </span>
            <div>
              <h2 className="text-base font-black text-indigo-950">
                Marketplace Links
              </h2>
              <p className="text-xs text-gray-500">
                Control the complete marketplace section or individual marketplace cards.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <ToggleRow
              name="marketplace_section_enabled"
              title="Marketplace Section"
              description="OFF hides the complete marketplace trust section."
              defaultChecked={settings.marketplace_section_enabled}
            />

            <ToggleRow
              name="amazon_enabled"
              title="Amazon"
              description="Show or hide the Amazon marketplace card."
              defaultChecked={settings.amazon_enabled}
            />

            <ToggleRow
              name="flipkart_enabled"
              title="Flipkart"
              description="Show or hide the Flipkart marketplace card."
              defaultChecked={settings.flipkart_enabled}
            />

            <ToggleRow
              name="meesho_enabled"
              title="Meesho"
              description="Show or hide the Meesho marketplace card."
              defaultChecked={settings.meesho_enabled}
            />
          </div>
        </section>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-950 px-5 py-3 text-xs font-black text-white transition hover:bg-indigo-900 disabled:opacity-50"
        >
          {pending ? <Eye size={16} className="animate-pulse" /> : <Save size={16} />}
          {pending ? 'Saving...' : 'Save Visibility Settings'}
        </button>
      </form>
    </div>
  );
}
