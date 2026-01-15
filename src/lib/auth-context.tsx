'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export type UserRole = 'admin' | 'case_manager' | 'staff' | 'volunteer' | 'client';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  avatar_url?: string;
  profile_picture_url?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  retryAuth: () => Promise<void>;
  hasPermission: (requiredRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Maximum time to wait for initial auth before auto-recovery
const AUTH_INIT_TIMEOUT_MS = 20000; // 20 seconds
const MAX_RETRY_ATTEMPTS = 3;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initAttemptRef = useRef(0);
  const profileIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  // Memoize the Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .limit(1);

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('[Auth] Profile not found for user:', userId);
          return null;
        }
        console.error('[Auth] Error fetching profile:', error.code, error.message);
        return null;
      }

      if (!data || data.length === 0) {
        console.warn('[Auth] No profile data for user:', userId);
        return null;
      }

      return data[0] as UserProfile;
    } catch (err) {
      console.error('[Auth] Exception in fetchProfile:', err);
      return null;
    }
  }, [supabase]);

  const initializeAuth = useCallback(async (forceRefresh = false) => {
    // Prevent re-initialization if already completed (unless forced)
    if (isInitializedRef.current && !forceRefresh) {
      console.log('[Auth] Already initialized, skipping');
      return;
    }

    initAttemptRef.current += 1;
    const attemptNum = initAttemptRef.current;
    console.log(`[Auth] Initializing auth (attempt ${attemptNum}, forced: ${forceRefresh})...`);

    setLoading(true);
    setError(null);

    try {
      // Create an AbortController for the timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        // If forcing refresh, try to refresh the session first
        if (forceRefresh) {
          console.log('[Auth] Force refresh requested, attempting session refresh');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.warn('[Auth] Refresh failed during force init:', refreshError.message);
            // Continue with getSession fallback
          } else if (refreshData?.session) {
            clearTimeout(timeoutId);
            console.log('[Auth] Session refreshed successfully during init');
            
            setSession(refreshData.session);
            setUser(refreshData.session.user);
            
            const profileData = await fetchProfile(refreshData.session.user.id);
            setProfile(profileData);
            profileIdRef.current = profileData?.id || null;
            console.log('[Auth] Profile loaded after refresh:', profileData?.role || 'none');
            
            setError(null);
            isInitializedRef.current = true;
            return;
          }
        }
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        clearTimeout(timeoutId);

        if (sessionError) {
          console.error('[Auth] Session error:', sessionError);
          
          // If session retrieval fails, try one refresh attempt
          const { data: retryData, error: retryError } = await supabase.auth.refreshSession();
          if (!retryError && retryData?.session) {
            console.log('[Auth] Session recovered via refresh after error');
            setSession(retryData.session);
            setUser(retryData.session.user);
            
            const profileData = await fetchProfile(retryData.session.user.id);
            setProfile(profileData);
            profileIdRef.current = profileData?.id || null;
            
            setError(null);
            isInitializedRef.current = true;
            return;
          }
          
          throw sessionError;
        }

        console.log(`[Auth] Session retrieved:`, session ? 'logged in' : 'no session');

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
          profileIdRef.current = profileData?.id || null;
          console.log('[Auth] Profile loaded:', profileData?.role || 'none');
        } else {
          setProfile(null);
          profileIdRef.current = null;
        }

        setError(null);
        // Mark as initialized AFTER setting all state
        isInitializedRef.current = true;
      } catch (e) {
        clearTimeout(timeoutId);
        throw e;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown auth error';
      console.error('[Auth] Initialization failed:', errorMessage);

      // Clear auth state on error
      setSession(null);
      setUser(null);
      setProfile(null);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchProfile]);


  const retryAuth = useCallback(async () => {
    console.log('[Auth] Retrying authentication with force refresh...');
    isInitializedRef.current = false; // Reset to allow re-initialization
    await initializeAuth(true); // Force refresh on retry
  }, [initializeAuth]);


  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  }, [user, fetchProfile]);

  // Refresh session when it may be stale (e.g., after tab regains focus or periodically)
  const refreshSession = useCallback(async () => {
    // Don't try to refresh if there's no session
    const currentSession = await supabase.auth.getSession();
    if (!currentSession.data.session) {
      console.log('[Auth] No session to refresh, skipping');
      return;
    }

    console.log('[Auth] Refreshing session...');
    try {
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        // Handle refresh token errors gracefully
        if (refreshError.message?.includes('Refresh Token') ||
          refreshError.message?.includes('refresh_token') ||
          refreshError.message?.includes('Invalid Refresh Token') ||
          refreshError.message?.includes('Token expired')) {
          console.warn('[Auth] Session expired, clearing auth state');
          setSession(null);
          setUser(null);
          setProfile(null);
          profileIdRef.current = null;
          setError('Your session has expired. Please log in again.');
          return;
        }
        console.error('[Auth] Refresh error:', refreshError);
        return;
      }

      if (refreshedSession) {
        console.log('[Auth] Session refreshed successfully');
        setSession(refreshedSession);
        setUser(refreshedSession.user);
        setError(null);
      } else {
        // No session after refresh - user needs to log in
        console.log('[Auth] No session after refresh, user may need to log in');
        setSession(null);
        setUser(null);
        setProfile(null);
        profileIdRef.current = null;
      }
    } catch (err) {
      console.error('[Auth] Exception during session refresh:', err);
      // On exception, clear state to allow fresh login
      setSession(null);
      setUser(null);
      setProfile(null);
      profileIdRef.current = null;
      setError('Session error. Please log in again.');
    }
  }, [supabase.auth]);

  // Auto-recovery timeout - if loading takes too long, try to recover
  useEffect(() => {
    if (!loading) {
      // Clear any existing timeout when loading completes
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      retryCountRef.current = 0; // Reset retry count on success
      return;
    }

    // Set a timeout to auto-recover if loading takes too long
    initTimeoutRef.current = setTimeout(async () => {
      if (loading && retryCountRef.current < MAX_RETRY_ATTEMPTS) {
        retryCountRef.current += 1;
        console.warn(`[Auth] Loading timeout reached (attempt ${retryCountRef.current}/${MAX_RETRY_ATTEMPTS}), attempting recovery...`);
        
        // Force complete the loading state and try again
        isInitializedRef.current = false;
        
        // Try to recover
        try {
          await initializeAuth(true);
        } catch (e) {
          console.error('[Auth] Recovery attempt failed:', e);
          if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
            setError('Unable to connect to authentication service. Please check your connection and try again.');
            setLoading(false);
          }
        }
      } else if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
        console.error('[Auth] Max retry attempts reached, giving up');
        setError('Unable to connect to authentication service after multiple attempts.');
        setLoading(false);
      }
    }, AUTH_INIT_TIMEOUT_MS);

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
    };
  }, [loading, initializeAuth]);

  useEffect(() => {
    // Initial auth check
    initializeAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, newSession: Session | null) => {
        console.log('[Auth] Auth state changed:', event);

        // Skip INITIAL_SESSION - we handle this in initializeAuth to avoid race conditions
        if (event === 'INITIAL_SESSION') {
          console.log('[Auth] Skipping INITIAL_SESSION event (handled by initializeAuth)');
          return;
        }

        // Handle token refresh errors
        if (event === 'TOKEN_REFRESHED' && !newSession) {
          console.warn('[Auth] Token refresh failed, clearing state');
          setSession(null);
          setUser(null);
          setProfile(null);
          profileIdRef.current = null;
          setError('Session expired. Please log in again.');
          setLoading(false);
          return;
        }


        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Only fetch profile if it's a different user or we don't have one
          // Use ref to avoid dependency on profile state
          if (profileIdRef.current !== newSession.user.id) {
            const profileData = await fetchProfile(newSession.user.id);
            setProfile(profileData);
            profileIdRef.current = profileData?.id || null;
          }
        } else {
          setProfile(null);
          profileIdRef.current = null;
        }

        // Clear any previous errors on successful auth change
        setError(null);
        setLoading(false);
      }
    );

    // Refresh session when tab becomes visible again (user returns after being away)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[Auth] Tab became visible, checking session...');
        
        // Check if we have a session before trying to refresh
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          refreshSession();
        } else if (loading) {
          // If no session and still loading, might be stuck - try recovery
          console.warn('[Auth] No session found while loading, attempting recovery');
          isInitializedRef.current = false;
          initializeAuth(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic session refresh every 10 minutes to keep tokens fresh
    const refreshInterval = setInterval(async () => {
      // Check if we have a session before trying to refresh
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        console.log('[Auth] Periodic session refresh');
        refreshSession();
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(refreshInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    console.log('[Auth] Signing out...');
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setError(null);
    // Reset refs so re-login can re-initialize
    isInitializedRef.current = false;
    profileIdRef.current = null;
  }, [supabase.auth]);


  const hasPermission = useCallback((requiredRoles: UserRole[]) => {
    if (!profile) return false;
    return requiredRoles.includes(profile.role);
  }, [profile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        error,
        signOut,
        refreshProfile,
        retryAuth,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Role hierarchy for permission checks
export const roleHierarchy: Record<UserRole, number> = {
  admin: 4,
  case_manager: 3,
  staff: 2,
  volunteer: 1,
  client: 0,
};

export function canAccessFeature(userRole: UserRole, minimumRole: UserRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[minimumRole];
}
