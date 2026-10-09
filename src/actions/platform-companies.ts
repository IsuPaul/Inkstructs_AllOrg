"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import { env } from "@/lib/env";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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
    const deployment = await deployResponse.json() as { id?: string; url?: string; alias?: string[]; error?: { message?: string } };
    if (!deployResponse.ok) throw new Error(deployment.error?.message || `Vercel deployment failed (${deployResponse.status}).`);
    const stableAlias = deployment.alias?.find((alias) => alias.endsWith(".vercel.app")) || deployment.alias?.[0];
    const deploymentHost = stableAlias || deployment.url;
    const deploymentUrl = deploymentHost ? (deploymentHost.startsWith("http") ? deploymentHost : `https://${deploymentHost}`) : null;
    if (!deploymentUrl) throw new Error("Vercel deployment returned no deployment URL.");
    const authRedirects = `${deploymentUrl}/auth/accept-invite,${deploymentUrl}/auth/confirm,${deploymentUrl}/auth/reset-password,${deploymentUrl}/**`;
    const authResponse = await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(company.supabase_project_ref)}/config/auth`, { method: "PATCH", headers: { Authorization: `Bearer ${env.supabaseManagementToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ site_url: deploymentUrl, uri_allow_list: authRedirects }), cache: "no-store" });
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

export async function initializePlatformCompany(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Only platform administrators can initialize companies." };
  const id = String(formData.get("id") || "");
  const admin = createAdminClient();
  const { data: company, error } = await admin.from("platform_companies").select("id, name, slug, admin_email, supabase_project_ref, deployment_url").eq("id", id).single();
  if (error || !company) return { error: error?.message || "Company was not found." };
  if (!company.supabase_project_ref) return { error: "Create the Supabase project before initialization." };
  try {
    const managementToken = env.supabaseManagementToken();
    const headers = { Authorization: `Bearer ${managementToken}`, "Content-Type": "application/json" };
    let healthy = false;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const projectResponse = await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(company.supabase_project_ref)}`, { headers: { Authorization: `Bearer ${managementToken}` }, cache: "no-store" });
      const project = await projectResponse.json().catch(() => null) as { status?: string; message?: string } | null;
      if (projectResponse.ok && project?.status === "ACTIVE_HEALTHY") {
        healthy = true;
        break;
      }
      if (!projectResponse.ok && project?.message) throw new Error(`Could not check Supabase project status: ${project.message}`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    if (!healthy) throw new Error("The Supabase project is not healthy yet. Try initialization again shortly.");
    const githubHeaders = { Authorization: `Bearer ${env.githubToken()}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    const repoPath = env.customerTemplateRepo();
    const branch = env.customerTemplateBranch();
    const listingResponse = await fetch(`https://api.github.com/repos/${repoPath}/contents/supabase/migrations?ref=${encodeURIComponent(branch)}`, { headers: githubHeaders, cache: "no-store" });
    const migrationListing = await listingResponse.json().catch(() => null) as Array<{ name?: string }> | { message?: string } | null;
    if (!listingResponse.ok || !Array.isArray(migrationListing)) throw new Error(`Could not read customer migrations from GitHub: ${(migrationListing as { message?: string } | null)?.message || `HTTP ${listingResponse.status}`}`);
    const migrationFiles = migrationListing.map((entry) => entry.name || "").filter((file) => /^00(0[1-9]|1[01])_.+\.sql$/.test(file)).sort();
    if (migrationFiles.length !== 11) throw new Error(`Expected 11 customer migrations (0001–0011), found ${migrationFiles.length}.`);
    for (const file of migrationFiles) {
      const fileResponse = await fetch(`https://api.github.com/repos/${repoPath}/contents/supabase/migrations/${encodeURIComponent(file)}?ref=${encodeURIComponent(branch)}`, { headers: githubHeaders, cache: "no-store" });
      const filePayload = await fileResponse.json().catch(() => null) as { content?: string; message?: string } | null;
      if (!fileResponse.ok || !filePayload?.content) throw new Error(`Could not read migration ${file}: ${filePayload?.message || `HTTP ${fileResponse.status}`}`);
      const query = Buffer.from(filePayload.content.replace(/\s/g, ""), "base64").toString("utf8");
      const migrationResponse = await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(company.supabase_project_ref)}/database/migrations`, { method: "POST", headers, body: JSON.stringify({ name: file.replace(/\.sql$/, ""), query }), cache: "no-store" });
      const migrationPayload = await migrationResponse.json().catch(() => null) as { message?: string } | null;
      if (!migrationResponse.ok) throw new Error(`Migration ${file} failed: ${migrationPayload?.message || `HTTP ${migrationResponse.status}`}`);
    }
    const keysResponse = await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(company.supabase_project_ref)}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${managementToken}` }, cache: "no-store" });
    const keys = await keysResponse.json().catch(() => null) as Array<{ name?: string; type?: string; api_key?: string; key?: string }> | null;
    const secretKey = keys?.find((key) => key.type === "secret" || key.name === "service_role")?.api_key || keys?.find((key) => key.type === "secret" || key.name === "service_role")?.key;
    if (!keysResponse.ok || !secretKey) throw new Error("Could not retrieve a server key for the customer project.");
    const customer = createClient(`https://${company.supabase_project_ref}.supabase.co`, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: deploymentRecord } = await admin.from("platform_companies").select("vercel_deployment_url").eq("id", id).single();
    const customerUrl = deploymentRecord?.vercel_deployment_url || company.deployment_url || env.siteUrl();
    const invite = await customer.auth.admin.inviteUserByEmail(company.admin_email, { data: { full_name: company.name, role: "admin" }, redirectTo: `${customerUrl}/auth/accept-invite` });
    if (invite.error && !invite.error.message.toLowerCase().includes("already registered")) throw new Error(`Administrator invitation failed: ${invite.error.message}`);
    await admin.from("platform_companies").update({ status: "ready", provisioning_notes: "Customer migrations applied and administrator invitation sent.", updated_at: new Date().toISOString() }).eq("id", id);
    revalidatePath("/admin/platform/companies");
    return { success: true };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Customer initialization failed.";
    await admin.from("platform_companies").update({ status: "failed", provisioning_notes: message, updated_at: new Date().toISOString() }).eq("id", id);
    revalidatePath("/admin/platform/companies");
    return { error: message };
  }
}

export async function syncPlatformCompanyAuthUrl(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Only platform administrators can update company Auth URLs." };
  const id = String(formData.get("id") || "");
  const admin = createAdminClient();
  const { data: company, error } = await admin.from("platform_companies").select("id, supabase_project_ref, vercel_deployment_url, deployment_url").eq("id", id).single();
  if (error || !company) return { error: error?.message || "Company was not found." };
  const requestedUrl = String(formData.get("site_url") || "").trim();
  const siteUrl = (requestedUrl || company.vercel_deployment_url || company.deployment_url || "").replace(/\/$/, "");
  if (!company.supabase_project_ref || !siteUrl) return { error: "The company needs a Supabase project and Vercel deployment URL first." };
  const authRedirects = `${siteUrl}/auth/accept-invite,${siteUrl}/auth/confirm,${siteUrl}/auth/reset-password,${siteUrl}/**`;
  const response = await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(company.supabase_project_ref)}/config/auth`, { method: "PATCH", headers: { Authorization: `Bearer ${env.supabaseManagementToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ site_url: siteUrl, uri_allow_list: authRedirects }), cache: "no-store" });
  const payload = await response.json().catch(() => null) as { message?: string } | null;
  if (!response.ok) return { error: payload?.message || `Supabase Auth configuration failed (${response.status}).` };
  await admin.from("platform_companies").update({ provisioning_notes: `Supabase Auth Site URL synchronized to ${siteUrl}.`, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/platform/companies");
  return { success: true };
}
