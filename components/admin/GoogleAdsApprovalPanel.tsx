import { ShieldCheck, CircleAlert, CheckCircle2, XCircle } from 'lucide-react';
import GoogleAdsBudgetEditor from '@/components/admin/GoogleAdsBudgetEditor';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  approveGoogleAdsProposalAction,
  rejectGoogleAdsProposalAction,
  updateGoogleAdsProposalBudgetAction,
} from '@/app/admin/ads/actions';

type ProposalSettings = {
  goal?: string;
  campaign_type?: string;
  products?: string;
  minimum_price_inr?: number;
  daily_budget_inr?: number;
  first_7_day_max_spend_inr?: number;
  test_days?: number;
  planned_max_spend_inr?: number;
  bidding?: string;
  cpa_monitoring_target_inr?: number;
  primary_conversion?: string;
  target_country?: string;
  excluded_states?: string[];
  gender?: string;
  ages?: string[];
  audience_signal?: string;
  search_themes?: string[];
  schedule?: string[];
  ios_exclusion?: string;
  first_7_days_budget_increase?: boolean;
  approval_mode?: boolean;
  landing_url?: string;
};

function statusBadge(status: string) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700';
  if (status === 'rejected') return 'bg-red-50 text-red-700';
  if (status === 'applied') return 'bg-blue-50 text-blue-700';
  if (status === 'failed') return 'bg-red-50 text-red-700';
  return 'bg-amber-50 text-amber-700';
}

export default async function GoogleAdsApprovalPanel() {
  const supabase = await createServerSupabaseClient();

  const { data: proposal } = await supabase
    .from('google_ads_proposals')
    .select('*')
    .eq('slug', 'dhoti-choli-pmax-v1')
    .single();

  if (!proposal) return null;

  const { data: auditRows } = await supabase
    .from('google_ads_audit_logs')
    .select('id,action,created_at,metadata')
    .eq('proposal_id', proposal.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const s = (proposal.settings ?? {}) as ProposalSettings;

  const rows: Array<[string, string]> = [
    ['Goal', 'Purchase / Sales conversion'],
    ['Campaign', 'Performance Max'],
    ['Products', (s.products ?? 'Dhoti Choli only') + ' · price > ₹' + (s.minimum_price_inr ?? 500)],
    ['Daily budget cap', '₹' + (s.daily_budget_inr ?? 500) + '/day'],
    ['Test duration', String(s.test_days ?? 7) + ' days'],
    ['Planned max spend', '₹' + (s.planned_max_spend_inr ?? ((s.daily_budget_inr ?? 500) * (s.test_days ?? 7)))],
    ['Bidding', 'Maximize Conversions'],
    ['CPA monitor target', '₹' + (s.cpa_monitoring_target_inr ?? 50) + ' (alert only)'],
    ['Primary conversion', s.primary_conversion ?? 'Purchase'],
    ['Location', 'India · exclude ' + (s.excluded_states ?? []).join(', ')],
    ['Demographic', (s.gender ?? 'Female') + ' · ' + (s.ages ?? []).join(', ')],
    ['Audience signal', s.audience_signal ?? 'Shopping intent'],
    ['Search themes', (s.search_themes ?? []).join(', ')],
    ['Schedule', (s.schedule ?? []).join(' · ')],
    ['iOS', s.ios_exclusion ?? 'Exclude only if supported'],
    ['First 7 days', 'No automatic budget increase'],
  ];

  return (
    <section className="rounded-2xl border border-[#d7aa5b] bg-[#fffaf0] p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#8a5a20]">
            <ShieldCheck size={13} />
            Google Ads Approval Mode
          </div>
          <h2 className="mt-3 text-lg font-black text-[#5e171b]">{proposal.name}</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-stone-600">
            This is the locked first-campaign proposal. AAL2 admin approval is recorded with an audit trail.
            This deployment does not silently launch or change a Google Ads campaign.
          </p>
        </div>
        <span className={'inline-flex w-fit items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase ' + statusBadge(proposal.status)}>
          {proposal.status === 'approved' ? <CheckCircle2 size={13} /> : proposal.status === 'rejected' ? <XCircle size={13} /> : <CircleAlert size={13} />}
          {proposal.status}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#ead8b8] bg-white px-3 py-3">
            <div className="text-[9px] font-black uppercase tracking-wider text-stone-400">{label}</div>
            <div className="mt-1 text-xs font-bold text-stone-700">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <GoogleAdsBudgetEditor
          proposalId={proposal.id}
          initialBudget={s.daily_budget_inr ?? 500}
          initialDays={s.test_days ?? 7}
          initialLandingUrl={s.landing_url ?? 'https://adhyeybrothers.in/collections/dhoti-choli'}
        />

        <div className="rounded-2xl border border-[#ead8b8] bg-white p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a5a20]">Sample Ad Preview</div>
          <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="text-[10px] font-semibold text-stone-500">Sponsored · Adhyey Brothers</div>
            <div className="mt-2 text-base font-black text-[#1a0dab]">Dhoti Choli for Girls | Shop Online</div>
            <div className="mt-1 text-xs font-semibold text-[#188038]">
              {s.landing_url ?? 'https://adhyeybrothers.in/collections/dhoti-choli'}
            </div>
            <p className="mt-2 text-xs leading-5 text-stone-700">
              Discover stylish Dhoti Choli sets for festive looks. Shop selected designs online from Adhyey Brothers.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-stone-600">
              <span className="rounded-full bg-white px-2.5 py-1">Dhoti Choli</span>
              <span className="rounded-full bg-white px-2.5 py-1">Girls Ethnic Wear</span>
              <span className="rounded-full bg-white px-2.5 py-1">Shop Now</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
            <a
              href={s.landing_url ?? 'https://adhyeybrothers.in/collections/dhoti-choli'}
              target="_blank"
              rel="noreferrer"
              className="font-black text-[#741f23] underline underline-offset-2"
            >
              Check landing page
            </a>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-stone-500">
            Preview only. This is the destination URL stored in the proposal and shown for approval before any live Google Ads write.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
        <strong>Safety state:</strong> approval/rejection is live and audited. Google Ads write execution remains blocked until the mutation executor is separately enabled and validated, so this panel cannot spend money by itself.
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <form action={approveGoogleAdsProposalAction}>
          <input type="hidden" name="proposalId" value={proposal.id} />
          <button
            type="submit"
            className="rounded-xl bg-[#741f23] px-4 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={proposal.status === 'approved'}
          >
            Approve proposal
          </button>
        </form>
        <form action={rejectGoogleAdsProposalAction}>
          <input type="hidden" name="proposalId" value={proposal.id} />
          <button
            type="submit"
            className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-black text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={proposal.status === 'rejected'}
          >
            Reject
          </button>
        </form>
      </div>

      <div className="mt-5 border-t border-[#ead8b8] pt-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-stone-500">Recent audit trail</h3>
        <div className="mt-2 space-y-2">
          {(auditRows ?? []).length > 0 ? (
            (auditRows ?? []).map((row) => (
              <div key={row.id} className="flex flex-col gap-1 rounded-xl bg-white px-3 py-2.5 text-[11px] text-stone-600 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-bold">{row.action.replaceAll('_', ' ')}</span>
                <span>{new Date(row.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
              </div>
            ))
          ) : (
            <p className="text-[11px] text-stone-500">No approval actions yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
