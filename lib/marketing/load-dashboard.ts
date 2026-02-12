import { createServerSupabase } from "@/lib/supabase/server";
import type {
  DashboardData,
  DashboardFilters,
  RowByCampaignAd,
  ChartPoint,
} from "@/types/marketing";
import { getYesterday } from "@/lib/date";

export async function loadDashboardData(
  dateOrSince: string,
  channelId: string,
  until?: string,
  filters?: DashboardFilters
): Promise<DashboardData> {
  const supabase = createServerSupabase();
  const isRange = until != null && until !== "";
  const since = dateOrSince;
  const date = isRange ? since : dateOrSince;

  let query = supabase
    .from("daily_metrics")
    .select(
      "date, campaign_id, ad_id, impressions, link_clicks, spend_brl, leads, results, conversations_started"
    )
    .eq("channel_id", channelId);

  if (isRange) {
    query = query.gte("date", since).lte("date", until);
  } else {
    query = query.eq("date", date);
  }

  const { data: metricsRows, error: metricsError } = await query;

  if (metricsError) throw new Error(metricsError.message);

  const campaignIds = [...new Set((metricsRows ?? []).map((r) => r.campaign_id))];
  const adIds = [...new Set((metricsRows ?? []).map((r) => r.ad_id))];

  let campaignsQuery = supabase
    .from("campaigns")
    .select("id, name, objective")
    .in("id", campaignIds.length ? campaignIds : ["00000000-0000-0000-0000-000000000000"]);
  const campaignsRes = await campaignsQuery;
  const campaignsData = (campaignsRes.data ?? []) as {
    id: string;
    name: string;
    objective?: string;
  }[];

  let adsQuery = supabase
    .from("ads")
    .select("id, name, ad_set_id")
    .in("id", adIds.length ? adIds : ["00000000-0000-0000-0000-000000000000"]);
  const adsRes = await adsQuery;
  const adsData = (adsRes.data ?? []) as {
    id: string;
    name: string;
    ad_set_id?: string;
  }[];

  const campaignNames = new Map(campaignsData.map((c) => [c.id, c.name]));
  const campaignObjectives = new Map(
    campaignsData.map((c) => [c.id, c.objective ?? ""])
  );
  const adNames = new Map(adsData.map((a) => [a.id, a.name]));
  const adSetIds = new Map(adsData.map((a) => [a.id, a.ad_set_id]));

  let rows: RowByCampaignAd[] = (metricsRows ?? []).map((r) => ({
    campaign_id: r.campaign_id,
    campaign_name: campaignNames.get(r.campaign_id) ?? "",
    ad_id: r.ad_id,
    ad_name: adNames.get(r.ad_id) ?? "",
    ...(isRange ? { date: r.date } : {}),
    impressions: Number(r.impressions) || 0,
    link_clicks: Number(r.link_clicks) || 0,
    spend_brl: Number(r.spend_brl) || 0,
    leads: Number(r.leads) || 0,
    results: Number((r as { results?: number }).results) || 0,
    conversations_started: Number(r.conversations_started) || 0,
  }));

  if (filters) {
    if (filters.campaign_ids?.length) {
      const set = new Set(filters.campaign_ids);
      rows = rows.filter((r) => set.has(r.campaign_id));
    }
    if (filters.ad_set_ids?.length) {
      const set = new Set(filters.ad_set_ids);
      rows = rows.filter((r) => {
        const asid = adSetIds.get(r.ad_id);
        return asid != null && set.has(asid);
      });
    }
    if (filters.ad_ids?.length) {
      const set = new Set(filters.ad_ids);
      rows = rows.filter((r) => set.has(r.ad_id));
    }
    if (filters.objective != null && filters.objective !== "") {
      rows = rows.filter(
        (r) => campaignObjectives.get(r.campaign_id) === filters.objective
      );
    }
  }

  const totals = rows.reduce(
    (acc, r) => ({
      leads: acc.leads + r.leads,
      results: acc.results + r.results,
      conversations_started: acc.conversations_started + r.conversations_started,
      spend_brl: acc.spend_brl + r.spend_brl,
      link_clicks: acc.link_clicks + r.link_clicks,
      impressions: acc.impressions + r.impressions,
    }),
    { leads: 0, results: 0, conversations_started: 0, spend_brl: 0, link_clicks: 0, impressions: 0 }
  );

  let chartQuery = supabase
    .from("daily_metrics")
    .select("date, campaign_id, leads, results")
    .eq("channel_id", channelId)
    .order("date", { ascending: true });

  if (isRange) {
    chartQuery = chartQuery.gte("date", since).lte("date", until);
  } else {
    chartQuery = chartQuery.eq("date", date);
  }

  const { data: allMetricsForChart } = await chartQuery;

  const campaignIdsInChart = [
    ...new Set((allMetricsForChart ?? []).map((r) => r.campaign_id)),
  ];
  const { data: campaignsForChart } =
    campaignIdsInChart.length > 0
      ? await supabase.from("campaigns").select("id, name").in("id", campaignIdsInChart)
      : { data: [] as { id: string; name: string }[] };
  const chartCampaignNames = new Map(
    (campaignsForChart ?? []).map((c) => [c.id, c.name])
  );

  let chartRows = allMetricsForChart ?? [];
  if (filters?.campaign_ids?.length) {
    const set = new Set(filters.campaign_ids);
    chartRows = chartRows.filter((r) => set.has(r.campaign_id));
  }

  const chartData: ChartPoint[] = chartRows.map((r) => ({
    date: r.date,
    campaign_id: r.campaign_id,
    campaign_name: chartCampaignNames.get(r.campaign_id) ?? "",
    leads: Number(r.leads) || 0,
    results: Number((r as { results?: number }).results) || 0,
  }));

  return {
    date: isRange ? since : date,
    ...(isRange ? { since, until } : {}),
    channel_id: channelId,
    totals,
    rows,
    chartData,
  };
}
