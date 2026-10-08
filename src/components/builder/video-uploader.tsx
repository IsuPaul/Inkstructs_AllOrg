"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createVideoUpload, getAssetStatus } from "@/actions/media";
import { Button } from "@/components/ui/button";

type Phase = "idle" | "uploading" | "processing" | "error";

export function VideoUploader({ lessonId, hasVideo }: { lessonId: string; hasVideo: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function pickFile() {
    inputRef.current?.click();
  }

  async function handleFile(file: File) {
    setError(null);
    setPhase("uploading");
    setProgress(0);

    const result = await createVideoUpload(lessonId);
    if (result.error || !result.uploadUrl || !result.assetId) {
      setError(result.error ?? "Couldn't start the upload.");
      setPhase("error");
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", result.uploadUrl!);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.send(file);
    }).catch(() => {
      setError("The upload failed partway through. Check your connection and try again.");
      setPhase("error");
    });

    if (phase === "error") return;

    setPhase("processing");
    // Poll until Mux's webhook marks the asset ready (usually a few seconds
    // to a couple of minutes, depending on video length).
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const status = await getAssetStatus(result.assetId!);
      if (status?.mux_status === "ready") {
        router.refresh();
        return;
      }
      if (status?.mux_status === "errored") {
        setError("Mux couldn't process that file. Try a different video.");
        setPhase("error");
        return;
      }
    }
    setError("Still processing — refresh this page in a minute to check.");
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {phase === "idle" && (
        <Button type="button" variant="secondary" onClick={pickFile}>
          {hasVideo ? "Replace video" : "Upload video"}
        </Button>
      )}

      {phase === "uploading" && (
        <div className="text-sm text-muted">
          Uploading… {progress}%
          <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-paper-200">
            <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {phase === "processing" && <p className="text-sm text-muted">Processing video…</p>}

      {phase === "error" && (
        <div>
          <p className="text-sm text-danger">{error}</p>
          <Button type="button" variant="secondary" className="mt-2" onClick={pickFile}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
