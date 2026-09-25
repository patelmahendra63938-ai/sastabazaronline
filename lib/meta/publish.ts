import 'server-only';
import { GRAPH_VERSION, PAGE_ID, type SocialChannel } from './post-planner';

type GraphResponse = { id?: string; status_code?: string; access_token?: string; instagram_business_account?: { id: string }; error?: { message?: string } };

async function graph<T extends GraphResponse>(path: string, token: string, params?: Record<string, string>): Promise<T> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${path}`;
  const response = await fetch(url, {
    method: params ? 'POST' : 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      ...(params ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: params ? new URLSearchParams(params) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(25_000),
  });
  const data = await response.json() as T;
  if (!response.ok || data.error) throw new Error(data.error?.message?.slice(0, 300) || `Meta returned ${response.status}`);
  return data;
}

export async function publishMetaProduct(input: {
  id: string;
  channel: SocialChannel;
  caption: string;
}) {
  const systemToken = process.env.META_SYSTEM_USER_ACCESS_TOKEN;
  if (!systemToken) throw new Error('Meta system user token is not configured');
  const page = await graph<GraphResponse>(`${PAGE_ID}?fields=access_token,instagram_business_account`, systemToken);
  const pageToken = page.access_token;
  if (!pageToken) throw new Error('Meta Page access token is unavailable');

  const imageUrl = `https://adhyeybrothers.in/api/social-media/${input.id}`;
  if (input.channel === 'facebook') {
    const published = await graph<GraphResponse>(`${PAGE_ID}/photos`, pageToken, {
      url: imageUrl, caption: input.caption,
    });
    if (!published.id) throw new Error('Facebook did not return a post ID');
    return published.id;
  }

  const igId = page.instagram_business_account?.id;
  if (!igId) throw new Error('Instagram professional account is not linked to this Page');
  const container = await graph<GraphResponse>(`${igId}/media`, pageToken, {
    image_url: imageUrl, caption: input.caption,
  });
  if (!container.id) throw new Error('Instagram did not create a media container');
  let ready = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const state = await graph<GraphResponse>(`${container.id}?fields=status_code`, pageToken);
    if (state.status_code === 'FINISHED') { ready = true; break; }
    if (state.status_code === 'ERROR' || state.status_code === 'EXPIRED') {
      throw new Error('Instagram could not process this product image');
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  if (!ready) throw new Error('Instagram image is not ready; check the container before retrying');
  const published = await graph<GraphResponse>(`${igId}/media_publish`, pageToken, {
    creation_id: container.id,
  });
  if (!published.id) throw new Error('Instagram did not return a post ID');
  return published.id;
}

export type MetaConnectionStatus = {
  pageConnected: boolean;
  instagramConnected: boolean;
  instagramId: string | null;
  error: string | null;
};

// Read-only status check: no media container or post is created.
export async function getMetaConnectionStatus(): Promise<MetaConnectionStatus> {
  const systemToken = process.env.META_SYSTEM_USER_ACCESS_TOKEN;
  if (!systemToken) {
    return {
      pageConnected: false,
      instagramConnected: false,
      instagramId: null,
      error: 'Meta system user token is not configured',
    };
  }

  try {
    const page = await graph<GraphResponse>(
      `${PAGE_ID}?fields=access_token,instagram_business_account`,
      systemToken
    );
    const pageToken = page.access_token;
    if (!pageToken) {
      return {
        pageConnected: false,
        instagramConnected: false,
        instagramId: null,
        error: 'Facebook Page access token is unavailable',
      };
    }

    const igId = page.instagram_business_account?.id || null;
    if (!igId) {
      return {
        pageConnected: true,
        instagramConnected: false,
        instagramId: null,
        error: 'Instagram professional account is not linked to this Facebook Page',
      };
    }

    await graph<GraphResponse>(`${igId}?fields=id`, pageToken);

    return {
      pageConnected: true,
      instagramConnected: true,
      instagramId: igId,
      error: null,
    };
  } catch (error) {
    return {
      pageConnected: false,
      instagramConnected: false,
      instagramId: null,
      error: error instanceof Error ? error.message : 'Meta connection check failed',
    };
  }
}

export async function checkMetaConnection() {
  const status = await getMetaConnectionStatus();
  if (!status.pageConnected || !status.instagramConnected) {
    throw new Error(status.error || 'Meta connection check failed');
  }
}
