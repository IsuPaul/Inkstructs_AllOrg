"use client";

import { useActionState, useState } from "react";
import { updateProfile } from "@/actions/profile";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { NIGERIAN_STATES, type Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateProfile, undefined);
  const [preview, setPreview] = useState<string | null>(profile.avatar_url);

  return (
    <div className="max-w-lg space-y-6">
      <form
        action={formAction}
        className="space-y-5 rounded-[var(--radius-md)] border border-border bg-surface p-6 shadow-[var(--shadow-xs)] sm:p-7"
        encType="multipart/form-data"
      >
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-paper-100 shadow-[var(--shadow-xs)] ring-4 ring-paper-100">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-xl text-ink-500">
                {profile.full_name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <label className="inline-block cursor-pointer rounded-[var(--radius-sm)] border border-border bg-paper-100 px-3 py-2 text-xs font-medium text-ink-900 transition-colors hover:bg-paper-200">
              Change photo
              <input
                type="file"
                name="avatar"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPreview(URL.createObjectURL(file));
                }}
              />
            </label>
            <p className="mt-1 text-xs text-muted">JPG or PNG, under 3MB.</p>
          </div>
        </div>

        <Field label="Full name" htmlFor="full_name">
          <Input id="full_name" name="full_name" defaultValue={profile.full_name} required />
        </Field>

        <Field label="Email" htmlFor="email">
          <Input id="email" value={profile.email} disabled className="opacity-60" />
        </Field>

        <Field label="Date of birth" htmlFor="date_of_birth">
          <Input id="date_of_birth" name="date_of_birth" type="date" defaultValue={profile.date_of_birth ?? ""} />
        </Field>

        <Field label="State of origin" htmlFor="state_of_origin">
          <select
            id="state_of_origin"
            name="state_of_origin"
            defaultValue={profile.state_of_origin ?? ""}
            className="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
          >
            <option value="">Select a state</option>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        {state?.success && <p className="text-sm text-success">Saved.</p>}

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <form action={logout}>
        <Button variant="secondary" type="submit">
          Sign out
        </Button>
      </form>
    </div>
  );
}
