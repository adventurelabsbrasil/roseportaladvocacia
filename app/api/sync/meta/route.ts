import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  fetchCampaigns,
  fetchAdInsights,
  parseLeadCount,
  parseNumber,
} from "@/lib/meta/ads";
import { fetchConversationsStartedForDay } from "@/lib/meta/conversations";
import { getYesterday } from "@/lib/date";

const CHANNEL_ID = "meta_ads";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : getYesterday();

    const supabase = createServerSupabase();

    const [campaigns] = await Promise.all([
      fetchCampaigns(),
      ensureChannel(supabase),
    ]);

    const campaignIdToUuid = new Map<string, string>();
    for (const c of campaigns) {
      const { data: row } = await supabase
        .from("campaigns")
        .upsert(
          { channel_id: CHANNEL_ID, external_id: c.id, name: c.name },
          { onConflict: "channel_id,external_id" }
        )
        .select("id")
        .single();
      if (row) campaignIdToUuid.set(c.id, row.id);
    }

    const adInsights = await fetchAdInsights(date, date);
    const conversationsStarted = await fetchConversationsStartedForDay(date);

    const seenAdIds = new Set<string>();
    const adIdToUuid = new Map<string, string>();

    for (const row of adInsights) {
      const campaignExternalId = row.campaign_id;
      const adExternalId = row.ad_id;
      if (!campaignExternalId || !adExternalId) continue;

      const campaignUuid = campaignIdToUuid.get(campaignExternalId);
      if (!campaignUuid) continue;

      const adKey = `${campaignExternalId}:${adExternalId}`;
      if (!seenAdIds.has(adKey)) {
        seenAdIds.add(adKey);
        const { data: adRow } = await supabase
          .from("ads")
          .upsert(
            {
              campaign_id: campaignUuid,
              external_id: adExternalId,
              name: (row.ad_name ?? adExternalId).slice(0, 500),
            },
            { onConflict: "campaign_id,external_id" }
          )
          .select("id")
          .single();
        if (adRow) adIdToUuid.set(adKey, adRow.id);
      }

      const adUuid = adIdToUuid.get(adKey);
      if (!adUuid) continue;

      const impressions = parseNumber(row.impressions);
      const linkClicks = parseNumber(row.clicks);
      const spend = parseNumber(row.spend);
      const leads = parseLeadCount(row.actions);

      await supabase.from("daily_metrics").upsert(
        {
          channel_id: CHANNEL_ID,
          campaign_id: campaignUuid,
          ad_id: adUuid,
          date,
          impressions,
          link_clicks: linkClicks,
          spend_brl: spend,
          leads,
          conversations_started: 0,
        },
        { onConflict: "channel_id,campaign_id,ad_id,date" }
      );
    }

    if (conversationsStarted > 0) {
      const { data: oneRow } = await supabase
        .from("daily_metrics")
        .select("id")
        .eq("channel_id", CHANNEL_ID)
        .eq("date", date)
        .limit(1)
        .single();
      if (oneRow) {
        await supabase
          .from("daily_metrics")
          .update({ conversations_started: conversationsStarted })
          .eq("id", oneRow.id);
      }
    }

    return NextResponse.json({
      ok: true,
      date,
      campaigns: campaigns.length,
      ad_rows: adInsights.length,
      conversations_started: conversationsStarted,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

async function ensureChannel(
  supabase: ReturnType<typeof createServerSupabase>
): Promise<void> {
  await supabase.from("channels").upsert(
    { id: CHANNEL_ID, name: "Meta Ads", enabled: true },
    { onConflict: "id" }
  );
}
