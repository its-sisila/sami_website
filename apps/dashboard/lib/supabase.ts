/**
 * Supabase Client Configuration
 * Browser-side Supabase client for authentication
 * Uses the SSR-compatible client for proper cookie-based session handling
 */

import { createClient } from '@/lib/supabase/client';

// Singleton-ish pattern - create client once per module
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
    if (!supabaseClient) {
        supabaseClient = createClient();
    }
    return supabaseClient;
}

export const supabase = getSupabaseClient();

/**
 * Get the current session's access token
 */
export async function getAccessToken(): Promise<string | null> {
    const client = getSupabaseClient();
    const { data: { session } } = await client.auth.getSession();
    return session?.access_token ?? null;
}

/**
 * Get the current user
 */
export async function getCurrentUser() {
    const client = getSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    return user;
}
