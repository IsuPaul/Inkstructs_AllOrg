import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME, type UserRole } from "@/lib/types";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `/org/${slug}/enter`);
    return NextResponse.redirect(login);
  }
  const { data: organization } = await supabase.from("organizations").select("id, is_active").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!organization) return NextResponse.redirect(new URL("/account-deactivated", request.url));
  const { data: membership } = await supabase.from("organization_members").select("role").eq("organization_id", organization.id).eq("user_id", user.id).maybeSingle();
  if (!membership) return NextResponse.redirect(new URL("/organizations?error=not-a-member", request.url));
  const response = NextResponse.redirect(new URL(ROLE_HOME[membership.role as UserRole], request.url));
  response.cookies.set("active_organization_id", organization.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  return response;
}
