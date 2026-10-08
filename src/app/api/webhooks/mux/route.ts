import { NextResponse, type NextRequest } from "next/server";
import Mux from "@mux/mux-node";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const webhookSecret = process.env.MUX_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("MUX_WEBHOOK_SECRET is not set — refusing to process webhook.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Only used to verify the signature locally; no live API calls are made here.
  const mux = new Mux({
    tokenId: process.env.MUX_TOKEN_ID ?? "unset",
    tokenSecret: process.env.MUX_TOKEN_SECRET ?? "unset",
  });

  let event;
  try {
    event = await mux.webhooks.unwrap(body, request.headers, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  // `passthrough` carries our own assets.id, set when the direct upload was
  // created — this is what lets us find the right row without a separate
  // correlation table.
  if (event.type === "video.asset.ready") {
    const data = event.data as { id: string; passthrough?: string | null; playback_ids?: { id: string }[] };
    const assetRowId = data.passthrough;
    const playbackId = data.playback_ids?.[0]?.id;

    if (assetRowId && playbackId) {
      await admin
        .from("assets")
        .update({ mux_asset_id: data.id, mux_playback_id: playbackId, mux_status: "ready" })
        .eq("id", assetRowId);
    }
  }

  if (event.type === "video.asset.errored") {
    const data = event.data as { passthrough?: string | null };
    if (data.passthrough) {
      await admin.from("assets").update({ mux_status: "errored" }).eq("id", data.passthrough);
    }
  }

  return NextResponse.json({ received: true });
}
