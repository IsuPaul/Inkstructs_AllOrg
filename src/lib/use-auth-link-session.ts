"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type LinkState = "checking" | "ready" | "invalid";

/**
 * Establishes a session from an invite / password-recovery email link.
 *
 * Supabase's email links show up in one of a few shapes depending on
 * project settings, and relying on the client library to auto-detect all of
 * them silently was the root cause of the earlier "invite link expired"
 * bug — it worked most of the time, then didn't. This handles each shape
 * explicitly instead of guessing:
 *
 *  1. An error Supabase put in the URL itself (link already used, or its
 *     TTL passed) — surfaced as `detail` so it's obvious that's what happened.
 *  2. Implicit flow: #access_token & #refresh_token in the hash.
 *  3. PKCE flow: ?code= in the query string.
 *  4. A session that already exists (e.g. a server route already verified it).
 */
export function useAuthLinkSession() {
  const searchParams = useSearchParams();
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function run() {
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
      const hashParams = new URLSearchParams(hash);

      const hashErrorDesc = hashParams.get("error_description") ?? hashParams.get("error");
      if (hashErrorDesc) {
        if (!cancelled) {
          setLinkState("invalid");
          setDetail(decodeURIComponent(hashErrorDesc.replace(/\+/g, " ")));
        }
        return;
      }

      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        if (!cancelled) {
          setLinkState(error ? "invalid" : "ready");
          if (error) setDetail(error.message);
        }
        return;
      }

      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled) {
          setLinkState(error ? "invalid" : "ready");
          if (error) setDetail(error.message);
        }
        return;
      }

      const queryError = searchParams.get("error");
      if (queryError) {
        if (!cancelled) {
          setLinkState("invalid");
          setDetail(queryError);
        }
        return;
      }

      // Nothing in the URL — maybe a session already exists (carried over
      // from a server-side verification step, or this page was reloaded).
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setLinkState(data.session ? "ready" : "invalid");
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { linkState, detail };
}
