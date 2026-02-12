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
const BATCH_SIZE = 100;

export type SyncRangeResult = {
  since: string;
  until: string;
  campaigns: number;
  ad_rows: number;
  metrics_upserted: number;
  conversations_days_updated: number;
};

/**
 * Sync Meta Ads data for a date range: one insights request (with actions for results/conversations),
 * then batch upserts. Results and conversations_started come from the insights "actions" field.
 */
export async function syncMetaForRange(
  supabase: SupabaseClient,
  since: string,
  until: string
): Promise<SyncRangeResult> {
  const [campaigns] = await Promise.all([
    fetchCampaigns(),
    ensureChannel(supabase),
  ]);

  const campaignIdToUuid = new Map<string, string>();
  for (const c of campaigns) {
    const externalId = String(c.id);
    const payloadWithObjective = {
      channel_id: CHANNEL_ID,
      external_id: externalId,
      name: c.name,
      objective: (c as { objective?: string }).objective ?? null,
    };
    let { data: row, error: campaignError } = await supabase
      .from("campaigns")
      .upsert(payloadWithObjective, { onConflict: "channel_id,external_id" })
      .select("id")
      .single();
    if (campaignError && /objective|column/.test(campaignError.message)) {
      const { data: rowFallback, error: errFallback } = await supabase
        .from("campaigns")
        .upsert(
          { channel_id: CHANNEL_ID, external_id: externalId, name: c.name },
          { onConflict: "channel_id,external_id" }
        )
        .select("id")
        .single();
      row = rowFallback;
      campaignError = errFallback;
    }
    if (campaignError) throw new Error(`campaigns upsert: ${campaignError.message}`);
    if (row) campaignIdToUuid.set(externalId, row.id);
  }

  const adInsights = await fetchAdInsights(since, until);
  const seenAdKeys = new Set<string>();
  const adIdToUuid = new Map<string, string>();
  const adSetKeyToUuid = new Map<string, string>();

  type MetricRow = {
    channel_id: string;
    campaign_id: string;
    ad_id: string;
    date: string;
    impressions: number;
    link_clicks: number;
    spend_brl: number;
    leads: number;
    results: number;
    conversations_started: number;
  };

  const metricsRows: MetricRow[] = [];
  const missingCampaignIds = new Set<string>();
  let useAdSets = true;

  for (const row of adInsights) {
    const date = row.date_start ?? since;
    const campaignExternalId = row.campaign_id != null ? String(row.campaign_id) : "";
    const adExternalId = row.ad_id != null ? String(row.ad_id) : "";
    if (!campaignExternalId || !adExternalId) continue;

    const campaignUuid = campaignIdToUuid.get(campaignExternalId);
    if (!campaignUuid) {
      missingCampaignIds.add(campaignExternalId);
      continue;
    }

    let adSetUuid: string | null = null;
    const adsetExternalId = row.adset_id;
    if (useAdSets && adsetExternalId) {
      const adSetKey = `${campaignUuid}:${String(adsetExternalId)}`;
      if (!adSetKeyToUuid.has(adSetKey)) {
        const { data: adSetRow, error: adSetError } = await supabase
          .from("ad_sets")
          .upsert(
            {
              campaign_id: campaignUuid,
              external_id: String(adsetExternalId),
              name: (row.adset_name ?? adsetExternalId).slice(0, 500),
            },
            { onConflict: "campaign_id,external_id" }
          )
          .select("id")
          .single();
        if (adSetError && /ad_sets|schema cache|table/.test(adSetError.message)) {
          useAdSets = false;
        } else if (adSetError) {
          throw new Error(`ad_sets upsert: ${adSetError.message}`);
        } else if (adSetRow) {
          adSetKeyToUuid.set(adSetKey, adSetRow.id);
        }
      }
      if (useAdSets) adSetUuid = adSetKeyToUuid.get(adSetKey) ?? null;
    }

    const adKey = `${campaignExternalId}:${adExternalId}`;
    if (!seenAdKeys.has(adKey)) {
      seenAdKeys.add(adKey);
      const adPayload: Record<string, unknown> = {
        campaign_id: campaignUuid,
        external_id: adExternalId,
        name: (row.ad_name ?? adExternalId).slice(0, 500),
      };
      if (useAdSets && adSetUuid) adPayload.ad_set_id = adSetUuid;
      const { data: adRow, error: adError } = await supabase
        .from("ads")
        .upsert(adPayload, { onConflict: "campaign_id,external_id" })
        .select("id")
        .single();
      if (adError && /ad_set_id|column/.test(adError.message)) {
        delete adPayload.ad_set_id;
        const retry = await supabase
          .from("ads")
          .upsert(adPayload, { onConflict: "campaign_id,external_id" })
          .select("id")
          .single();
        if (retry.error) throw new Error(`ads upsert: ${retry.error.message}`);
        if (retry.data) adIdToUuid.set(adKey, retry.data.id);
      } else if (adError) {
        throw new Error(`ads upsert: ${adError.message}`);
      } else if (adRow) {
        adIdToUuid.set(adKey, adRow.id);
      }
    }

    const adUuid = adIdToUuid.get(adKey);
    if (!adUuid) continue;

    metricsRows.push({
      channel_id: CHANNEL_ID,
      campaign_id: campaignUuid,
      ad_id: adUuid,
      date,
      impressions: parseNumber(row.impressions),
      link_clicks: parseNumber(row.clicks),
      spend_brl: parseNumber(row.spend),
      leads: parseLeadCount(row.actions),
      results: parseResultsCount(row.actions),
      conversations_started: parseConversationsStartedFromActions(row.actions),
    });
  }

  if (adInsights.length > 0 && metricsRows.length === 0) {
    const sample = [...missingCampaignIds].slice(0, 5).join(", ");
    const campaignList = [...campaignIdToUuid.keys()].slice(0, 5).join(", ");
    throw new Error(
      `Nenhuma linha gravada: os campaign_id dos insights (ex.: ${sample}) não batem com as campanhas no DB (ex.: ${campaignList}). ` +
        `Campanhas no mapa: ${campaignIdToUuid.size}. Confira se fetchCampaigns retorna as mesmas campanhas que os insights.`
    );
  }

  for (let i = 0; i < metricsRows.length; i += BATCH_SIZE) {
    const batch = metricsRows.slice(i, i + BATCH_SIZE);
    let { error } = await supabase.from("daily_metrics").upsert(batch, {
      onConflict: "channel_id,campaign_id,ad_id,date",
    });
    if (error && /results|column/.test(error.message)) {
      const batchWithoutResults = batch.map(({ results: _r, ...rest }) => rest);
      const retry = await supabase.from("daily_metrics").upsert(batchWithoutResults, {
        onConflict: "channel_id,campaign_id,ad_id,date",
      });
      error = retry.error;
    }
    if (error) throw new Error(`daily_metrics upsert: ${error.message}`);
  }

  return {
    since,
    until,
    campaigns: campaigns.length,
    ad_rows: adInsights.length,
    metrics_upserted: metricsRows.length,
    conversations_days_updated: 0,
  };
}

async function ensureChannel(supabase: SupabaseClient): Promise<void> {
  await supabase.from("channels").upsert(
    { id: CHANNEL_ID, name: "Meta Ads", enabled: true },
    { onConflict: "id" }
  );
}
