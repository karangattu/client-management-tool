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

        if (code) {
          // Exchange the code for a session
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            setStatus('error');
            setMessage('Failed to verify email. Please try again or contact support.');
            return;
          }
        }

        // Get the current session
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          setMessage(error.message);
          return;
        }

        if (data.session) {
          setStatus('success');
          setMessage('Email verified successfully!');

          // Check if user is a client or staff and redirect appropriately
          const checkUserTypeAndRedirect = async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.session.user.id)
                .single();
              
              const redirectPath = profile?.role === 'client' ? '/my-portal' : '/dashboard';
              // Use window.location for a full page navigation to ensure clean state
              window.location.href = redirectPath;
            } catch (error) {
              console.error('Error checking user role:', error);
              window.location.href = '/dashboard';
            }
          };

          setTimeout(checkUserTypeAndRedirect, 1500);
        } else {
          // No session found - might be a new signup that needs login
          setStatus('success');
          setMessage('Email verified! Please log in to continue.');

          // Redirect to login after a short delay using window.location for clean state
          setTimeout(() => {
            window.location.href = '/login?verified=true';
          }, 1500);
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