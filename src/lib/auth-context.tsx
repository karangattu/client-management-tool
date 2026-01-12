'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initAttemptRef = useRef(0);
  const profileIdRef = useRef<string | null>(null);
  const supabase = createClient();

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

  const initializeAuth = useCallback(async () => {
    initAttemptRef.current += 1;
    const attemptNum = initAttemptRef.current;
    console.log(`[Auth] Initializing auth (attempt ${attemptNum})...`);
    
    setLoading(true);
    setError(null);

    try {
      // Create an AbortController for the timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        clearTimeout(timeoutId);

        if (sessionError) {
          console.error('[Auth] Session error:', sessionError);
          throw sessionError;
        }

        console.log(`[Auth] Session retrieved:`, session ? 'logged in' : 'no session');
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
          console.log('[Auth] Profile loaded:', profileData?.role || 'none');
        } else {
          setProfile(null);
        }
        
        setError(null);
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
    console.log('[Auth] Retrying authentication...');
    await initializeAuth();
  }, [initializeAuth]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    // Initial auth check
    initializeAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[Auth] Auth state changed:', event);
        
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

    return () => {
      subscription.unsubscribe();
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