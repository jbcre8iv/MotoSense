import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';
import { notificationService } from '../services/notificationService';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  total_predictions: number;
  accuracy_percentage: number;
  racing_iq_level: number;
  current_streak: number;
  longest_streak: number;
  total_points: number;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user profile from database
  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      console.log('👤 [AUTH] Profile loaded:', data.username);
      setProfile(data);

      // Initialize push notifications for this user
      initializeNotifications(userId);
    } catch (error) {
      console.error('❌ [AUTH] Error loading profile:', error);
      setProfile(null);
    }
  };

  // Initialize push notifications
  const initializeNotifications = async (userId: string) => {
    try {
      console.log('🔔 [AUTH] Initializing notifications for user');
      await notificationService.registerForPushNotifications();
    } catch (error) {
      console.error('❌ [AUTH] Error initializing notifications:', error);
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log('🔐 [AUTH] Initializing auth state...');

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        loadProfile(session.user.id);
      }

      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('🔐 [AUTH] Auth state changed:', _event);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('❌ [AUTH] Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
