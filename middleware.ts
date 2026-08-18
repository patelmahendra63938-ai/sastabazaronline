import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // લૉગિન સેશન ચેક કરો
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAccessingAdmin = req.nextUrl.pathname.startsWith('/admin');
  const isLoginPage =
    req.nextUrl.pathname === '/login' ||
    req.nextUrl.pathname === '/admin/login';

  // જો યુઝર લૉગિન ન હોય અને /admin ખોલવાનો પ્રયાસ કરે તો સીધા /login પર મોકલો
  if (isAccessingAdmin && !isLoginPage && !user) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // જો યુઝર પહેલેથી લૉગિન હોય અને ફરી લૉગિન પેજ પર જાય તો એડમિન ડેશબોર્ડ પર મોકલો
  if (isLoginPage && user) {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  return response;
}

// માત્ર એડમિન અને લૉગિન પાથ પર જ આ મિડલવેર લાગુ પડશે
export const config = {
  matcher: ['/admin/:path*', '/login'],
};
