import 'server-only';

import { getMetaConfig, metaGraphGet } from '@/lib/meta/client';

export type MetaAdAccountSummary = {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  timezone_name?: string;
};

export type MetaWhatsAppPhone = {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
};

type MetaListResponse<T> = {
  data: T[];
};

export async function getMetaAdAccountSummary() {
  const config = getMetaConfig();
  return metaGraphGet<MetaAdAccountSummary>(`act_${config.adAccountId}`, {
    fields: 'id,name,account_status,currency,timezone_name',
  });
}

export async function getMetaWhatsAppPhones() {
  const config = getMetaConfig();
  if (!config.wabaId) return null;

  return metaGraphGet<MetaListResponse<MetaWhatsAppPhone>>(
    `${config.wabaId}/phone_numbers`,
    { fields: 'id,display_phone_number,verified_name,quality_rating' },
  );
}
