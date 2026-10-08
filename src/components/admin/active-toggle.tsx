"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserActive } from "@/actions/admin-students";
import { Button } from "@/components/ui/button";

export function ActiveToggle({ userId, isActive }: { userId: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={isActive ? "secondary" : "primary"}
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isActive && !confirm("Deactivate this account? They'll be signed out and unable to log back in until reactivated.")) {
            return;
          }
          startTransition(async () => {
            setError(null);
            const res = await setUserActive(userId, !isActive);
            if (res.error) setError(res.error);
            else router.refresh();
          });
        }}
        className="px-3 py-1.5 text-xs"
      >
        {pending ? "Saving…" : isActive ? "Deactivate" : "Activate"}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
