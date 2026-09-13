import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

/**
 * Must stay literal `process.env.EXPO_PUBLIC_...` member accesses, never an
 * alias or a computed key. See `src/lib/env.ts` for the full explanation:
 * babel-preset-expo's inliner rewrites only that exact shape at build time,
 * and Metro injects a runtime `process.env` object in development only, so
 * any other shape reads as undefined in a real production bundle.
 */
const hasProcessEnv = typeof process !== "undefined" && !!process.env;
const supabaseUrl = hasProcessEnv ? process.env.EXPO_PUBLIC_SUPABASE_URL : undefined;
const supabaseAnonKey = hasProcessEnv ? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY : undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in environment.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});
