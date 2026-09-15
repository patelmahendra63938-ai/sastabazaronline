import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin', 'staff'] as const;
const STOREFRONT_QUERY_KEYS = new Set([
  'category',
  'brand',
  'color',
  'fabric',
  'pattern',
  'gender',
  'fit',
  'occasion',
  'type',
  'minPrice',
  'maxPrice',
  'size',
  'sort',
  'page',
  'q',
]);

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Faceted/search URLs are useful to shoppers but should not compete with
  // canonical category and product pages in search results.
  if (pathname === '/') {
    const response = NextResponse.next();
    const hasStorefrontQuery = Array.from(searchParams.keys()).some(key =>
      STOREFRONT_QUERY_KEYS.has(key)
    );

    if (hasStorefrontQuery) {
      response.headers.set('X-Robots-Tag', 'noindex, follow');
    }

    return response;
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const isAdminRoute = pathname.startsWith('/admin');
  const isLoginPage = pathname === '/login' || pathname === '/admin/login';

  /*
   * 1. Protect all admin routes.
   */
  if (isAdminRoute && !isLoginPage) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  /*
   * 2. Logged-in admin/staff visiting /login.
   * Do not automatically redirect every authenticated customer.
   */
  if (isLoginPage) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = profile?.role;

      if (
        role &&
        ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])
      ) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/', '/admin/:path*', '/login'],
};
