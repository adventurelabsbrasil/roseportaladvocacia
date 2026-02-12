import { NextRequest, NextResponse } from "next/server";
import { loadDashboardData } from "@/lib/marketing/load-dashboard";
import { getYesterday } from "@/lib/date";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const date =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : getYesterday();
    const channelId = searchParams.get("channel") ?? "meta_ads";

    const data = await loadDashboardData(date, channelId);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
