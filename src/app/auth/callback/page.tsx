'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const processedCodeRef = useRef<string | null>(null);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabase = createClient();

        // Get the code from URL params (Supabase sends this after email verification)
        const code = searchParams.get('code');

        if (!code) {
          // No code provided, just redirect if session exists (handled below)
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', data.session.user.id)
              .single();

            const redirectPath = profile?.role === 'client' ? '/my-portal' : '/dashboard';
            window.location.href = redirectPath;
            return;
          }
          // If no code and no session, we stay here or could redirect to login
          // (Current logic returns, leaving loading state, maybe should redirect to login?)
          if (!data.session) {
            // If we loaded this page without code and without session, go to login
            router.push('/login');
          }
          return;
        }

        // Prevent double-processing of the same code (React Strict Mode fix)
        if (processedCodeRef.current === code) {
          console.log('Code already processing or processed:', code);
          return;
        }
        processedCodeRef.current = code;

        // Exchange the code for a session
        const { error: exchangeError, data: authData } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('Code exchange error:', exchangeError);

          // Check if we already have a valid session (code may have been used already)
          const { data: checkSession } = await supabase.auth.getSession();
          if (checkSession.session) {
            console.log('Session found despite exchange error, proceeding...');
            // Proceed as if success (fall through to success logic)
          } else {
            // If the error is about an already used code or invalid code, provide a helpful message
            const errorMsg = exchangeError.message?.toLowerCase() || '';
            if (errorMsg.includes('invalid') || errorMsg.includes('expired') || errorMsg.includes('already')) {
              setStatus('error');
              setMessage('This verification link has already been used or has expired. Please try logging in with your email and password.');
            } else {
              setStatus('error');
              setMessage(`Failed to verify email: ${exchangeError.message}`);
            }
            return;
          }
        }

        // Clear the code from URL immediately after successful exchange
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Get user from authData OR fetch fresh session
        let user = authData?.session?.user;
        if (!user) {
          const { data: freshSession } = await supabase.auth.getSession();
          user = freshSession.session?.user;
        }

        if (user) {
          setStatus('success');
          setMessage('Email verified successfully!');

          const userId = user.id;

          try {
            // Retry logic for profile fetch to handle potential race conditions
            // (profile may not be immediately accessible due to RLS/session propagation)
            let profile = null;
            let attempts = 0;
            const maxAttempts = 5;

            while (!profile && attempts < maxAttempts) {
              const { data: fetchedProfile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();

              if (fetchedProfile) {
                profile = fetchedProfile;
                break;
              }

              attempts++;
              if (attempts < maxAttempts) {
                // Progressive backoff
                await new Promise(resolve => setTimeout(resolve, 500 * attempts));
              }
            }

            if (!profile) {
              console.error('Profile not found after verification for user:', userId);
              // Still try to redirect - the profile might exist but RLS is blocking
              // Default to my-portal since this is the email verification flow (for clients)
              window.location.href = '/my-portal';
              return;
            }

            // If this is a client, create onboarding tasks
            if (profile?.role === 'client') {
              try {
                // Fetch client record to get client_id
                // Retry logic for client record fetch (robustness against replication lag)
                let clientData = null;
                let clientAttempts = 0;
                const maxClientAttempts = 5;

                while (!clientData && clientAttempts < maxClientAttempts) {
                  const { data: fetchedClient } = await supabase
                    .from('clients')
                    .select('id, signed_engagement_letter_at')
                    .eq('portal_user_id', userId)
                    .single();

                  if (fetchedClient) {
                    clientData = fetchedClient;
                    break;
                  }

                  clientAttempts++;
                  if (clientAttempts < maxClientAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 500 * clientAttempts));
                  }
                }

                if (clientData) {
                  // Import and call the task creation action
                  const { createClientOnboardingTasks } = await import('@/app/actions/tasks');
                  await createClientOnboardingTasks(clientData.id, userId);
                } else {
                  console.error('Client record not found after verification for user:', userId);
                  // We continue to redirect; the portal UI will handle the missing tasks/client gracefully now
                }
              } catch (taskError) {
                console.error('Error creating onboarding tasks:', taskError);
                // Continue with redirect even if task creation fails
              }
            }

            console.log("Auth callback verified; routing through post-login. Role:", profile?.role);

            // Route through post-login to avoid first-login/session propagation races.
            // Default to my-portal for verified links (client flow), but post-login will
            // redirect to dashboard for staff/admin roles.
            const postLoginUrl = '/auth/post-login?default=my-portal';

            // Redirect immediately - fallback timer only if immediate redirect fails
            window.location.href = postLoginUrl;

            // Fallback timer in case navigation is blocked (e.g., by browser extensions)
            redirectTimerRef.current = setTimeout(() => {
              console.log('Fallback redirect triggered');
              window.location.replace(postLoginUrl);
            }, 3000);
          } catch (error) {
            console.error('Error checking user role:', error);
            // Default to my-portal for verified users coming from email
            window.location.href = '/auth/post-login?default=my-portal';
          }
        }
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try logging in manually.');
      }
    };

    handleAuthCallback();
    
    // Cleanup timer on unmount
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, [router, searchParams]);

  const handleManualLogin = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-8">
          <div className="mb-6">
            {status === 'loading' && (
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold mb-2">
            {status === 'loading' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </h2>

          <p className="text-gray-600 mb-6">
            {message || 'Please wait while we verify your email address.'}
          </p>

          {status === 'loading' && (
            <p className="text-sm text-gray-500">
              This may take a moment...
            </p>
          )}

          {status === 'success' && (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Redirecting you now...
              </p>
              <p className="text-xs text-gray-400">
                If you are not redirected in a few seconds, please <button onClick={() => window.location.reload()} className="underline text-primary">refresh the page</button>.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                You can try logging in manually instead.
              </p>
              <Button onClick={handleManualLogin} className="w-full">
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Verifying Email...</h2>
            <p className="text-gray-600">Please wait while we verify your email address.</p>
          </CardContent>
        </Card>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
