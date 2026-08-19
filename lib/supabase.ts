import { createClient } from '@supabase/supabase-js';

// Safe HTTPS fallback prevents build-time evaluation crashes during Vercel static page generation
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ozzxrzyahbnavldyrlms.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_jXpCXLTZTtwJ6oVeEq8M9g_ZRx0K1ex';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  if (typeof window !== 'undefined') {
    console.warn('⚠️ Supabase environment variables missing in client runtime.');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Retains authentication state across sessions and satisfies RLS policies
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