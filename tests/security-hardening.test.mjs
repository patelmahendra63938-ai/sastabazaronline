import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('admin layout performs an authoritative server-side role check', async () => {
  const source = await readProjectFile('app/admin/layout.tsx');
  assert.match(source, /getAdminSession/);
  assert.match(source, /if \(!user\)/);
  assert.match(source, /if \(!authorized\)/);
  assert.match(source, /redirect\('/);
});

test('Next.js proxy rejects unauthorized admin navigation', async () => {
  const source = await readProjectFile('proxy.ts');
  assert.match(source, /export async function proxy/);
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /ADMIN_ROLES\.includes/);
  assert.match(source, /matcher: \['\/admin\/:path\*', '\/login'\]/);
});

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

test('vision route uses only a server-side Gemini key and limits payload size', async () => {
  const source = await readProjectFile('app/api/vision/route.ts');
  assert.match(source, /process\.env\.GEMINI_API_KEY/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_GEMINI_API_KEY/);
  assert.match(source, /MAX_BASE64_CHARACTERS/);
  assert.match(source, /status: 413/);
});

test('admin scan route no longer uses a service-role client', async () => {
  const source = await readProjectFile('app/api/vision/admin/scan/route.ts');
  assert.match(source, /createServerSupabaseClient/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
});

test('campaign creation requires an admin session and respects RLS', async () => {
  const source = await readProjectFile('app/admin/coupons/actions.ts');
  assert.match(source, /getAdminSession/);
  assert.match(source, /createServerSupabaseClient/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(source, /:\s*any/);
});

test('public shipping lookups never use a service-role key', async () => {
  const files = await Promise.all([
    readProjectFile('app/api/shipping/check-pincode/route.ts'),
    readProjectFile('lib/shipping/serviceability.ts'),
  ]);
  const source = files.join('\n');
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
});

test('database migration removes known anonymous write policies', async () => {
  const source = await readProjectFile(
    'supabase/migrations/20260821_security_hardening.sql'
  );
  assert.match(source, /drop policy if exists "Allow all on categories"/i);
  assert.match(source, /drop policy if exists "Admin insert promotions"/i);
  assert.match(source, /drop policy if exists "Allow public uploads"/i);
  assert.match(source, /prevent_unauthorized_profile_role_change/);
  assert.match(source, /allowed_mime_types/);
});
