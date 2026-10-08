/**
 * Creates the first Inkstructs admin account (Paul Inya Isu).
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts you@example.com "Paul Inya Isu"
 *
 * Requires .env.local with SUPABASE_SERVICE_ROLE_KEY set.
 * The account is created already-confirmed, with a password-reset email sent
 * so the admin can set their own password.
 */
// dotenv/config only loads a file literally named ".env" — this project
// (like Next.js itself) keeps secrets in ".env.local", so point at it explicitly.
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const [email, name] = process.argv.slice(2);
  if (!email || !name) {
    console.error('Usage: npx tsx scripts/seed-admin.ts you@example.com "Full Name"');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name, role: "admin" },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/accept-invite`,
  });

  if (error) {
    console.error("Failed to invite admin:", error.message);
    process.exit(1);
  }

  // The handle_new_user() trigger reads raw_user_meta_data.role, so this
  // account is created with role = 'admin' directly — no manual promotion needed.
  console.log(`Invite sent to ${email}. User id: ${data.user?.id}`);
  console.log("They'll receive an email to set their password and sign in.");
}

main();
