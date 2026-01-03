'use client';

import { useEffect, useState, Suspense } from 'react';
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

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabase = createClient();

        // Get the code from URL params (Supabase sends this after email verification)
        const code = searchParams.get('code');

        if (!code) {
          // No code provided, check if already authenticated
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            // Already authenticated, redirect based on role
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', data.session.user.id)
              .single();

            const redirectPath = profile?.role === 'client' ? '/my-portal' : '/dashboard';
            window.location.href = redirectPath;
          }
          return;
        }

        // Exchange the code for a session
        const { error: exchangeError, data: authData } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('Code exchange error:', exchangeError);
          setStatus('error');
          setMessage('Failed to verify email. Please try again or contact support.');
          return;
        }

        // Clear the code from URL immediately after successful exchange
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (authData?.session) {
          setStatus('success');
          setMessage('Email verified successfully!');

          const userId = authData.session.user.id;

          try {
            // Retry logic for profile fetch to handle potential race conditions
            // (profile may not be immediately accessible due to RLS/session propagation)
            let profile = null;
            let attempts = 0;
            const maxAttempts = 3;

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
                await new Promise(resolve => setTimeout(resolve, 500));
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
                const { data: clientData } = await supabase
                  .from('clients')
                  .select('id, signed_engagement_letter_at')
                  .eq('portal_user_id', userId)
                  .single();

                if (clientData) {
                  // Import and call the task creation action
                  const { createClientOnboardingTasks } = await import('@/app/actions/tasks');
                  await createClientOnboardingTasks(clientData.id, userId);
                }
              } catch (taskError) {
                console.error('Error creating onboarding tasks:', taskError);
                // Continue with redirect even if task creation fails
              }
            }

            const redirectPath = profile?.role === 'client' ? '/my-portal' : '/dashboard';
            window.location.href = redirectPath;
          } catch (error) {
            console.error('Error checking user role:', error);
            // Default to my-portal for verified users coming from email
            window.location.href = '/my-portal';
          }
        } else {
          // Session exchange succeeded but no session in response
          setStatus('success');
          setMessage('Email verified! Logging you in...');

          // Try to get session after a brief moment
          setTimeout(async () => {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session) {
              try {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('role')
                  .eq('id', sessionData.session.user.id)
                  .single();

                const redirectPath = profile?.role === 'client' ? '/my-portal' : '/dashboard';
                window.location.href = redirectPath;
              } catch (error) {
                console.error('Error checking user role:', error);
                window.location.href = '/dashboard';
              }
            }
          }, 500);
        }
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try logging in manually.');
      }
    };

    handleAuthCallback();
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
            <p className="text-sm text-gray-500 mb-4">
              Redirecting you now...
            </p>
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