'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, LogOut, Wifi, WifiOff } from 'lucide-react';
import { AppHeader } from './AppHeader';

// Maximum time to wait for auth before showing recovery options
const AUTH_TIMEOUT_MS = 15000; // 15 seconds
const STUCK_CHECK_INTERVAL_MS = 5000; // Check every 5 seconds

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'case_manager' | 'staff' | 'volunteer' | 'client';
  redirectTo?: string;
  fallbackTitle?: string;
}

type LimboReason = 
  | 'auth_timeout'      // Auth loading took too long
  | 'profile_missing'   // User exists but no profile
  | 'network_error'     // Network connectivity issue
  | 'session_stale'     // Session exists but may be stale
  | 'unknown';          // Unknown issue

interface LimboState {
  isInLimbo: boolean;
  reason: LimboReason;
  duration: number;
}

export function AuthGuard({ 
  children, 
  requiredRole,
  redirectTo = '/login',
  fallbackTitle = 'Loading'
}: AuthGuardProps) {
  const { user, profile, loading, error, signOut, retryAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [limbo, setLimbo] = useState<LimboState>({ isInLimbo: false, reason: 'unknown', duration: 0 });
  const [loadingStartTime] = useState(() => Date.now());
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Detect limbo states
  useEffect(() => {
    const checkForLimbo = () => {
      const duration = Date.now() - loadingStartTime;
      
      // Network offline
      if (!isOnline) {
        setLimbo({ isInLimbo: true, reason: 'network_error', duration });
        return;
      }
      
      // Auth error state
      if (error) {
        setLimbo({ isInLimbo: true, reason: 'unknown', duration });
        return;
      }
      
      // Loading too long
      if (loading && duration > AUTH_TIMEOUT_MS) {
        setLimbo({ isInLimbo: true, reason: 'auth_timeout', duration });
        return;
      }
      
      // User exists but no profile (and not loading)
      if (!loading && user && !profile) {
        setLimbo({ isInLimbo: true, reason: 'profile_missing', duration });
        return;
      }
      
      // All good - clear limbo state
      if (!loading && (user === null || (user && profile))) {
        setLimbo({ isInLimbo: false, reason: 'unknown', duration: 0 });
      }
    };
    
    // Check immediately
    checkForLimbo();
    
    // Set up periodic checks while loading
    const interval = setInterval(checkForLimbo, STUCK_CHECK_INTERVAL_MS);
    
    return () => clearInterval(interval);
  }, [loading, user, profile, error, loadingStartTime, isOnline]);

  // Handle retry with loading state
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      await retryAuth();
    } finally {
      setIsRetrying(false);
    }
  }, [retryAuth]);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    await signOut();
    router.push(redirectTo);
  }, [signOut, router, redirectTo]);

  // Handle redirect to login
  const handleGoToLogin = useCallback(() => {
    const loginUrl = new URL(redirectTo, window.location.origin);
    loginUrl.searchParams.set('redirect', pathname);
    router.push(loginUrl.toString());
  }, [router, redirectTo, pathname]);

  // Show limbo recovery UI
  if (limbo.isInLimbo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title={fallbackTitle} showBackButton={false} />
        <main className="container px-4 py-6 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {limbo.reason === 'network_error' ? (
                  <>
                    <WifiOff className="h-5 w-5 text-gray-500" />
                    <span className="text-gray-700">You&apos;re Offline</span>
                  </>
                ) : limbo.reason === 'auth_timeout' ? (
                  <>
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <span className="text-amber-700">Taking Longer Than Expected</span>
                  </>
                ) : limbo.reason === 'profile_missing' ? (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-red-700">Profile Not Found</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <span className="text-amber-700">Connection Issue</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Reason-specific messages */}
              {limbo.reason === 'network_error' && (
                <div className="space-y-3">
                  <p className="text-gray-600">
                    It looks like you&apos;ve lost your internet connection. Please check your network and try again.
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                    <WifiOff className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Waiting for connection...</span>
                  </div>
                </div>
              )}
              
              {limbo.reason === 'auth_timeout' && (
                <div className="space-y-3">
                  <p className="text-gray-600">
                    We&apos;re having trouble connecting to the authentication service. This is usually temporary.
                  </p>
                  <p className="text-sm text-gray-500">
                    Time elapsed: {Math.round(limbo.duration / 1000)}s
                  </p>
                </div>
              )}
              
              {limbo.reason === 'profile_missing' && (
                <div className="space-y-3">
                  <p className="text-gray-600">
                    We found your account but couldn&apos;t load your profile. This may happen if your account setup didn&apos;t complete properly.
                  </p>
                  <p className="text-sm text-gray-500">
                    If this persists, please contact support or try signing out and back in.
                  </p>
                </div>
              )}
              
              {limbo.reason === 'unknown' && error && (
                <div className="space-y-3">
                  <p className="text-gray-600">
                    We encountered an issue connecting to the server.
                  </p>
                  <p className="text-sm text-gray-500 bg-gray-100 p-2 rounded font-mono">
                    {error}
                  </p>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-2">
                {isOnline && (
                  <Button 
                    onClick={handleRetry} 
                    disabled={isRetrying}
                    className="w-full"
                  >
                    {isRetrying ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </>
                    )}
                  </Button>
                )}
                
                {(limbo.reason === 'profile_missing' || limbo.reason === 'unknown') && user && (
                  <Button 
                    onClick={handleSignOut} 
                    variant="destructive"
                    className="w-full"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out & Start Fresh
                  </Button>
                )}
                
                {!user && limbo.reason !== 'network_error' && (
                  <Button 
                    onClick={handleGoToLogin} 
                    variant="outline"
                    className="w-full"
                  >
                    Go to Login
                  </Button>
                )}
              </div>
              
              {/* Auto-retry indicator */}
              {isOnline && limbo.reason === 'auth_timeout' && (
                <p className="text-xs text-gray-400 text-center">
                  Will automatically retry when connection improves
                </p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Normal loading state (within acceptable time)
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title={fallbackTitle} showBackButton={false} />
        <main className="container px-4 py-6 max-w-7xl mx-auto">
          <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    // Use effect to handle redirect to avoid render-time navigation
    return <RedirectToLogin redirectTo={redirectTo} returnPath={pathname} />;
  }

  // Authenticated but role check failed
  if (requiredRole && profile?.role !== requiredRole) {
    // Admin check - admins can access everything
    if (profile?.role === 'admin') {
      return <>{children}</>;
    }
    
    // Role hierarchy check
    const roleHierarchy: Record<string, number> = {
      admin: 4,
      case_manager: 3,
      staff: 2,
      volunteer: 1,
      client: 0,
    };
    
    const userLevel = roleHierarchy[profile?.role || 'client'] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    if (userLevel >= requiredLevel) {
      return <>{children}</>;
    }
    
    // Insufficient permissions
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Access Denied" showBackButton />
        <main className="container px-4 py-6 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Insufficient Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                You don&apos;t have permission to access this page. Please contact an administrator if you believe this is an error.
              </p>
              <Button onClick={() => router.push('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // All checks passed - render children
  return <>{children}</>;
}

// Separate component to handle redirect with useEffect
function RedirectToLogin({ redirectTo, returnPath }: { redirectTo: string; returnPath: string }) {
  const router = useRouter();
  
  useEffect(() => {
    const loginUrl = new URL(redirectTo, window.location.origin);
    if (returnPath && returnPath !== '/') {
      loginUrl.searchParams.set('redirect', returnPath);
    }
    router.push(loginUrl.pathname + loginUrl.search);
  }, [router, redirectTo, returnPath]);
  
  // Show a brief loading state while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
        <p className="text-gray-500">Redirecting to login...</p>
      </div>
    </div>
  );
}

// Hook for checking auth status without the full guard
export function useAuthStatus() {
  const { user, profile, loading, error } = useAuth();
  const [isStuck, setIsStuck] = useState(false);
  const [loadingStart] = useState(() => Date.now());
  
  useEffect(() => {
    if (!loading) {
      setIsStuck(false);
      return;
    }
    
    const timeout = setTimeout(() => {
      if (loading) {
        setIsStuck(true);
      }
    }, AUTH_TIMEOUT_MS);
    
    return () => clearTimeout(timeout);
  }, [loading]);
  
  return {
    isAuthenticated: !!user && !!profile,
    isLoading: loading,
    isStuck,
    loadingDuration: Date.now() - loadingStart,
    hasError: !!error,
    error,
  };
}