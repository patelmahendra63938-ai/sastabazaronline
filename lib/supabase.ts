import { createClient } from '@supabase/supabase-js';

// Safe fallback URL prevents build-time crashes during Vercel static page data collection
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ozzxrzyahbnavldyrlms.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  if (typeof window !== 'undefined') {
    console.warn('⚠️ Supabase environment variables missing in client runtime.');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Retains authentication state across sessions and RLS policies
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