"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadLessonFile } from "@/actions/media";
import { Button } from "@/components/ui/button";

export function FileUploader({ lessonId, hasFile, accept }: { lessonId: string; hasFile: boolean; accept: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(file: File) {
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadLessonFile(lessonId, formData);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button type="button" variant="secondary" disabled={pending} onClick={() => inputRef.current?.click()}>
        {pending ? "Uploading…" : hasFile ? "Replace file" : "Upload file"}
      </Button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
