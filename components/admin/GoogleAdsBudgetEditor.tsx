'use client';

import { useMemo, useState } from 'react';
import { updateGoogleAdsProposalBudgetAction } from '@/app/admin/ads/actions';

type Props = {
  proposalId: string;
  initialBudget: number;
  initialDays: number;
  initialLandingUrl: string;
};

export default function GoogleAdsBudgetEditor({
  proposalId,
  initialBudget,
  initialDays,
  initialLandingUrl,
}: Props) {
  const [budget, setBudget] = useState(initialBudget);
  const [days, setDays] = useState(initialDays);
  const [landingUrl, setLandingUrl] = useState(initialLandingUrl);

  const planned = useMemo(() => {
    const safeBudget = Number.isFinite(budget) && budget > 0 ? budget : 0;
    const safeDays = Number.isFinite(days) && days > 0 ? days : 0;
    return safeBudget * safeDays;
  }, [budget, days]);

  return (
    <form action={updateGoogleAdsProposalBudgetAction} className="rounded-2xl border border-[#ead8b8] bg-white p-5">
      <input type="hidden" name="proposalId" value={proposalId} />
      <h3 className="text-sm font-black text-[#5e171b]">Editable test budget</h3>
      <p className="mt-1 text-[11px] leading-5 text-stone-500">
        Budget, test days, and landing page are editable. Any saved change resets the proposal to Draft and needs approval again.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-[11px] font-bold text-stone-600">
          Daily budget (₹)
          <input
            type="number"
            name="dailyBudget"
            min="1"
            step="1"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-[#ead8b8] px-3 py-2 text-sm font-bold text-stone-800 outline-none focus:border-[#741f23]"
          />
        </label>
        <label className="text-[11px] font-bold text-stone-600">
          Test days
          <input
            type="number"
            name="testDays"
            min="1"
            max="365"
            step="1"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-[#ead8b8] px-3 py-2 text-sm font-bold text-stone-800 outline-none focus:border-[#741f23]"
          />
        </label>
      </div>

      <label className="mt-3 block text-[11px] font-bold text-stone-600">
        Ad landing URL
        <input
          type="url"
          name="landingUrl"
          required
          value={landingUrl}
          onChange={(e) => setLandingUrl(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[#ead8b8] px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-[#741f23]"
        />
      </label>

      <div className="mt-3 rounded-xl bg-stone-50 px-3 py-2.5 text-xs text-stone-600">
        Live planned maximum: <strong>₹{planned.toLocaleString('en-IN')}</strong>
      </div>

      <div className="mt-2 text-[11px] text-stone-500">
        Destination preview:{' '}
        <a
          href={landingUrl}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-[#741f23] underline underline-offset-2"
        >
          Open landing page
        </a>
      </div>

      <button type="submit" className="mt-3 rounded-xl bg-[#5e171b] px-4 py-2.5 text-xs font-black text-white">
        Save budget, days & link
      </button>
    </form>
  );
}
