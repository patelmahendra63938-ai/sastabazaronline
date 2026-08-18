import { createClient } from '@supabase/supabase-js';

// Valid fallback ensures Vercel build will not crash during static evaluation
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ozzxrzyahbnavldyrlms.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_jXpCXLTZTtwJ6oVeEq8M9g_ZRx0K1ex';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-application-name': 'sastabazaronline',
    },
  },
  db: {
    schema: 'public',
  },
});