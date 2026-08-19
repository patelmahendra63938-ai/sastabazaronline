-- Durable, idempotent intake for NimbusPost Partner API v2 webhook deliveries.
-- RLS is enabled with no public policies; only the existing server-side service
-- role should write these records.
CREATE TABLE IF NOT EXISTS public.nimbuspost_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL,
  processing_status TEXT NOT NULL,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nimbuspost_webhook_deliveries_status_received_at
  ON public.nimbuspost_webhook_deliveries (processing_status, received_at DESC);

ALTER TABLE public.nimbuspost_webhook_deliveries ENABLE ROW LEVEL SECURITY;
