import 'server-only';
import { GRAPH_VERSION, PAGE_ID } from '@/lib/meta/post-planner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MEDIA_ID = '18025100456702235';

type GraphResult = {
  id?: string;
  permalink?: string;
  media_type?: string;
  timestamp?: string;
  caption?: string;
  username?: string;
  access_token?: string;
  instagram_business_account?: { id: string };
  error?: { message?: string };
};

async function graph(path: string, token: string) {
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await response.json() as GraphResult;
  return { ok: response.ok && !data.error, status: response.status, data };
}

export async function GET() {
  const systemToken = process.env.META_SYSTEM_USER_ACCESS_TOKEN;
  if (!systemToken) return Response.json({ error: 'token_missing' }, { status: 500 });

  const page = await graph(`${PAGE_ID}?fields=access_token,instagram_business_account`, systemToken);
  if (!page.ok || !page.data.access_token) {
    return Response.json({ stage: 'page', status: page.status, error: page.data.error?.message || 'page_access_failed' }, { status: 502 });
  }

  const media = await graph(`${MEDIA_ID}?fields=id,permalink,media_type,timestamp,caption,username`, page.data.access_token);
  return Response.json({
    ok: media.ok,
    status: media.status,
    ig_account_id: page.data.instagram_business_account?.id || null,
    media: media.ok ? media.data : null,
    error: media.ok ? null : media.data.error?.message || 'media_lookup_failed',
  }, { status: media.ok ? 200 : 502 });
}
