'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { syncExistingNimbusPostShipment } from '@/actions/shipping';

const AUTO_SYNC_INTERVAL_MS = 60_000;
const MAX_ORDERS_PER_SYNC = 25;

export default function AutoNimbusSync() {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState('NimbusPost sync ready');
  const runningRef = useRef(false);

  const runSync = useCallback(async (manual = false) => {
    if (runningRef.current) return;

    runningRef.current = true;
    setSyncing(true);
    setStatus(manual ? 'Checking NimbusPost now…' : 'Checking pending AWBs…');

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, order_status, shipments(id, awb_number)')
        .order('created_at', { ascending: false })
        .limit(MAX_ORDERS_PER_SYNC);

      if (error) throw error;

      const pendingOrders = (data || []).filter((order: any) => {
        const state = String(order.order_status || '').toUpperCase();
        const cancelled = state === 'CANCELLED' || state === 'CANCELED';
        const hasAwb = Array.isArray(order.shipments)
          ? order.shipments.some((shipment: any) =>
              Boolean(String(shipment?.awb_number || '').trim())
            )
          : false;

        return !cancelled && !hasAwb && Boolean(order.order_number);
      });

      if (pendingOrders.length === 0) {
        setStatus('All current orders are synced');
        return;
      }

      let synced = 0;
      let checked = 0;
      let lastMessage = '';

      // Sequential calls avoid flooding NimbusPost and preserve duplicate-booking safety.
      for (const order of pendingOrders) {
        checked += 1;
        setStatus(`Checking ${checked}/${pendingOrders.length}: ${order.order_number}`);

        try {
          const result = await syncExistingNimbusPostShipment(order.id);

          if (result?.success && result?.awb) {
            synced += 1;
            lastMessage = `${order.order_number}: ${result.awb}`;
          } else if (result?.error) {
            lastMessage = String(result.error);
          }
        } catch (err: any) {
          lastMessage = err?.message || 'NimbusPost sync check failed.';
        }
      }

      if (synced > 0) {
        setStatus(`Synced ${synced} AWB${synced === 1 ? '' : 's'}. Refreshing…`);
        window.setTimeout(() => window.location.reload(), 600);
        return;
      }

      setStatus(
        manual
          ? `Checked ${checked} pending order${checked === 1 ? '' : 's'}; no new AWB returned yet.${lastMessage ? ` ${lastMessage}` : ''}`
          : `Checked ${checked} pending order${checked === 1 ? '' : 's'}; waiting for NimbusPost.`
      );
    } catch (err: any) {
      setStatus(err?.message || 'NimbusPost sync failed.');
    } finally {
      setSyncing(false);
      runningRef.current = false;
    }
  }, []);

  useEffect(() => {
    void runSync(false);

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void runSync(false);
      }
    }, AUTO_SYNC_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [runSync]);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-indigo-200 bg-white/95 p-3 shadow-xl backdrop-blur print:hidden">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void runSync(true)}
          disabled={syncing}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-700 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync NimbusPost AWB'}
        </button>
        <p className="min-w-0 text-[10px] font-semibold leading-4 text-gray-600">
          {status}
        </p>
      </div>
    </div>
  );
}
