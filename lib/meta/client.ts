import 'server-only';

export type MetaConnectionConfig = {
  graphApiVersion: string;
  accessToken: string;
  adAccountId: string;
  businessId?: string;
  wabaId?: string;
  phoneNumberId?: string;
};

export type MetaConfigStatus = {
  configured: boolean;
  missing: string[];
};

const REQUIRED_ENV = [
  'META_GRAPH_API_VERSION',
  'META_ACCESS_TOKEN',
  'META_AD_ACCOUNT_ID',
] as const;

export function getMetaConfigStatus(): MetaConfigStatus {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim());
  return { configured: missing.length === 0, missing: [...missing] };
}

export function getMetaConfig(): MetaConnectionConfig {
  const status = getMetaConfigStatus();
  if (!status.configured) {
    throw new Error(`Meta API is not configured. Missing: ${status.missing.join(', ')}`);
  }

  return {
    graphApiVersion: process.env.META_GRAPH_API_VERSION!.trim(),
    accessToken: process.env.META_ACCESS_TOKEN!.trim(),
    adAccountId: process.env.META_AD_ACCOUNT_ID!.trim().replace(/^act_/, ''),
    businessId: process.env.META_BUSINESS_ID?.trim() || undefined,
    wabaId: process.env.META_WABA_ID?.trim() || undefined,
    phoneNumberId: process.env.META_PHONE_NUMBER_ID?.trim() || undefined,
  };
}

type GraphErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

export class MetaGraphError extends Error {
  code?: number;
  subcode?: number;
  type?: string;
  fbtraceId?: string;

  constructor(message: string, payload?: GraphErrorPayload['error']) {
    super(message);
    this.name = 'MetaGraphError';
    this.code = payload?.code;
    this.subcode = payload?.error_subcode;
    this.type = payload?.type;
    this.fbtraceId = payload?.fbtrace_id;
  }
}

export async function metaGraphGet<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const config = getMetaConfig();
  const normalizedPath = path.replace(/^\/+/, '');
  const url = new URL(
    `https://graph.facebook.com/${config.graphApiVersion}/${normalizedPath}`,
  );

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json()) as T & GraphErrorPayload;

  if (!response.ok || payload.error) {
    const detail = payload.error;
    throw new MetaGraphError(
      detail?.message || `Meta Graph API request failed with HTTP ${response.status}`,
      detail,
    );
  }

  return payload as T;
}
