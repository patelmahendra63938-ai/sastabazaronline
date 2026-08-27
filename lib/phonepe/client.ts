import 'server-only';

import {
  Env,
  StandardCheckoutClient,
} from '@phonepe-pg/pg-sdk-node';

let phonePeClient: StandardCheckoutClient | null = null;

export function getPhonePeClient() {
  if (phonePeClient) {
    return phonePeClient;
  }

  const clientId = process.env.PHONEPE_CLIENT_ID;
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
  const clientVersion = Number(
    process.env.PHONEPE_CLIENT_VERSION || '1'
  );

  if (!clientId) {
    throw new Error('PHONEPE_CLIENT_ID is missing.');
  }

  if (!clientSecret) {
    throw new Error('PHONEPE_CLIENT_SECRET is missing.');
  }

  if (!Number.isFinite(clientVersion)) {
    throw new Error(
      'PHONEPE_CLIENT_VERSION is invalid.'
    );
  }

  phonePeClient =
    StandardCheckoutClient.getInstance(
      clientId,
      clientSecret,
      clientVersion,
      Env.PRODUCTION
    );

  return phonePeClient;
}