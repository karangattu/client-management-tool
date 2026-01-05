'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (requiredRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .limit(1);

      // Handle PGRST116 error (0 rows returned) and other errors
      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('Profile not found for user:', userId);
          console.warn('This may happen if the user just signed up. The profile may be created asynchronously.');
          return null;
        }
        console.error('Error fetching profile for user', userId);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Full error:', JSON.stringify(error, null, 2));
        return null;
      }

      if (!data || data.length === 0) {
        console.warn('No profile data returned for user:', userId);
        console.warn('User ID:', userId);
        return null;
      }

      console.log('Profile fetched successfully:', data[0]);
      return data[0] as UserProfile;
    } catch (err) {
      console.error('Exception in fetchProfile:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Safety timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 10000)
        );

        const sessionPromise = supabase.auth.getSession();

        // Race the session fetch against the timeout
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Auth initialization error or timeout:', error);
        // On error/timeout, we must assume user is signed out so the app can render something
        // instead of getting stuck on "Loading..."
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // If we are already loading, we don't need to do anything as the initial check handles it
        // Check if we are past the initial load to update state

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // If profile is already loaded for this user, don't re-fetch unnecessarily
          if (!profile || profile.id !== session.user.id) {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
          }
        } else {
          setProfile(null);
        }

        // Always ensure loading is false after a state change event
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const hasPermission = (requiredRoles: UserRole[]) => {
    if (!profile) return false;
    return requiredRoles.includes(profile.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signOut,
        refreshProfile,
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
