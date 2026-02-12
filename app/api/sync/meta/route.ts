import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { syncMetaForDay } from "@/lib/marketing/sync-meta-day";
import { getYesterday } from "@/lib/date";

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

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
