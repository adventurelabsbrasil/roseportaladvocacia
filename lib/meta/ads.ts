/**
 * Meta Marketing API - Ads Insights
 * Fetches campaign and ad level metrics for a given date range.
 */

const BASE = "https://graph.facebook.com/v21.0";

export type MetaInsightRow = {
  date_start?: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  actions?: Array< { action_type: string; value: string } >;
  campaign_id?: string;
  ad_id?: string;
  campaign_name?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
};

export type MetaCampaign = { id: string; name: string; objective?: string };
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
  const all: MetaCampaign[] = [];
  let url: string | null = `${BASE}/${accountId}/campaigns?fields=id,name,objective&access_token=${getAccessToken()}`;
  while (url) {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Meta campaigns: ${res.status} ${err}`);
    }
    const data = (await res.json()) as {
      data?: { id: string; name: string; objective?: string }[];
      paging?: { next?: string };
    };
    const page = (data.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      objective: c.objective,
    }));
    all.push(...page);
    url = data.paging?.next ?? null;
  }
  return all;
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
 * Insights at ad level for date range (time_increment=1 = one row per day).
 * Follows paging to return all rows. Meta returns date_start per row.
 */
export async function fetchAdInsights(
  since: string,
  until: string
): Promise<MetaInsightRow[]> {
  const accountId = getAdAccountId();
  const fields = "date_start,impressions,clicks,spend,actions,campaign_id,campaign_name,ad_id,ad_name,adset_id,adset_name";
  const params = new URLSearchParams({
    fields: fields,
    time_range: JSON.stringify({ since, until }),
    time_increment: "1",
    level: "ad",
    action_attribution_windows: "7d_click",
    access_token: getAccessToken(),
  });
  const all: MetaInsightRow[] = [];
  let url: string | null = `${BASE}/${accountId}/insights?${params}`;
  while (url) {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Meta ad insights: ${res.status} ${err}`);
    }
    const data = (await res.json()) as {
      data?: MetaInsightRow[];
      paging?: { next?: string };
    };
    const page = data.data ?? [];
    all.push(...page);
    url = data.paging?.next ?? null;
  }
  return all;
}

export function parseLeadCount(actions: MetaInsightRow["actions"]): number {
  if (!actions) return 0;
  const lead = actions.find((a) => a.action_type === "lead");
  return lead ? parseInt(lead.value, 10) || 0 : 0;
}

/**
 * Conversas por mensagem iniciadas = só action_types de mensagem/conversa (equivalente à coluna do CSV).
 * Usado para preencher conversations_started em daily_metrics.
 */
export function parseConversationsStartedFromActions(
  actions: MetaInsightRow["actions"]
): number {
  if (!actions) return 0;
  let total = 0;
  for (const a of actions) {
    const type = (a.action_type || "").toLowerCase();
    const value = parseInt(a.value, 10) || 0;
    if (
      type.includes("messaging_conversation_started") ||
      type.includes("conversation_started") ||
      type === "onsite_conversion.messaging_conversation_started_7d" ||
      type === "onsite_conversion.messaging_conversation_started_1d" ||
      type === "offsite_conversion.messaging_conversation_started_7d"
    ) {
      total += value;
    }
  }
  return total;
}

/**
 * Resultados = métrica principal do objetivo (leads + conversas por mensagem iniciadas).
 * Equivalente à coluna "Resultados" do CSV (soma de Leads e Conversas por mensagem iniciadas).
 */
export function parseResultsCount(actions: MetaInsightRow["actions"]): number {
  if (!actions) return 0;
  const leads = parseLeadCount(actions);
  const conv = parseConversationsStartedFromActions(actions);
  return leads + conv;
}

export function parseNumber(s: string | undefined): number {
  if (s == null || s === "") return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
