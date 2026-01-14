'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const redirectWatchdogRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user is already authenticated and redirect them
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // User already has a valid session, redirect to post-login
          console.log('[Login] User already authenticated, redirecting...');
          window.location.href = '/auth/post-login?default=dashboard';
          return;
        }
      } catch (e) {
        console.warn('[Login] Error checking session:', e);
      }
      setCheckingSession(false);
    };

    checkExistingSession();
  }, []);

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setVerified(true);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (redirectWatchdogRef.current) {
      clearTimeout(redirectWatchdogRef.current);
    }

    try {
      const supabase = createClient();

      // Clear any existing stale session before attempting login
      // This prevents "Invalid Refresh Token" errors from stale cookies
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Ignore errors during signout - we're just clearing stale state
      }

      // Add a safety timeout to the login request itself
      const loginPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const timeoutPromise = new Promise<{ data: { session: unknown; user: unknown } | null; error: { message: string } | null }>((_, reject) =>
        setTimeout(() => reject(new Error('Login request timed out')), 30000)
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: signInError } = await Promise.race([loginPromise, timeoutPromise]) as { data: { session: unknown; user: { id: string } } | null; error: { message: string } | null };

      if (signInError) {
        throw new Error(signInError.message);
      }

      if (!data?.session || !data?.user) {
        throw new Error('Login succeeded but no session was created. Please try again.');
      }

      // Route through a dedicated post-login handler to avoid first-login races
      // (session propagation / profile RLS timing / navigation blocking).
      redirectWatchdogRef.current = setTimeout(async () => {
        try {
          const { data: check } = await supabase.auth.getSession();
          if (check.session) {
            window.location.href = '/auth/post-login?default=dashboard';
            return;
          }
        } catch {
          // Ignore and fall through.
        }
        setLoading(false);
        setError('Sign-in did not complete. Please try again.');
      }, 8000);

      window.location.href = '/auth/post-login?default=dashboard';

    } catch (err) {
      console.error('Login error:', err);
      // More specific error message if it's an AuthApiError
      if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials')) {
          setError('Invalid email or password.');
        } else if (err.message.includes('timed out')) {
          setError('Login timed out. Please check your connection and try again.');
        } else if (err.message.includes('Email not confirmed')) {
          setError('Please verify your email address before logging in.');
        } else if (err.message.includes('Refresh Token') || err.message.includes('refresh_token')) {
          // This shouldn't happen often now with the signOut before login, but just in case
          setError('Session expired. Please try again.');
        } else {
          setError(err.message || 'An unexpected error occurred. Please try again.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      // Ensure loading is turned off on error
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (redirectWatchdogRef.current) {
        clearTimeout(redirectWatchdogRef.current);
      }
    };
  }, []);

  // Show loading while checking for existing session
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Checking session...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <Users className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to ClientHub</CardTitle>
          <CardDescription>
            Sign in to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {verified && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Email verified successfully! You can now log in to your account.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-gray-500">
              Are you a client?{' '}
              <Link href="/client-portal" className="text-blue-600 hover:underline font-medium">
                Self-service registration
              </Link>
            </p>
          </div>

          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              <strong>Staff:</strong> Contact your administrator if you need an account.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
