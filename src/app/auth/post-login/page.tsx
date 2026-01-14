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
      const defaultRedirect =
        searchParams.get('default') === 'dashboard' ? '/dashboard' : '/my-portal';

      // Global timeout - if everything takes too long, redirect to default anyway
      globalTimeoutRef.current = setTimeout(() => {
        console.warn('[PostLogin] Global timeout reached, redirecting to default');
        window.location.href = defaultRedirect;
      }, 10000); // 10 second max

      try {
        // First check if we already have a session before trying to refresh
        setDetails('Checking session…');
        let session = (await supabase.auth.getSession()).data.session;

        // If no session yet, wait briefly for cookies to propagate (max 1.5s)
        if (!session?.user) {
          for (let attempt = 1; !session?.user && attempt <= 6; attempt++) {
            await new Promise((r) => setTimeout(r, 250));
            session = (await supabase.auth.getSession()).data.session;
          }
        }

        // Only attempt refresh if we have a session (to ensure tokens are fresh)
        if (session?.user) {
          setDetails('Refreshing session…');
          try {
            // Add timeout to prevent hanging
            const refreshPromise = supabase.auth.refreshSession();
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Refresh timeout')), 3000)
            );
            await Promise.race([refreshPromise, timeoutPromise]);
          } catch (e) {
            console.warn('[PostLogin] refreshSession failed (continuing):', e);
          }
          // Re-fetch session after refresh
          session = (await supabase.auth.getSession()).data.session;
        }

        if (!session?.user) {
          console.warn('[PostLogin] No session after waiting; sending to login');
          if (globalTimeoutRef.current) clearTimeout(globalTimeoutRef.current);
          setFatal('No active session found. Please sign in again.');
          return;
        }

        // Retry profile fetch for propagation/RLS timing (max ~3s total).
        setDetails('Loading your account…');
        let role: string | null = null;
        for (let attempt = 1; attempt <= 5; attempt++) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile?.role) {
            role = profile.role;
            break;
          }

          if (profileError) {
            console.warn('[PostLogin] profile fetch error (retrying):', profileError);
          }

          // Shorter delays: 200, 400, 600, 800ms
          await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
        }

        // Clear global timeout since we're about to redirect
        if (globalTimeoutRef.current) clearTimeout(globalTimeoutRef.current);

        const redirectPath = role === 'client' ? '/my-portal' : role ? '/dashboard' : defaultRedirect;
        console.log('[PostLogin] Redirecting to:', redirectPath, 'role:', role ?? 'unknown');

        // Redirect immediately
        window.location.href = redirectPath;

        // Fallback timer in case navigation is blocked.
        fallbackTimerRef.current = setTimeout(() => {
          window.location.replace(redirectPath);
        }, 2000);
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
