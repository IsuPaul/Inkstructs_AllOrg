"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createDirectUpload, deleteMuxAsset, muxConfigured, muxSigningConfigured } from "@/lib/mux";

async function clearExistingAsset(lessonId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("assets")
    .select("id, storage_path, mux_asset_id")
    .eq("lesson_id", lessonId);

  for (const row of existing ?? []) {
    if (row.storage_path) await supabase.storage.from("course-materials").remove([row.storage_path]);
    if (row.mux_asset_id) await deleteMuxAsset(row.mux_asset_id);
  }
  if (existing && existing.length > 0) {
    await supabase.from("assets").delete().eq("lesson_id", lessonId);
  }
}

/** Step 1 of a video upload: create the Mux direct-upload URL the browser will PUT the file to. */
export async function createVideoUpload(lessonId: string) {
  if (!muxConfigured()) {
    return { error: "Video hosting isn't set up yet. Add MUX_TOKEN_ID and MUX_TOKEN_SECRET to .env.local." };
  }

  const supabase = await createClient();
  await clearExistingAsset(lessonId);

  const { data: assetRow, error: insertError } = await supabase
    .from("assets")
    .insert({ lesson_id: lessonId, video_source: "mux", mux_status: "preparing" })
    .select("id")
    .single();

  if (insertError || !assetRow) return { error: "Couldn't start the upload. Check you have permission on this course." };

  const { uploadUrl, uploadId } = await createDirectUpload(assetRow.id, muxSigningConfigured());
  await supabase.from("assets").update({ mux_upload_id: uploadId }).eq("id", assetRow.id);

  revalidatePath("/admin/courses", "layout");
  revalidatePath("/teach", "layout");
  return { success: true, uploadUrl, assetId: assetRow.id };
}

/** Polled by the browser after the direct upload finishes, until Mux's webhook marks it ready. */
export async function getAssetStatus(assetId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("assets").select("mux_status, mux_playback_id").eq("id", assetId).single();
  return data ?? null;
}

export async function uploadLessonFile(lessonId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file first." };
  if (file.size > 50 * 1024 * 1024) return { error: "Please use a file under 50MB." };

  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("modules(weeks(course_id))")
    .eq("id", lessonId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const courseId = (lesson as any)?.modules?.weeks?.course_id;
  if (!courseId) return { error: "Couldn't find that lesson's course." };

  await clearExistingAsset(lessonId);

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${courseId}/${lessonId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("course-materials")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { error: "Upload failed. Try again." };

  const { error: insertError } = await supabase
    .from("assets")
    .insert({ lesson_id: lessonId, storage_path: path, mime_type: file.type, size_bytes: file.size });
  if (insertError) return { error: "Couldn't save the file record." };

  revalidatePath("/admin/courses", "layout");
  revalidatePath("/teach", "layout");
  return { success: true };
}

export async function deleteLessonAsset(lessonId: string) {
  await clearExistingAsset(lessonId);
  revalidatePath("/admin/courses", "layout");
  revalidatePath("/teach", "layout");
  return { success: true };
}
