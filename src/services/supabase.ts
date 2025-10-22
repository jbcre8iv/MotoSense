import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found. Please set up .env file.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Types for our database
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
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
          favorite_riders: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          total_predictions?: number;
          accuracy_percentage?: number;
          racing_iq_level?: number;
          current_streak?: number;
          longest_streak?: number;
          total_points?: number;
          favorite_riders?: string[];
        };
        Update: {
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          total_predictions?: number;
          accuracy_percentage?: number;
          racing_iq_level?: number;
          current_streak?: number;
          longest_streak?: number;
          total_points?: number;
          favorite_riders?: string[];
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          avatar_url: string | null;
          owner_id: string;
          is_public: boolean;
          invite_code: string | null;
          max_members: number;
          created_at: string;
          updated_at: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          message: string;
          message_type: string;
          metadata: any;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
      };
      // Add more table types as needed
    };
  };
};

// Helper functions
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

console.log('✅ Supabase client initialized');
