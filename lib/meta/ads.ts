/**
 * Meta Marketing API - Ads Insights
 * Fetches campaign and ad level metrics for a given date range.
 */

const BASE = "https://graph.facebook.com/v21.0";

export type MetaInsightRow = {
  impressions?: string;
  clicks?: string;
  spend?: string;
  actions?: Array< { action_type: string; value: string } >;
  campaign_id?: string;
  ad_id?: string;
  campaign_name?: string;
  ad_name?: string;
};

export type MetaCampaign = { id: string; name: string };
export type MetaAd = { id: string; name: string; campaign_id: string };

function getAccessToken(): string {
  const t = process.env.META_ACCESS_TOKEN;
  if (!t) throw new Error("META_ACCESS_TOKEN is required");
  return t;
}

function getAdAccountId(): string {
  const id = process.env.META_AD_ACCOUNT_ID;
  if (!id) throw new Error("META_AD_ACCOUNT_ID is required");
  return id.startsWith("act_") ? id : `act_${id}`;
}

export async function fetchCampaigns(): Promise<MetaCampaign[]> {
  const accountId = getAdAccountId();
  const url = `${BASE}/${accountId}/campaigns?fields=id,name&access_token=${getAccessToken()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta campaigns: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { data?: { id: string; name: string }[] };
  return (data.data ?? []).map((c) => ({ id: c.id, name: c.name }));
}

export async function fetchAdsByCampaign(campaignId: string): Promise<MetaAd[]> {
  const url = `${BASE}/${campaignId}/ads?fields=id,name&access_token=${getAccessToken()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta ads: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { data?: { id: string; name: string }[] };
  return (data.data ?? []).map((a) => ({ id: a.id, name: a.name, campaign_id: campaignId }));
}

/**
 * Insights at campaign level for date range (time_increment=1 = one row per day)
 */
export async function fetchCampaignInsights(
  since: string,
  until: string
): Promise<MetaInsightRow[]> {
  const accountId = getAdAccountId();
  const fields = "impressions,clicks,spend,actions,campaign_id,campaign_name";
  const params = new URLSearchParams({
    fields: fields,
    time_range: JSON.stringify({ since, until }),
    time_increment: "1",
    access_token: getAccessToken(),
  });
  const url = `${BASE}/${accountId}/insights?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta campaign insights: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { data?: MetaInsightRow[] };
  return data.data ?? [];
}

/**
 * Insights at ad level for date range
 */
export async function fetchAdInsights(
  since: string,
  until: string
): Promise<MetaInsightRow[]> {
  const accountId = getAdAccountId();
  const fields = "impressions,clicks,spend,actions,campaign_id,campaign_name,ad_id,ad_name";
  const params = new URLSearchParams({
    fields: fields,
    time_range: JSON.stringify({ since, until }),
    time_increment: "1",
    level: "ad",
    access_token: getAccessToken(),
  });
  const url = `${BASE}/${accountId}/insights?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta ad insights: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { data?: MetaInsightRow[] };
  return data.data ?? [];
}

export function parseLeadCount(actions: MetaInsightRow["actions"]): number {
  if (!actions) return 0;
  const lead = actions.find((a) => a.action_type === "lead");
  return lead ? parseInt(lead.value, 10) || 0 : 0;
}

export function parseNumber(s: string | undefined): number {
  if (s == null || s === "") return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
