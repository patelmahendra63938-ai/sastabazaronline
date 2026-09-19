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

  // Keep old single-category links useful while consolidating indexing onto
  // clean, descriptive category URLs.
  if (pathname === '/') {
    const category = searchParams.get('category')?.trim();
    if (
      category &&
      !category.includes(',') &&
      Array.from(searchParams.keys()).every((key) => key === 'category')
    ) {
      const categoryUrl = request.nextUrl.clone();
      categoryUrl.pathname = `/category/${encodeURIComponent(category)}`;
      categoryUrl.search = '';
      return NextResponse.redirect(categoryUrl, 308);
    }

    const response = NextResponse.next();
    const hasStorefrontQuery = Array.from(searchParams.keys()).some((key) =>
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
  const isPrimaryLoginPage = pathname === '/login' || pathname === '/admin/login';
  const isMfaPage = pathname === '/login/mfa';

  /*
   * 1. Protect every admin route with user, role and AAL2 checks.
   */
  if (isAdminRoute && !isPrimaryLoginPage) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role;

    if (
      !role ||
      !ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])
    ) {
      return NextResponse.redirect(new URL('/?error=unauthorized', request.url));
    }

    const { data: aal, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalError || aal.currentLevel !== 'aal2') {
      const mfaUrl = request.nextUrl.clone();
      mfaUrl.pathname = '/login/mfa';
      mfaUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(mfaUrl);
    }
  }

  /*
   * 2. Logged-in admin/staff visiting the primary login page.
   * Send AAL1 sessions to MFA and AAL2 sessions to the dashboard.
   */
  if (isPrimaryLoginPage) {
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
        const { data: aal } =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        const destination =
          aal?.currentLevel === 'aal2' ? '/admin/dashboard' : '/login/mfa';

        return NextResponse.redirect(new URL(destination, request.url));
      }
    }
  }

  /*
   * 3. The MFA page requires a signed-in, authorized staff account.
   */
  if (isMfaPage) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = profile?.role;

    if (
      !role ||
      !ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])
    ) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/?error=unauthorized', request.url));
    }

    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aal?.currentLevel === 'aal2') {
      const requestedPath = searchParams.get('redirect');
      const destination =
        requestedPath &&
        (requestedPath === '/admin' || requestedPath.startsWith('/admin/'))
          ? requestedPath
          : '/admin/dashboard';

      return NextResponse.redirect(new URL(destination, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/', '/admin/:path*', '/login/:path*', '/login'],
};
