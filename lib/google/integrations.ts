export type IntegrationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type GoogleAdsCampaign = {
  id: string;
  name: string;
  status: string;
  channelType: string;
  dailyBudget: number;
  startDate: string;
  endDate: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
};

export type GoogleAdsSummary = {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionValue: number;
  campaigns: GoogleAdsCampaign[];
};

export type Ga4Summary = {
  activeUsers: number;
  sessions: number;
  ecommercePurchases: number;
  purchaseRevenue: number;
};

export type SearchConsoleQuery = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchConsoleSummary = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  topQueries: SearchConsoleQuery[];
};

export type MerchantSummary = {
  products: number;
  approved: number;
  pending: number;
  disapproved: number;
};

export type GoogleDashboard = {
  ads: IntegrationResult<GoogleAdsSummary>;
  ga4: IntegrationResult<Ga4Summary>;
  searchConsole: IntegrationResult<SearchConsoleSummary>;
  merchant: IntegrationResult<MerchantSummary>;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error('Missing environment variable: ' + name);
  return value;
}

function numberValue(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function jsonOrError(response: Response) {
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'error' in body
        ? JSON.stringify((body as { error: unknown }).error)
        : text || response.statusText;
    throw new Error(response.status + ' ' + response.statusText + ': ' + message);
  }

  return body;
}

export async function getGoogleAccessToken() {
  const body = new URLSearchParams({
    client_id: requiredEnv('GOOGLE_CLIENT_ID'),
    client_secret: requiredEnv('GOOGLE_CLIENT_SECRET'),
    refresh_token: requiredEnv('GOOGLE_ADS_REFRESH_TOKEN'),
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });

  const data = (await jsonOrError(response)) as { access_token?: string };
  if (!data.access_token) throw new Error('Google token response did not include an access token.');
  return data.access_token;
}

async function googleAdsSummary(accessToken: string): Promise<GoogleAdsSummary> {
  const customerId = requiredEnv('GOOGLE_ADS_CUSTOMER_ID').replace(/\D/g, '');
  const query = [
    'SELECT',
    'campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,',
    'campaign_budget.amount_micros,',
    'metrics.impressions, metrics.clicks, metrics.cost_micros,',
    'metrics.conversions, metrics.conversions_value',
    'FROM campaign',
    'WHERE segments.date DURING LAST_30_DAYS',
    'ORDER BY metrics.cost_micros DESC',
    'LIMIT 20',
  ].join(' ');

  const response = await fetch(
    'https://googleads.googleapis.com/v25/customers/' + customerId + '/googleAds:searchStream',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      cache: 'no-store',
    }
  );

  const body = (await jsonOrError(response)) as Array<{
    results?: Array<{
      campaign?: {
        id?: string;
        name?: string;
        status?: string;
        advertisingChannelType?: string;
      };
      campaignBudget?: { amountMicros?: string | number };
      metrics?: {
        impressions?: string | number;
        clicks?: string | number;
        costMicros?: string | number;
        conversions?: string | number;
        conversionsValue?: string | number;
      };
    }>;
  }>;

  const rows = Array.isArray(body) ? body.flatMap((part) => part.results ?? []) : [];
  const campaigns = rows.map((row) => {
    const metrics = row.metrics ?? {};
    return {
      id: row.campaign?.id ?? '',
      name: row.campaign?.name ?? 'Unnamed campaign',
      status: row.campaign?.status ?? 'UNKNOWN',
      channelType: row.campaign?.advertisingChannelType ?? 'UNKNOWN',
      dailyBudget: numberValue(row.campaignBudget?.amountMicros) / 1_000_000,
      startDate: '',
      endDate: '',
      impressions: numberValue(metrics.impressions),
      clicks: numberValue(metrics.clicks),
      cost: numberValue(metrics.costMicros) / 1_000_000,
      conversions: numberValue(metrics.conversions),
      conversionValue: numberValue(metrics.conversionsValue),
    };
  });

  return campaigns.reduce<GoogleAdsSummary>(
    (summary, campaign) => ({
      impressions: summary.impressions + campaign.impressions,
      clicks: summary.clicks + campaign.clicks,
      spend: summary.spend + campaign.cost,
      conversions: summary.conversions + campaign.conversions,
      conversionValue: summary.conversionValue + campaign.conversionValue,
      campaigns: [...summary.campaigns, campaign],
    }),
    {
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      conversionValue: 0,
      campaigns: [],
    }
  );
}

async function ga4Summary(accessToken: string): Promise<Ga4Summary> {
  const propertyId = requiredEnv('GA4_PROPERTY_ID');
  const response = await fetch(
    'https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':runReport',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'ecommercePurchases' },
          { name: 'purchaseRevenue' },
        ],
      }),
      cache: 'no-store',
    }
  );

  const body = (await jsonOrError(response)) as {
    rows?: Array<{ metricValues?: Array<{ value?: string }> }>;
  };
  const values = body.rows?.[0]?.metricValues ?? [];

  return {
    activeUsers: numberValue(values[0]?.value),
    sessions: numberValue(values[1]?.value),
    ecommercePurchases: numberValue(values[2]?.value),
    purchaseRevenue: numberValue(values[3]?.value),
  };
}

function isoDate(daysAgo: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

async function searchConsoleSummary(accessToken: string): Promise<SearchConsoleSummary> {
  const siteUrl = requiredEnv('GOOGLE_SEARCH_CONSOLE_SITE_URL');
  const endpoint =
    'https://www.googleapis.com/webmasters/v3/sites/' +
    encodeURIComponent(siteUrl) +
    '/searchAnalytics/query';
  const dateRange = { startDate: isoDate(30), endDate: isoDate(1) };

  const headers = {
    Authorization: 'Bearer ' + accessToken,
    'Content-Type': 'application/json',
  };

  const [summaryResponse, queryResponse] = await Promise.all([
    fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(dateRange),
      cache: 'no-store',
    }),
    fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...dateRange,
        dimensions: ['query'],
        rowLimit: 10,
        dataState: 'final',
      }),
      cache: 'no-store',
    }),
  ]);

  const summaryBody = (await jsonOrError(summaryResponse)) as {
    rows?: Array<{ clicks?: number; impressions?: number; ctr?: number; position?: number }>;
  };
  const queryBody = (await jsonOrError(queryResponse)) as {
    rows?: Array<{
      keys?: string[];
      clicks?: number;
      impressions?: number;
      ctr?: number;
      position?: number;
    }>;
  };

  const total = summaryBody.rows?.[0] ?? {};
  return {
    clicks: numberValue(total.clicks),
    impressions: numberValue(total.impressions),
    ctr: numberValue(total.ctr),
    position: numberValue(total.position),
    topQueries: (queryBody.rows ?? []).map((row) => ({
      query: row.keys?.[0] ?? '(unknown)',
      clicks: numberValue(row.clicks),
      impressions: numberValue(row.impressions),
      ctr: numberValue(row.ctr),
      position: numberValue(row.position),
    })),
  };
}

function productState(product: {
  productStatus?: {
    destinationStatuses?: Array<{
      approvedCountries?: string[];
      pendingCountries?: string[];
      disapprovedCountries?: string[];
    }>;
  };
}) {
  const statuses = product.productStatus?.destinationStatuses ?? [];
  if (statuses.some((status) => (status.disapprovedCountries?.length ?? 0) > 0)) return 'disapproved';
  if (statuses.some((status) => (status.pendingCountries?.length ?? 0) > 0)) return 'pending';
  return 'approved';
}

async function merchantSummary(accessToken: string): Promise<MerchantSummary> {
  const accountId = requiredEnv('GOOGLE_MERCHANT_ACCOUNT_ID');
  const response = await fetch(
    'https://merchantapi.googleapis.com/products/v1/accounts/' +
      accountId +
      '/products?pageSize=100',
    {
      headers: { Authorization: 'Bearer ' + accessToken },
      cache: 'no-store',
    }
  );

  const body = (await jsonOrError(response)) as {
    products?: Array<{
      productStatus?: {
        destinationStatuses?: Array<{
          approvedCountries?: string[];
          pendingCountries?: string[];
          disapprovedCountries?: string[];
        }>;
      };
    }>;
  };

  const products = body.products ?? [];
  const counts = { approved: 0, pending: 0, disapproved: 0 };
  for (const product of products) counts[productState(product)] += 1;

  return {
    products: products.length,
    approved: counts.approved,
    pending: counts.pending,
    disapproved: counts.disapproved,
  };
}

async function safe<T>(fn: () => Promise<T>): Promise<IntegrationResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function getGoogleDashboard(): Promise<GoogleDashboard> {
  let accessToken: string;
  try {
    accessToken = await getGoogleAccessToken();
  } catch (error) {
    const failure = { ok: false, error: errorMessage(error) } as const;
    return {
      ads: failure,
      ga4: failure,
      searchConsole: failure,
      merchant: failure,
    };
  }

  const [ads, ga4, searchConsole, merchant] = await Promise.all([
    safe(() => googleAdsSummary(accessToken)),
    safe(() => ga4Summary(accessToken)),
    safe(() => searchConsoleSummary(accessToken)),
    safe(() => merchantSummary(accessToken)),
  ]);

  return { ads, ga4, searchConsole, merchant };
}

export async function registerMerchantDeveloper(developerEmail: string) {
  const email = developerEmail.trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Enter a valid Google account email address.');
  }

  const accountId = requiredEnv('GOOGLE_MERCHANT_ACCOUNT_ID');
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(
    'https://merchantapi.googleapis.com/accounts/v1/accounts/' +
      accountId +
      '/developerRegistration:registerGcp',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ developerEmail: email }),
      cache: 'no-store',
    }
  );

  return jsonOrError(response);
}


export async function uploadGoogleAdsImageAsset(input: {
  name: string;
  imageBytes: Buffer;
  width: number;
  height: number;
  mimeType: 'IMAGE_JPEG' | 'IMAGE_PNG';
}) {
  const customerId = requiredEnv('GOOGLE_ADS_CUSTOMER_ID').replace(/\D/g, '');
  const accessToken = await getGoogleAccessToken();

  const response = await fetch(
    'https://googleads.googleapis.com/v25/customers/' + customerId + '/assets:mutate',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operations: [
          {
            create: {
              name: input.name,
              imageAsset: {
                data: input.imageBytes.toString('base64'),
                fileSize: String(input.imageBytes.byteLength),
                mimeType: input.mimeType,
                fullSize: {
                  heightPixels: input.height,
                  widthPixels: input.width,
                },
              },
            },
          },
        ],
      }),
      cache: 'no-store',
    }
  );

  const body = (await jsonOrError(response)) as {
    results?: Array<{ resourceName?: string }>;
  };
  const resourceName = body.results?.[0]?.resourceName;
  if (!resourceName) {
    throw new Error('Google Ads image upload succeeded without an asset resource name.');
  }
  return resourceName;
}
