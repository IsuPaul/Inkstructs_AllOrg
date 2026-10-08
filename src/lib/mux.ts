import "server-only";
import Mux from "@mux/mux-node";
import jwt from "jsonwebtoken";

export function muxConfigured() {
  return Boolean(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);
}

export function muxSigningConfigured() {
  return Boolean(process.env.MUX_SIGNING_KEY_ID && process.env.MUX_SIGNING_KEY_PRIVATE_KEY);
}

let client: Mux | null = null;
function mux() {
  if (!client) {
    client = new Mux({
      tokenId: process.env.MUX_TOKEN_ID!,
      tokenSecret: process.env.MUX_TOKEN_SECRET!,
    });
  }
  return client;
}

/**
 * Creates a Mux direct upload for a video lesson. `passthrough` is set to
 * our own `assets.id` row, so the webhook (which only gets Mux's IDs) can
 * find the right row to update once processing finishes — no separate
 * correlation table needed.
 */
export async function createDirectUpload(assetRowId: string, signed: boolean) {
  const upload = await mux().video.uploads.create({
    cors_origin: "*",
    new_asset_settings: {
      playback_policy: [signed ? "signed" : "public"],
      passthrough: assetRowId,
    },
  });
  return { uploadUrl: upload.url, uploadId: upload.id };
}

export async function deleteMuxAsset(muxAssetId: string) {
  try {
    await mux().video.assets.delete(muxAssetId);
  } catch {
    // Already gone, or Mux not configured — safe to ignore on cleanup paths.
  }
}

/**
 * Signs a short-lived playback token so a video can only be watched by
 * someone our app has already authorized (checked before this is called).
 * Falls back to null — meaning "play unsigned" — if a signing key hasn't
 * been configured yet, so the app still works before that setup is done.
 */
export function signPlaybackId(playbackId: string): string | null {
  if (!muxSigningConfigured()) return null;

  const keyId = process.env.MUX_SIGNING_KEY_ID!;
  const privateKey = Buffer.from(process.env.MUX_SIGNING_KEY_PRIVATE_KEY!, "base64").toString("utf-8");

  return jwt.sign({}, privateKey, {
    algorithm: "RS256",
    keyid: keyId,
    expiresIn: "6h",
    audience: "v",
    subject: playbackId,
  });
}
