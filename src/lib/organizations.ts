import { createClient } from "@/lib/supabase/server";

export type OrganizationBrand = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  custom_domain: string | null;
};

export async function getOrganizationBySlug(slug: string): Promise<OrganizationBrand | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("organizations").select("id, name, slug, logo_url, primary_color, custom_domain").eq("slug", slug).maybeSingle();
  return data as OrganizationBrand | null;
}
