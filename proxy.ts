import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin', 'staff'] as const;

export async function proxy(request: NextRequest) {
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

  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith('/admin');
  const isLoginPage =
    pathname === '/login' ||
    pathname === '/admin/login';

  /*
   * 1. Protect all admin routes.
   */
  if (isAdminRoute && !isLoginPage) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    /*
     * No authenticated user:
     * send them to the existing /login page.
     */
    if (!user) {
      const loginUrl = request.nextUrl.clone();

      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);

      return NextResponse.redirect(loginUrl);
    }

    /*
     * Authenticated user:
     * verify the server-side profile role.
     */
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role;

    if (
      profileError ||
      !role ||
      !ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])
    ) {
      const homeUrl = request.nextUrl.clone();

      homeUrl.pathname = '/';
      homeUrl.search = '';
      homeUrl.searchParams.set('error', 'unauthorized');

      return NextResponse.redirect(homeUrl);
    }
  }

  /*
   * 2. Logged-in admin/staff visiting /login.
   *
   * Do not automatically redirect every authenticated customer.
   * Verify the role first.
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
        return NextResponse.redirect(
          new URL('/admin/dashboard', request.url)
        );
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
