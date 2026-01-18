import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error?.message?.includes('Refresh Token') || error?.code === 'refresh_token_not_found') {
      const response = NextResponse.next({ request });

      request.cookies.getAll().forEach((cookie) => {
        if (cookie.name.includes('supabase') || cookie.name.includes('sb-')) {
          response.cookies.delete(cookie.name);
        }
      });

      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    user = data.user;
  } catch {
    user = null;
  }

  // Public paths that don't require authentication
  // SECURITY: Only these paths are accessible without login
  const publicPaths = ['/login', '/self-service', '/client-portal', '/api'];
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Root path always redirects to login (no public landing page)
  if (request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Unauthenticated users can only access public paths
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Authenticated user handling
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;
    const isClient = role === 'client';

    // Staff-only routes - clients cannot access these
    const staffOnlyPrefixes = ['/dashboard', '/clients', '/tasks', '/admin', '/calendar', '/housing', '/documents', '/alerts', '/command-center', '/client-intake'];

    if (isClient && staffOnlyPrefixes.some((path) => request.nextUrl.pathname.startsWith(path))) {
      const url = request.nextUrl.clone();
      url.pathname = '/my-portal';
      return NextResponse.redirect(url);
    }

    // Authenticated users shouldn't see login or self-service registration
    if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/self-service') {
      const url = request.nextUrl.clone();
      url.pathname = isClient ? '/my-portal' : '/dashboard';
      return NextResponse.redirect(url);
    }

    // Users without a profile should be signed out and redirected
    // This handles the edge case of auth user existing but no profile
    if (!profile && !isPublicPath && request.nextUrl.pathname !== '/auth/callback' && request.nextUrl.pathname !== '/auth/post-login') {
      // Let auth callbacks through, they may be creating the profile
      // For other routes, redirect to login
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
