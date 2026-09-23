'use client';

import { useActionState } from 'react';
import { testMetaConnection } from './actions';

const messages: Record<string, string> = {
  'cron-missing': 'Scheduler secret is missing from this deployment.',
  'meta-connected': 'Facebook Page and linked Instagram account are connected. Publishing permissions still need a live post check.',
  'meta-connection-failed': 'Meta connection failed. Check the system user token, Page and Instagram asset access, and permissions.',
};

export function ConnectionCheck() {
  const [result, action, pending] = useActionState(testMetaConnection, '');
  return (
    <form action={action} className="mt-3">
      <button disabled={pending} className="rounded-lg border border-[#741f23] px-4 py-2 text-sm font-semibold text-[#741f23] disabled:opacity-50">
        {pending ? 'Checking Meta connection…' : 'Check Meta connection (no post sent)'}
      </button>
      {result && <p role="status" aria-live="polite" className="mt-3 text-sm text-stone-700">{messages[result] || 'Connection check could not be completed.'}</p>}
    </form>
  );
}
