import { supabase } from './supabase';
import { Alert } from 'react-native';

export interface SignUpData {
  email: string;
  password: string;
  username: string;
  displayName?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

/**
 * Sign up a new user
 */
export const signUp = async ({ email, password, username, displayName }: SignUpData) => {
  try {
    console.log('🔐 [AUTH] Starting signup for:', email);

    // Check if username is already taken
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (existingProfile) {
      throw new Error('Username already taken');
    }

    // Create auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName || username,
        },
      },
    });

    if (error) throw error;

    console.log('✅ [AUTH] Signup successful:', data.user?.id);
    return { user: data.user, session: data.session };
  } catch (error: any) {
    console.error('❌ [AUTH] Signup error:', error.message);
    throw error;
  }
};

/**
 * Log in existing user
 */
export const login = async ({ email, password }: LoginData) => {
  try {
    console.log('🔐 [AUTH] Starting login for:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    console.log('✅ [AUTH] Login successful:', data.user?.id);
    return { user: data.user, session: data.session };
  } catch (error: any) {
    console.error('❌ [AUTH] Login error:', error.message);
    throw error;
  }
};

/**
 * Log out current user
 */
export const logout = async () => {
  try {
    console.log('🔐 [AUTH] Logging out...');

    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    console.log('✅ [AUTH] Logout successful');
  } catch (error: any) {
    console.error('❌ [AUTH] Logout error:', error.message);
    throw error;
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) throw error;

    return user;
  } catch (error: any) {
    console.error('❌ [AUTH] Get user error:', error.message);
    return null;
  }
};

/**
 * Get user profile from database
 */
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return data;
  } catch (error: any) {
    console.error('❌ [AUTH] Get profile error:', error.message);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error: any) {
    console.error('❌ [AUTH] Update profile error:', error.message);
    throw error;
  }
};

/**
 * Reset password
 */
export const resetPassword = async (email: string) => {
  try {
    console.log('🔐 [AUTH] Sending password reset email to:', email);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'motosense://reset-password',
    });

    if (error) throw error;

    console.log('✅ [AUTH] Password reset email sent');
  } catch (error: any) {
    console.error('❌ [AUTH] Password reset error:', error.message);
    throw error;
  }
};
