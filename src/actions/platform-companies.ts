"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import { env } from "@/lib/env";
import crypto from "node:crypto";

export async function createPlatformCompany(_previousState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Only platform administrators can create companies." };
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  const adminEmail = String(formData.get("admin_email") || "").trim().toLowerCase();
  const plan = String(formData.get("subscription_plan") || "").trim() || null;
  if (!name || !slug || !adminEmail) return { error: "Company name, slug, and administrator email are required." };
  const { error } = await createAdminClient().from("platform_companies").insert({ name, slug, admin_email: adminEmail, subscription_plan: plan, status: "queued", provisioning_notes: "Waiting for provisioning credentials or manual setup." });
  if (error) return { error: error.message };
  revalidatePath("/admin/platform/companies");
  return { success: true };
}

export async function updatePlatformCompanyStatus(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Only platform administrators can update companies." };
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "queued");
  const notes = String(formData.get("provisioning_notes") || "");
  const { error } = await createAdminClient().from("platform_companies").update({ status, provisioning_notes: notes, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/platform/companies");
  return { success: true };
}

export async function provisionPlatformCompany(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Only platform administrators can provision companies." };
  const id = String(formData.get("id") || "");
  if (!id) return { error: "Company ID is required." };
  const admin = createAdminClient();
  const { data: company, error: lookupError } = await admin.from("platform_companies").select("id, name, slug, status, supabase_project_ref").eq("id", id).single();
  if (lookupError || !company) return { error: lookupError?.message || "Company was not found." };
  if (company.supabase_project_ref) return { error: "This company already has a Supabase project reference." };
  await admin.from("platform_companies").update({ status: "provisioning", provisioning_notes: "Creating Supabase project...", updated_at: new Date().toISOString() }).eq("id", id);
  try {
    const response = await fetch("https://api.supabase.com/v1/projects", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.supabaseManagementToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: company.name, organization_slug: env.supabaseOrganizationSlug(), region: process.env.SUPABASE_DEFAULT_REGION || "eu-west-1", plan: "free", db_pass: crypto.randomBytes(24).toString("base64url") }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null) as { id?: string; ref?: string; project_ref?: string; message?: string } | null;
    if (!response.ok) throw new Error(payload?.message || `Supabase returned HTTP ${response.status}.`);
    const projectRef = payload?.ref || payload?.id || payload?.project_ref;
    if (!projectRef) throw new Error("Supabase created the project but returned no project reference.");
    await admin.from("platform_companies").update({ supabase_project_ref: projectRef, status: "ready", provisioning_notes: "Supabase project created. Database migrations and deployment setup are still pending.", updated_at: new Date().toISOString() }).eq("id", id);
    revalidatePath("/admin/platform/companies");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase project provisioning failed.";
    await admin.from("platform_companies").update({ status: "failed", provisioning_notes: message, updated_at: new Date().toISOString() }).eq("id", id);
    revalidatePath("/admin/platform/companies");
    return { error: message };
  }
}

export async function deployPlatformCompany(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Only platform administrators can deploy companies." };
  const id = String(formData.get("id") || "");
  const admin = createAdminClient();
  const { data: company, error } = await admin.from("platform_companies").select("id, name, slug, supabase_project_ref, vercel_project_id").eq("id", id).single();
  if (error || !company) return { error: error?.message || "Company was not found." };
  if (!company.supabase_project_ref) return { error: "Create the Supabase project before deploying to Vercel." };
  if (company.vercel_project_id) return { error: "This company already has a Vercel project." };
  await admin.from("platform_companies").update({ status: "provisioning", provisioning_notes: "Creating Vercel project and deployment...", updated_at: new Date().toISOString() }).eq("id", id);
  const headers = { Authorization: `Bearer ${env.vercelToken()}`, "Content-Type": "application/json" };
  const query = env.vercelTeamId() ? `?teamId=${encodeURIComponent(env.vercelTeamId() as string)}` : "";
  try {
    const projectResponse = await fetch(`https://api.vercel.com/v11/projects${query}`, { method: "POST", headers, body: JSON.stringify({ name: company.slug, framework: "nextjs", gitRepository: { type: "github", repo: env.vercelGitRepo() } }), cache: "no-store" });
    const project = await projectResponse.json() as { id?: string; name?: string; error?: { message?: string } };
    if (!projectResponse.ok) throw new Error(project.error?.message || `Vercel project creation failed (${projectResponse.status}).`);
    const projectId = project.id || project.name || company.slug;
    const keysResponse = await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(company.supabase_project_ref)}/api-keys`, { headers: { Authorization: `Bearer ${env.supabaseManagementToken()}` }, cache: "no-store" });
    const keys = await keysResponse.json().catch(() => null) as Array<{ name?: string; type?: string; api_key?: string; key?: string }> | null;
    const anonKey = keys?.find((key) => key.name === "anon" || key.type === "anon")?.api_key || keys?.find((key) => key.name === "anon" || key.type === "anon")?.key;
    if (!keysResponse.ok || !anonKey) throw new Error("Could not retrieve the new Supabase project's anon key.");
    const envResponse = await fetch(`https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/env${query ? `${query}&upsert=true` : "?upsert=true"}`, { method: "POST", headers, body: JSON.stringify([{ key: "NEXT_PUBLIC_SUPABASE_URL", value: `https://${company.supabase_project_ref}.supabase.co`, type: "plain", target: ["production", "preview"] }, { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: anonKey, type: "encrypted", target: ["production", "preview"] }]), cache: "no-store" });
    if (!envResponse.ok) throw new Error(`Vercel environment setup failed (${envResponse.status}).`);
    const deployResponse = await fetch(`https://api.vercel.com/v13/deployments${query}`, { method: "POST", headers, body: JSON.stringify({ name: company.slug, project: projectId, target: "production", gitSource: { type: "github", repo: env.vercelGitRepo().split("/").pop(), ref: env.vercelGitBranch(), org: env.vercelGitRepo().split("/")[0] } }), cache: "no-store" });
    const deployment = await deployResponse.json() as { id?: string; url?: string; error?: { message?: string } };
    if (!deployResponse.ok) throw new Error(deployment.error?.message || `Vercel deployment failed (${deployResponse.status}).`);
    const deploymentUrl = deployment.url ? (deployment.url.startsWith("http") ? deployment.url : `https://${deployment.url}`) : null;
    if (!deploymentUrl) throw new Error("Vercel deployment returned no deployment URL.");
    const authResponse = await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(company.supabase_project_ref)}/config/auth`, { method: "PATCH", headers: { Authorization: `Bearer ${env.supabaseManagementToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ site_url: deploymentUrl, additional_redirect_urls: [`${deploymentUrl}/**`] }), cache: "no-store" });
    const authPayload = await authResponse.json().catch(() => null) as { message?: string } | null;
    if (!authResponse.ok) throw new Error(authPayload?.message || `Supabase Auth configuration failed (${authResponse.status}).`);
    await admin.from("platform_companies").update({ vercel_project_id: projectId, vercel_deployment_id: deployment.id, vercel_deployment_url: deploymentUrl, deployment_url: deploymentUrl, status: "ready", provisioning_notes: "Vercel deployment started and Supabase Auth Site URL was updated. Customer migrations and administrator setup are still pending.", updated_at: new Date().toISOString() }).eq("id", id);
    revalidatePath("/admin/platform/companies");
    return { success: true };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Vercel deployment failed.";
    await admin.from("platform_companies").update({ status: "failed", provisioning_notes: message, updated_at: new Date().toISOString() }).eq("id", id);
    revalidatePath("/admin/platform/companies");
    return { error: message };
  }
}
