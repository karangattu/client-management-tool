'use client';

import { useEffect, useRef, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function PostLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectingRef = useRef(false);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const globalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [details, setDetails] = useState<string>('Initializing…');
  const [fatal, setFatal] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (redirectingRef.current) return;
      redirectingRef.current = true;

      const supabase = createClient();
      const defaultParam = searchParams.get('default');
      const defaultRedirect = defaultParam === 'my-portal' ? '/my-portal' : '/dashboard';
      console.log('[PostLogin] Starting, defaultRedirect:', defaultRedirect);

      // Global timeout - if everything takes too long, redirect to default anyway
      globalTimeoutRef.current = setTimeout(() => {
        console.warn('[PostLogin] Global timeout reached, redirecting to default:', defaultRedirect);
        window.location.href = defaultRedirect;
      }, 5000); // 5 second max

      try {
        // First check if we already have a session before trying to refresh
        setDetails('Checking session…');
        console.log('[PostLogin] Checking session...');
        let session = (await supabase.auth.getSession()).data.session;
        console.log('[PostLogin] Initial session:', session ? 'found' : 'not found');

        // If no session yet, wait briefly for cookies to propagate (max 500ms)
        if (!session?.user) {
          for (let attempt = 1; !session?.user && attempt <= 2; attempt++) {
            await new Promise((r) => setTimeout(r, 250));
            session = (await supabase.auth.getSession()).data.session;
          }
          console.log('[PostLogin] Session after wait:', session ? 'found' : 'not found');
        }

        // Only attempt refresh if we have a session (to ensure tokens are fresh)
        if (session?.user) {
          setDetails('Refreshing session…');
          console.log('[PostLogin] Refreshing session...');
          try {
            // Add timeout to prevent hanging
            const refreshPromise = supabase.auth.refreshSession();
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Refresh timeout')), 2000)
            );
            await Promise.race([refreshPromise, timeoutPromise]);
            console.log('[PostLogin] Session refreshed successfully');
          } catch (e) {
            console.warn('[PostLogin] refreshSession failed (continuing):', e);
          }
          session = (await supabase.auth.getSession()).data.session;
        }

        if (!session?.user) {
          console.warn('[PostLogin] No session after waiting; sending to login');
          if (globalTimeoutRef.current) clearTimeout(globalTimeoutRef.current);
          setFatal('No active session found. Please sign in again.');
          return;
        }

        // Fetch profile - single attempt with timeout
        setDetails('Loading your account…');
        console.log('[PostLogin] Fetching profile for user:', session.user.id);
        let role: string | null = null;

      const profilePromise = supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      const profileTimeout = new Promise(((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 2000)
      ));

      try {
        const { data: profile, error: profileError } = await Promise.race([profilePromise, profileTimeout]) as { data: { role: string } | null; error: { message: string } | null };
        if (profileError) {
          console.warn('[PostLogin] profile fetch error:', profileError);
        }
        role = profile?.role ?? null;
        console.log('[PostLogin] Profile fetched, role:', role);
      } catch (profileErr) {
        console.warn('[PostLogin] Profile fetch failed:', profileErr);
        role = null;
      }

      // If profile isn't ready yet, retry a few times before failing
      if (!role) {
        for (let attempt = 1; attempt <= 5 && !role; attempt++) {
          await new Promise((r) => setTimeout(r, 300 * attempt));
          const { data: retryProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();
          role = retryProfile?.role ?? null;
        }
      }


        // Clear global timeout since we're about to redirect
        if (globalTimeoutRef.current) clearTimeout(globalTimeoutRef.current);

      if (!role) {
        console.warn('[PostLogin] No role found, redirecting to login.');
        if (globalTimeoutRef.current) clearTimeout(globalTimeoutRef.current);
        setFatal('Account details are still syncing. Please sign in again.');
        return;
      }

      const redirectPath = role === 'client' ? '/my-portal' : '/dashboard';
      console.log('[PostLogin] Redirecting to:', redirectPath, 'role:', role);



        // Redirect immediately
        window.location.href = redirectPath;

        // Fallback timer in case navigation is blocked.
        fallbackTimerRef.current = setTimeout(() => {
          console.log('[PostLogin] Fallback redirect to:', redirectPath);
          window.location.replace(redirectPath);
        }, 1500);
      } catch (e) {
        console.error('[PostLogin] Unexpected error:', e);
        if (globalTimeoutRef.current) clearTimeout(globalTimeoutRef.current);
        setFatal('Something went wrong finishing sign-in. Please try again.');
      }
    };

    run();

    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      if (globalTimeoutRef.current) clearTimeout(globalTimeoutRef.current);
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-8">
          <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
            {fatal ? (
              <AlertCircle className="h-8 w-8 text-red-600" />
            ) : (
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            )}
          </div>
          <h2 className="text-2xl font-bold mb-2">Signing you in…</h2>
          <p className="text-gray-600 mb-2">{fatal ? fatal : 'Just a moment while we finish setting up your session.'}</p>
          {!fatal && <p className="text-xs text-gray-400 mb-6">{details}</p>}

          <div className="space-y-3">
            <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
              Reload
            </Button>
            {fatal && (
              <>
                <Button onClick={() => router.replace('/login')} className="w-full">
                  Go to Login
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PostLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-8 pb-8">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Signing you in…</h2>
              <p className="text-gray-600">Please wait.</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <PostLoginContent />
    </Suspense>
  );
}
