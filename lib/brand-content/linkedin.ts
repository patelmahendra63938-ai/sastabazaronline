import 'server-only';

const LINKEDIN_VERSION = process.env.LINKEDIN_VERSION || '202609';

export function linkedinConfigured() {
  return Boolean(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_ORGANIZATION_ID);
}

export async function publishLinkedInPost(commentary: string) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const organizationId = process.env.LINKEDIN_ORGANIZATION_ID;

  if (!token || !organizationId) {
    throw new Error('LinkedIn credentials are not configured');
  }

  const response = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'Linkedin-Version': LINKEDIN_VERSION,
    },
    body: JSON.stringify({
      author: `urn:li:organization:${organizationId}`,
      commentary,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(25_000),
  });

  const remoteId = response.headers.get('x-restli-id');
  if (!response.ok) {
    const details = (await response.text()).slice(0, 300);
    throw new Error(details || `LinkedIn returned ${response.status}`);
  }
  if (!remoteId) throw new Error('LinkedIn did not return a post ID');
  return remoteId;
}
