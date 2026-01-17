import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - handles invalid tokens gracefully
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();

    // If there's a refresh token error, clear the invalid session cookies
    if (error?.message?.includes('Refresh Token') || error?.code === 'refresh_token_not_found') {
      const response = NextResponse.next({ request });

      // Clear all Supabase auth cookies to force a fresh login
      request.cookies.getAll().forEach((cookie) => {
        if (cookie.name.includes('supabase') || cookie.name.includes('sb-')) {
          response.cookies.delete(cookie.name);
        }
      });

      // Redirect to login
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    user = data.user;
  } catch {
    // If getUser fails catastrophically, treat as unauthenticated
    user = null;
  }

  const publicPaths = ['/login', '/client-portal', '/api'];
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // If not logged in and trying to access protected route
  if (!user && !isPublicPath && request.nextUrl.pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If logged in and trying to access login page, redirect based on role
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    url.pathname = profile?.role === 'client' ? '/my-portal' : '/dashboard';
    return NextResponse.redirect(url);
  }

  // Redirect root to login for non-authenticated users
  if (!user && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect root to appropriate page based on role for authenticated users
  if (user && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    url.pathname = profile?.role === 'client' ? '/my-portal' : '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
