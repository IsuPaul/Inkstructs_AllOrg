import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * ONLY use this in trusted server code: invite flows, payment webhooks,
 * certificate issuance, admin-only Server Actions. Never import this file
 * from a Client Component, and never send this key to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
