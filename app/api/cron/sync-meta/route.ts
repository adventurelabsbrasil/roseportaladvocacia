import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { syncMetaForDay } from "@/lib/marketing/sync-meta-day";
import { getYesterday } from "@/lib/date";

/**
 * Chamado pelo Vercel Cron para sincronizar dados de ontem (Meta Ads).
 * Requer CRON_SECRET no header Authorization para evitar chamadas públicas.
 * Configure em Vercel: variável CRON_SECRET e cron em vercel.json.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const date = getYesterday();
    const supabase = createServerSupabase();
    const result = await syncMetaForDay(supabase, date);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
