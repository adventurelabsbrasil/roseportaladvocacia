import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { syncMetaForDay } from "@/lib/marketing/sync-meta-day";
import { getYesterday } from "@/lib/date";

/** GET ?date=YYYY-MM-DD&verify=1 — confere no Supabase se há linhas em daily_metrics para essa data (meta_ads). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("verify") !== "1") {
    return NextResponse.json({ error: "Use ?date=YYYY-MM-DD&verify=1" }, { status: 400 });
  }
  const dateParam = searchParams.get("date");
  const date =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : getYesterday();
  try {
    const supabase = createServerSupabase();
    const { count, error } = await supabase
      .from("daily_metrics")
      .select("*", { count: "exact", head: true })
      .eq("channel_id", "meta_ads")
      .eq("date", date);
    if (error) throw error;
    return NextResponse.json({
      date,
      channel_id: "meta_ads",
      daily_metrics_count: count ?? 0,
      in_supabase: (count ?? 0) > 0,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verify failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const date =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? dateParam
        : getYesterday();

    const supabase = createServerSupabase();
    const result = await syncMetaForDay(supabase, date);

    const { count } = await supabase
      .from("daily_metrics")
      .select("*", { count: "exact", head: true })
      .eq("channel_id", "meta_ads")
      .eq("date", date);

    return NextResponse.json({
      ok: true,
      ...result,
      daily_metrics_in_supabase: count ?? 0,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
