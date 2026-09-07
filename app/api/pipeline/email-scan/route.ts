import { NextResponse } from "next/server";
import { runEmailScanPipeline } from "@/scripts/pipeline";

// Vercel's platform default is 300s; leave some headroom under it rather
// than maxing it out. Raised from 60s now that a run can loop over more
// than one connection (see scripts/pipeline/index.ts).
export const maxDuration = 280;

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runEmailScanPipeline();
    return NextResponse.json({ success: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
