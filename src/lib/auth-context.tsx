'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export const validRoles = ['admin', 'case_manager', 'staff', 'volunteer'];
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initAttemptRef = useRef(0);
  const profileUserIdRef = useRef<string | null>(null); // Track which user ID the profile belongs to
  const isInitializedRef = useRef(false);
  const loadingRef = useRef(true); // Track loading state for safety timeout

  // Helper to update both loading state and ref
  const updateLoading = useCallback((value: boolean) => {
    loadingRef.current = value;
    setLoading(value);
  }, []);

  // Memoize the Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);

  const profileCacheRef = useRef<{ userId: string | null; profile: UserProfile | null; timestamp: number }>({
    userId: null,
    profile: null,
    timestamp: 0,
  });

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    console.log('[Auth] Fetching profile for user:', userId);

    const now = Date.now();
    if (profileCacheRef.current.userId === userId && now - profileCacheRef.current.timestamp < 60000) {
      console.log('[Auth] Returning cached profile');
      return profileCacheRef.current.profile;
    }

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      );
      
      const fetchPromise = supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, phone, profile_picture_url, is_active, created_at')
        .eq('id', userId)
        .limit(1);

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as Awaited<typeof fetchPromise>;

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('[Auth] Profile not found for user:', userId);
          return null;
        }
        console.error('[Auth] Error fetching profile:', error.code, error.message, error);
        return null;
      }

      if (!data || data.length === 0) {
        console.warn('[Auth] No profile data returned for user:', userId);
        return null;
      }

      console.log('[Auth] Profile fetched successfully:', data[0]?.role);
      profileCacheRef.current = {
        userId,
        profile: data[0] as UserProfile,
        timestamp: now,
      };
      return data[0] as UserProfile;
    } catch (err) {
      console.error('[Auth] Exception in fetchProfile:', err);
      return null;
    }
  }, [supabase]);

  const isInitializingRef = useRef(false);

  const initializeAuth = useCallback(async (forceRefresh = false) => {
    // Prevent concurrent initializations
    if (isInitializingRef.current && !forceRefresh) {
      console.log('[Auth] Initialization already in progress, skipping');
      return;
    }

    // Prevent re-initialization if already completed (unless forced)
    if (isInitializedRef.current && !forceRefresh) {
      console.log('[Auth] Already initialized, skipping');
      return;
    }

    isInitializingRef.current = true;
    initAttemptRef.current += 1;
    const attemptNum = initAttemptRef.current;
    console.log(`[Auth] Initializing auth (attempt ${attemptNum}, forced: ${forceRefresh})...`);

    updateLoading(true);
    setError(null);

    try {
      try {
        // If forcing refresh, try to refresh the session first
        if (forceRefresh) {
          console.log('[Auth] Force refresh requested, attempting session refresh');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError) {
            console.warn('[Auth] Refresh failed during force init:', refreshError.message);
            // Continue with getSession fallback
          } else if (refreshData?.session) {
            console.log('[Auth] Session refreshed successfully during init');

            setSession(refreshData.session);
            setUser(refreshData.session.user);

            const profileData = await fetchProfile(refreshData.session.user.id);
            setProfile(profileData);
            profileUserIdRef.current = refreshData.session.user.id;
            console.log('[Auth] Profile loaded after refresh:', profileData?.role || 'none');

            setError(null);
            isInitializedRef.current = true;
            return;
          }
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

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
            profileUserIdRef.current = retryData.session.user.id;

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
          console.log('[Auth] Fetching profile for user:', session.user.id);
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
          profileUserIdRef.current = session.user.id;
          if (profileData) {
            console.log('[Auth] Profile loaded successfully. Role:', profileData.role);
            setError(null);
          } else {
            console.warn('[Auth] Profile NOT found in database for authenticated user');
            setError('User profile record missing. Please contact administrator.');
          }
        } else {
          setProfile(null);
          profileUserIdRef.current = null;
          setError(null);
        }

        // Mark as initialized AFTER setting all state
        isInitializedRef.current = true;
      } catch (e) {
        throw e;
      }
    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || err.message?.includes('aborted'))) {
        console.warn('[Auth] Initialization aborted. Retrying in 500ms...');
        await new Promise(resolve => setTimeout(resolve, 500));
        isInitializingRef.current = false;
        return initializeAuth(forceRefresh);
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown auth error';
      console.error('[Auth] Initialization failed:', errorMessage);

      // Clear auth state on fatal error
      setSession(null);
      setUser(null);
      setProfile(null);
      setError(errorMessage);
    } finally {
      isInitializingRef.current = false;
      updateLoading(false);
    }
  }, [supabase, fetchProfile, updateLoading]);


  const retryAuth = useCallback(async () => {
    console.log('[Auth] Retrying authentication with force refresh...');
    // Clear profile cache to ensure fresh fetch
    profileCacheRef.current = { userId: null, profile: null, timestamp: 0 };
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
          profileUserIdRef.current = null;
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
        profileUserIdRef.current = null;
      }
    } catch (err) {
      console.error('[Auth] Exception during session refresh:', err);
      // On exception, clear state to allow fresh login
      setSession(null);
      setUser(null);
      setProfile(null);
      profileUserIdRef.current = null;
      setError('Session error. Please log in again.');
    }
  }, [supabase.auth]);

  useEffect(() => {
    // Initial auth check
    initializeAuth();

    // Safety timeout - ensure loading clears even if something goes wrong
    // This prevents infinite loading states
    const safetyTimeout = setTimeout(() => {
      if (loadingRef.current) {
        console.warn('[Auth] Safety timeout reached - clearing loading state');
        updateLoading(false);
      }
    }, 15000); // 15 seconds max for auth

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, newSession: Session | null) => {
        console.log('[Auth] Auth state changed:', event);

        // Skip INITIAL_SESSION and early SIGNED_IN - we handle initial state in initializeAuth
        // This prevents race conditions where onAuthStateChange fires before initializeAuth completes
        if (event === 'INITIAL_SESSION') {
          console.log('[Auth] Skipping INITIAL_SESSION event (handled by initializeAuth)');
          return;
        }
        
        // If we're still initializing and get SIGNED_IN, let initializeAuth handle it
        if (event === 'SIGNED_IN' && !isInitializedRef.current) {
          console.log('[Auth] Skipping early SIGNED_IN event (initializeAuth will handle it)');
          return;
        }

        // Handle token refresh errors
        if (event === 'TOKEN_REFRESHED' && !newSession) {
          console.warn('[Auth] Token refresh failed, clearing state');
          setSession(null);
          setUser(null);
          setProfile(null);
          profileUserIdRef.current = null;
          setError('Session expired. Please log in again.');
          updateLoading(false);
          return;
        }


        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Only fetch profile if it's a different user or we don't have one
          // Use ref to avoid dependency on profile state
          if (profileUserIdRef.current !== newSession.user.id) {
            const profileData = await fetchProfile(newSession.user.id);
            setProfile(profileData);
            profileUserIdRef.current = newSession.user.id;
          }
        } else {
          setProfile(null);
          profileUserIdRef.current = null;
        }

        // Clear any previous errors on successful auth change
        setError(null);
        updateLoading(false);
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

    // Periodic session refresh every 4 minutes to keep tokens fresh and prevent early logout
    const refreshInterval = setInterval(async () => {
      // Check if we have a session before trying to refresh
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        console.log('[Auth] Periodic session refresh');
        refreshSession();
      }
    }, 4 * 60 * 1000); // 4 minutes

    return () => {
      clearTimeout(safetyTimeout);
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
    profileUserIdRef.current = null;
    profileCacheRef.current = { userId: null, profile: null, timestamp: 0 };
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
  admin: 3,
  case_manager: 2,
  staff: 1,
  volunteer: 1,
  client: 0,
};

export function canAccessFeature(userRole: UserRole, minimumRole: UserRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[minimumRole];
}