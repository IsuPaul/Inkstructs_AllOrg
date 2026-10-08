import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Verifies an invite/magic-link/recovery token SERVER-SIDE, so the session
 * cookie is set before the browser ever renders a page. This avoids the
 * classic Next.js App Router failure mode where a client-side page "sees" a
 * session (from the URL hash) but the very next Server Action request
 * doesn't, because the cookie write and the request race each other.
 *
 * Requires the Supabase email template to link here instead of straight to
 * /auth/accept-invite — see README "Supabase email template" section.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/auth/accept-invite";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/accept-invite?error=invalid`);
}
