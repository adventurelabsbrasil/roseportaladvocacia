import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { runHistorySync } from "@/lib/marketing/run-history-sync";
import { getYesterday } from "@/lib/date";

const DEFAULT_SINCE = "2025-08-01";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sinceParam = searchParams.get("since");
    const since =
      sinceParam && /^\d{4}-\d{2}-\d{2}$/.test(sinceParam)
        ? sinceParam
        : DEFAULT_SINCE;
    const yesterday = getYesterday();

    if (since > yesterday) {
      return NextResponse.json(
        { ok: false, error: "since deve ser anterior a ontem" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();
    const output = await runHistorySync(supabase, {
      since,
      delayBetweenChunksMs: 800,
    });

    return NextResponse.json({
      ok: true,
      since: output.since,
      until: output.until,
      chunks_total: output.chunks_total,
      success: output.success,
      errors: output.errors,
      details: output.details,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "History sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
