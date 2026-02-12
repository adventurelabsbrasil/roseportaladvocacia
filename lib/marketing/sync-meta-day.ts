import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchCampaigns,
  fetchAdInsights,
  parseLeadCount,
  parseResultsCount,
  parseConversationsStartedFromActions,
  parseNumber,
} from "@/lib/meta/ads";

const CHANNEL_ID = "meta_ads";

export type SyncDayResult = {
  date: string;
  campaigns: number;
  ad_rows: number;
  results: number;
  conversations_started: number;
  error?: string;
};

export async function syncMetaForDay(
  supabase: SupabaseClient,
  date: string
): Promise<SyncDayResult> {
  const [campaigns] = await Promise.all([
    fetchCampaigns(),
    ensureChannel(supabase),
  ]);

  const campaignIdToUuid = new Map<string, string>();
  for (const c of campaigns) {
    const externalId = String(c.id);
    let { data: row, error: campaignError } = await supabase
      .from("campaigns")
      .upsert(
        {
          channel_id: CHANNEL_ID,
          external_id: externalId,
          name: c.name,
          objective: (c as { objective?: string }).objective ?? null,
        },
        { onConflict: "channel_id,external_id" }
      )
      .select("id")
      .single();
    if (campaignError && /objective|column/.test(campaignError.message)) {
      const res = await supabase
        .from("campaigns")
        .upsert(
          { channel_id: CHANNEL_ID, external_id: externalId, name: c.name },
          { onConflict: "channel_id,external_id" }
        )
        .select("id")
        .single();
      row = res.data;
    }
    if (row) campaignIdToUuid.set(externalId, row.id);
  }

  const adInsights = await fetchAdInsights(date, date);

  const seenAdIds = new Set<string>();
  const adIdToUuid = new Map<string, string>();
  const adSetKeyToUuid = new Map<string, string>();

  for (const row of adInsights) {
    const campaignExternalId = row.campaign_id != null ? String(row.campaign_id) : "";
    const adExternalId = row.ad_id != null ? String(row.ad_id) : "";
    if (!campaignExternalId || !adExternalId) continue;

    const campaignUuid = campaignIdToUuid.get(campaignExternalId);
    if (!campaignUuid) continue;

    let adSetUuid: string | null = null;
    const adsetExternalId = row.adset_id;
    if (adsetExternalId) {
      const adSetKey = `${campaignUuid}:${adsetExternalId}`;
      if (!adSetKeyToUuid.has(adSetKey)) {
        const { data: adSetRow } = await supabase
          .from("ad_sets")
          .upsert(
            {
              campaign_id: campaignUuid,
              external_id: adsetExternalId,
              name: (row.adset_name ?? adsetExternalId).slice(0, 500),
            },
            { onConflict: "campaign_id,external_id" }
          )
          .select("id")
          .single();
        if (adSetRow) adSetKeyToUuid.set(adSetKey, adSetRow.id);
      }
      adSetUuid = adSetKeyToUuid.get(adSetKey) ?? null;
    }

    const adKey = `${campaignExternalId}:${adExternalId}`;
    if (!seenAdIds.has(adKey)) {
      seenAdIds.add(adKey);
      const adPayload: Record<string, unknown> = {
        campaign_id: campaignUuid,
        external_id: adExternalId,
        name: (row.ad_name ?? adExternalId).slice(0, 500),
      };
      if (adSetUuid) adPayload.ad_set_id = adSetUuid;
      const { data: adRow } = await supabase
        .from("ads")
        .upsert(adPayload, { onConflict: "campaign_id,external_id" })
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
    const results = parseResultsCount(row.actions);

    const conversationsStarted = parseConversationsStartedFromActions(row.actions);
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
        results,
        conversations_started: conversationsStarted,
      },
      { onConflict: "channel_id,campaign_id,ad_id,date" }
    );
  }

  const totalResults = adInsights.reduce(
    (sum, row) => sum + parseResultsCount(row.actions),
    0
  );
  const totalConversations = adInsights.reduce(
    (sum, row) => sum + parseConversationsStartedFromActions(row.actions),
    0
  );

  return {
    date,
    campaigns: campaigns.length,
    ad_rows: adInsights.length,
    results: totalResults,
    conversations_started: totalConversations,
  };
}

async function ensureChannel(supabase: SupabaseClient): Promise<void> {
  await supabase.from("channels").upsert(
    { id: CHANNEL_ID, name: "Meta Ads", enabled: true },
    { onConflict: "id" }
  );
}
