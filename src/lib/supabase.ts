import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Values come from .env (see .env.example). EXPO_PUBLIC_ vars are bundled into
// the app, so only ever put the public publishable key here.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Supabase "Publishable key" (sb_publishable_...). Never the secret key.
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        // Keeps the staff login across app restarts (localStorage on web).
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;
