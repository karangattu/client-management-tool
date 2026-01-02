'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabase = createClient();

        // Handle the auth callback
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
              
              if (profile?.role === 'client') {
                router.push('/my-portal');
              } else {
                router.push('/dashboard');
              }
              router.refresh();
            } catch (error) {
              console.error('Error checking user role:', error);
              router.push('/dashboard');
              router.refresh();
            }
          };

          setTimeout(checkUserTypeAndRedirect, 2000);
        } else {
          // No session found - might be a new signup that needs login
          setStatus('success');
          setMessage('Email verified! Please log in to continue.');

          // Redirect to login after a short delay
          setTimeout(() => {
            router.push('/login?verified=true');
            router.refresh();
          }, 2000);
        }
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try logging in manually.');
      }
    };

    handleAuthCallback();
  }, [router]);

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