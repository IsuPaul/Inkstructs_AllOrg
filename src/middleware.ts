import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { ROLE_HOME, type UserRole } from "@/lib/types";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/auth",
  "/forgot-password",
  "/api",
  "/account-deactivated",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function sectionRole(pathname: string): UserRole | null {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/teach")) return "instructor";
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/courses/")) return "student";
  return null;
}

// Headers used to forward the already-verified profile to Server Components,
// so every layout doesn't have to re-verify the session and re-query
// profiles on every single navigation (this was the main cause of slow
// page loads — 4 sequential Supabase round trips before a page even started
// its own queries). These are explicitly stripped from the incoming request
// first, so a client can never spoof them.
const PROFILE_HEADERS = ["x-profile-id", "x-profile-name", "x-profile-email", "x-profile-role"];

export async function middleware(request: NextRequest) {
  PROFILE_HEADERS.forEach((h) => request.headers.delete(h));

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refresh the session (required so server components see a valid cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return response;

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // One profile lookup, used both for role-gating below AND forwarded to
  // every Server Component via headers, instead of each layout fetching it
  // again itself.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active")
    .eq("id", user.id)
    .single();

  if (profile && !profile.is_active) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/account-deactivated";
    return NextResponse.redirect(url);
  }

  const role = (profile?.role ?? "student") as UserRole;

  const required = sectionRole(pathname);
  if (required && role !== required && role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[role];
    return NextResponse.redirect(url);
  }

  if (profile) {
    request.headers.set("x-profile-id", profile.id);
    request.headers.set("x-profile-name", encodeURIComponent(profile.full_name));
    request.headers.set("x-profile-email", encodeURIComponent(profile.email));
    request.headers.set("x-profile-role", profile.role);

    // Rebuilding the response is required for the header mutation above to
    // actually reach the Server Component render. Any cookies Supabase
    // queued on the original response (e.g. a refreshed auth token) are
    // carried over so a token refresh is never lost.
    const carriedCookies = response.cookies.getAll();
    response = NextResponse.next({ request });
    carriedCookies.forEach((c) => response.cookies.set(c));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every path except static assets and image optimization files.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
