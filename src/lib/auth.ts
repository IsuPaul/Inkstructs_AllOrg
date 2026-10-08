import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

/**
 * Fast path: reads the profile that middleware already verified and
 * forwarded via headers, instead of re-querying Supabase on every single
 * page load. Only carries id/name/email/role — enough for every layout and
 * most pages. Falls back to a real query if the headers are missing (e.g. a
 * route not covered by the middleware matcher), so this is never unsafe,
 * only faster in the common case.
 */
export async function requireProfile(): Promise<Profile> {
  const h = await headers();
  const id = h.get("x-profile-id");
  const role = h.get("x-profile-role") as UserRole | null;
  const organizationRole = h.get("x-organization-role") as UserRole | null;
  const name = h.get("x-profile-name");
  const email = h.get("x-profile-email");

  if (id && role && name && email) {
    return {
      id,
      full_name: decodeURIComponent(name),
      email: decodeURIComponent(email),
      role: organizationRole ?? role,
      avatar_url: null,
      bio: null,
      phone: null,
      date_of_birth: null,
      state_of_origin: null,
      created_at: "",
    };
  }

  return requireFullProfile();
}

/** Always hits the database. Use this only where every field is actually needed (the profile edit page). */
export async function requireFullProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) redirect("/login");

  return profile as Profile;
}
