import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { syncMetaForDay } from "@/lib/marketing/sync-meta-day";
import { getYesterday, dateRange } from "@/lib/date";

const DEFAULT_SINCE = "2025-08-01";
const CHANNEL_ID = "meta_ads";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

    await supabase
      .from("daily_metrics")
      .delete()
      .eq("channel_id", CHANNEL_ID)
      .eq("date", yesterday);

    const dates = dateRange(since, yesterday);
    const results: { date: string; ok: boolean; error?: string }[] = [];
    const delayMs = 400;

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      try {
        await syncMetaForDay(supabase, date);
        results.push({ date, ok: true });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        results.push({ date, ok: false, error: message });
      }
      if (i < dates.length - 1) await delay(delayMs);
    }

    const okCount = results.filter((r) => r.ok).length;
    const errCount = results.filter((r) => !r.ok).length;

    return NextResponse.json({
      ok: true,
      since,
      until: yesterday,
      total_dates: dates.length,
      success: okCount,
      errors: errCount,
      details: results,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "History sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
