"use client";

import MuxPlayer from "@mux/mux-player-react";

export function MuxVideoPlayer({ playbackId, token }: { playbackId: string; token: string | null }) {
  return (
    <MuxPlayer
      playbackId={playbackId}
      tokens={token ? { playback: token } : undefined}
      streamType="on-demand"
      accentColor="#e8a33d"
      style={{ aspectRatio: "16/9", width: "100%", borderRadius: "var(--radius-md)" }}
    />
  );
}
