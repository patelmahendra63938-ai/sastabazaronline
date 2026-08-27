import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), 'utf8');

for (const route of [
  'app/api/test-email/route.ts',
  'app/api/test-whatsapp/route.ts',
  'app/api/vision/route.ts',
  'app/api/vision/admin/scan/route.ts',
]) {
  test(`${route} requires an admin API session`, async () => {
    const source = await readProjectFile(route);
    assert.match(source, /requireAdminApiSession/);
    assert.match(source, /if \(!admin\.authorized\) return admin\.response/);
  });
}

test('vision accepts only a server-side Gemini key and limits payload size', async () => {
  const source = await readProjectFile('app/api/vision/route.ts');
  assert.match(source, /process\.env\.GEMINI_API_KEY/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_GEMINI_API_KEY/);
  assert.match(source, /MAX_BASE64_CHARACTERS/);
  assert.match(source, /status: 413/);
});

test('campaign creation checks admin access before privileged database use', async () => {
  const source = await readProjectFile('app/admin/coupons/actions.ts');
  const authIndex = source.indexOf('getAdminSession()');
  const keyIndex = source.indexOf('SUPABASE_SERVICE_ROLE_KEY');
  assert.ok(authIndex >= 0);
  assert.ok(keyIndex > authIndex);
  assert.doesNotMatch(source, /:\s*any/);
});

test('inventory scan checks admin access before privileged database use', async () => {
  const source = await readProjectFile('app/api/vision/admin/scan/route.ts');
  const authIndex = source.indexOf('requireAdminApiSession()');
  const clientIndex = source.indexOf('getSupabaseClient();');
  assert.ok(authIndex >= 0);
  assert.ok(clientIndex > authIndex);
});

test('checkout pricing route remains unchanged by safe hardening', async () => {
  const source = await readProjectFile('app/api/shipping/check-pincode/route.ts');
  assert.match(source, /calculateAuthoritativeOrderPricing/);
});


test('legacy vision route reuses the protected implementation', async () => {
  const source = await readProjectFile('app/vision/route.ts');
  assert.match(source, /api\/vision\/route/);
});
