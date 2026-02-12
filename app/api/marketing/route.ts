import { NextRequest, NextResponse } from "next/server";
import { loadDashboardData } from "@/lib/marketing/load-dashboard";
import { getYesterday } from "@/lib/date";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channel") ?? "meta_ads";

    const sinceParam = searchParams.get("since");
    const untilParam = searchParams.get("until");
    const dateParam = searchParams.get("date");

    const hasRange =
      sinceParam &&
      untilParam &&
      /^\d{4}-\d{2}-\d{2}$/.test(sinceParam) &&
      /^\d{4}-\d{2}-\d{2}$/.test(untilParam);

    const singleDate =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? dateParam
        : getYesterday();

    const campaignIdsParam = searchParams.get("campaign_ids");
    const adSetIdsParam = searchParams.get("ad_set_ids");
    const adIdsParam = searchParams.get("ad_ids");
    const objectiveParam = searchParams.get("objective");

    const filters =
      campaignIdsParam ||
      adSetIdsParam ||
      adIdsParam ||
      (objectiveParam != null && objectiveParam !== "")
        ? {
            campaign_ids: campaignIdsParam
              ? campaignIdsParam.split(",").filter(Boolean)
              : undefined,
            ad_set_ids: adSetIdsParam
              ? adSetIdsParam.split(",").filter(Boolean)
              : undefined,
            ad_ids: adIdsParam
              ? adIdsParam.split(",").filter(Boolean)
              : undefined,
            objective:
              objectiveParam != null && objectiveParam !== ""
                ? objectiveParam
                : undefined,
          }
        : undefined;

    const data = hasRange
      ? await loadDashboardData(
          sinceParam!,
          channelId,
          untilParam!,
          filters
        )
      : await loadDashboardData(singleDate, channelId, undefined, filters);

    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
