import { NextResponse } from "next/server";
import { deploymentConfig } from "@/lib/deployment-config";

/**
 * Lightweight public health endpoint used by the control plane or an uptime
 * monitor. It intentionally does not expose Supabase credentials or user
 * data. A 200 response means the Next.js deployment is serving successfully;
 * it does not replace database or billing checks.
 */
export function GET() {
  return NextResponse.json({
    ok: true,
    service: deploymentConfig.name,
    timestamp: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
