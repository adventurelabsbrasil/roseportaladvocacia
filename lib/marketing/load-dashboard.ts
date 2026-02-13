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

  const metricsColumns =
    "date, campaign_id, ad_id, impressions, link_clicks, spend_brl, leads, conversations_started";
  let query = supabase
    .from("daily_metrics")
    .select(`${metricsColumns}, results`)
    .eq("channel_id", channelId);

  if (isRange) {
    query = query.gte("date", since).lte("date", until);
  } else {
    query = query.eq("date", date);
  }

  type MetricsRow = Record<string, unknown> & {
  date: string;
  campaign_id: string;
  ad_id: string;
  impressions: number;
  link_clicks: number;
  spend_brl: number;
  leads: number;
  conversations_started: number;
};
  let res = await query;
  let metricsRows: MetricsRow[] | null = res.data as MetricsRow[] | null;
  let metricsError = res.error;
  let hasResultsColumn = true;

  if (metricsError && /results|column/.test(metricsError.message)) {
    const q2 = isRange
      ? supabase.from("daily_metrics").select(metricsColumns).eq("channel_id", channelId).gte("date", since).lte("date", until)
      : supabase.from("daily_metrics").select(metricsColumns).eq("channel_id", channelId).eq("date", date);
    const res2 = await q2;
    metricsRows = res2.data as MetricsRow[] | null;
    metricsError = res2.error;
    hasResultsColumn = false;
  }

  if (metricsError) throw new Error(metricsError.message);

  const campaignIds = [...new Set((metricsRows ?? []).map((r) => r.campaign_id))];
  const adIds = [...new Set((metricsRows ?? []).map((r) => r.ad_id))];

  let campaignsData: { id: string; name: string; objective?: string }[] = [];
  const campaignsRes = await supabase
    .from("campaigns")
    .select("id, name, objective")
    .in("id", campaignIds.length ? campaignIds : ["00000000-0000-0000-0000-000000000000"]);
  if (campaignsRes.error && /objective|column/.test(campaignsRes.error.message)) {
    const fallback = await supabase.from("campaigns").select("id, name").in("id", campaignIds.length ? campaignIds : ["00000000-0000-0000-0000-000000000000"]);
    campaignsData = (fallback.data ?? []) as { id: string; name: string }[];
  } else {
    campaignsData = (campaignsRes.data ?? []) as { id: string; name: string; objective?: string }[];
  }

  let adsData: { id: string; name: string; ad_set_id?: string }[] = [];
  const adsRes = await supabase
    .from("ads")
    .select("id, name, ad_set_id")
    .in("id", adIds.length ? adIds : ["00000000-0000-0000-0000-000000000000"]);
  if (adsRes.error && /ad_set_id|column/.test(adsRes.error.message)) {
    const fallback = await supabase.from("ads").select("id, name").in("id", adIds.length ? adIds : ["00000000-0000-0000-0000-000000000000"]);
    adsData = (fallback.data ?? []) as { id: string; name: string }[];
  } else {
    adsData = (adsRes.data ?? []) as { id: string; name: string; ad_set_id?: string }[];
  }

  const campaignNames = new Map(campaignsData.map((c) => [c.id, c.name]));
  const campaignObjectives = new Map(
    campaignsData.map((c) => [c.id, c.objective ?? ""])
  );
  const adNames = new Map(adsData.map((a) => [a.id, a.name]));
  const adSetIds = new Map(adsData.map((a) => [a.id, a.ad_set_id]));

  let channelName = "";
  const channelRes = await supabase
    .from("channels")
    .select("name")
    .eq("id", channelId)
    .maybeSingle();
  if (channelRes.data?.name) channelName = channelRes.data.name;

  let rows: RowByCampaignAd[] = (metricsRows ?? []).map((r) => {
    const leads = Number(r.leads) || 0;
    const conversations_started = Number(r.conversations_started) || 0;
    const results = hasResultsColumn ? Number((r as { results?: number }).results) || 0 : 0;
    const leads_gerais = results > 0 ? results : leads + conversations_started;
    return {
      campaign_id: r.campaign_id,
      campaign_name: campaignNames.get(r.campaign_id) ?? "",
      ad_id: r.ad_id,
      ad_name: adNames.get(r.ad_id) ?? "",
      ...(isRange ? { date: r.date } : {}),
      channel_name: channelName,
      objective: campaignObjectives.get(r.campaign_id) ?? "",
      impressions: Number(r.impressions) || 0,
      link_clicks: Number(r.link_clicks) || 0,
      spend_brl: Number(r.spend_brl) || 0,
      leads,
      leads_gerais,
      results,
      conversations_started,
    };
  });

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
      leads_gerais: acc.leads_gerais + r.leads_gerais,
      results: acc.results + r.results,
      conversations_started: acc.conversations_started + r.conversations_started,
      spend_brl: acc.spend_brl + r.spend_brl,
      link_clicks: acc.link_clicks + r.link_clicks,
      impressions: acc.impressions + r.impressions,
    }),
    { leads: 0, leads_gerais: 0, results: 0, conversations_started: 0, spend_brl: 0, link_clicks: 0, impressions: 0 }
  );

  let chartQuery = supabase
    .from("daily_metrics")
    .select("date, campaign_id, leads, conversations_started")
    .eq("channel_id", channelId)
    .order("date", { ascending: true });

  if (isRange) {
    chartQuery = chartQuery.gte("date", since).lte("date", until);
  } else {
    chartQuery = chartQuery.eq("date", date);
  }

  const chartRes = await chartQuery;
  const allMetricsForChart = ((chartRes.data ?? []) as unknown) as Array<{
    date: string;
    campaign_id: string;
    leads: number;
    conversations_started: number;
  }>;

  const campaignIdsInChart = [
    ...new Set(allMetricsForChart.map((r) => r.campaign_id)),
  ];
  const { data: campaignsForChart } =
    campaignIdsInChart.length > 0
      ? await supabase.from("campaigns").select("id, name").in("id", campaignIdsInChart)
      : { data: [] as { id: string; name: string }[] };
  const chartCampaignNames = new Map(
    (campaignsForChart ?? []).map((c) => [c.id, c.name])
  );

  let chartRows = allMetricsForChart;
  if (filters?.campaign_ids?.length) {
    const set = new Set(filters.campaign_ids);
    chartRows = chartRows.filter((r) => set.has(r.campaign_id));
  }

  const chartData: ChartPoint[] = chartRows.map((r) => ({
    date: r.date,
    campaign_id: r.campaign_id,
    campaign_name: chartCampaignNames.get(r.campaign_id) ?? "",
    leads: Number(r.leads) || 0,
    results: 0,
    conversations_started: Number(r.conversations_started) || 0,
  }));

  let previousTotals: typeof totals | undefined;
  if (isRange && since && until) {
    const start = new Date(since + "T12:00:00");
    const end = new Date(until + "T12:00:00");
    const numDays = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - numDays + 1);
    const prevSince = prevStart.toISOString().slice(0, 10);
    const prevUntil = prevEnd.toISOString().slice(0, 10);

    let prevQuery = supabase
      .from("daily_metrics")
      .select(metricsColumns)
      .eq("channel_id", channelId)
      .gte("date", prevSince)
      .lte("date", prevUntil);
    const prevRes = await prevQuery;
    const prevRows = (prevRes.data ?? []) as MetricsRow[];
    if (prevRows.length > 0) {
      const adSetIdsPrev = new Map(adsData.map((a) => [a.id, a.ad_set_id]));
      let prevRowsMapped = prevRows.map((r) => {
        const leads = Number(r.leads) || 0;
        const conversations_started = Number(r.conversations_started) || 0;
        return {
          ...r,
          leads,
          conversations_started,
          leads_gerais: leads + conversations_started,
        };
      });
      if (filters?.campaign_ids?.length) {
        const set = new Set(filters.campaign_ids);
        prevRowsMapped = prevRowsMapped.filter((r) => set.has(r.campaign_id));
      }
      if (filters?.ad_set_ids?.length) {
        const set = new Set(filters.ad_set_ids);
        prevRowsMapped = prevRowsMapped.filter((r) => {
          const asid = adSetIdsPrev.get(r.ad_id);
          return asid != null && set.has(asid);
        });
      }
      if (filters?.ad_ids?.length) {
        const set = new Set(filters.ad_ids);
        prevRowsMapped = prevRowsMapped.filter((r) => set.has(r.ad_id));
      }
      if (filters?.objective != null && filters.objective !== "") {
        prevRowsMapped = prevRowsMapped.filter(
          (r) => campaignObjectives.get(r.campaign_id) === filters.objective
        );
      }
      previousTotals = prevRowsMapped.reduce(
        (acc, r) => ({
          leads: acc.leads + r.leads,
          leads_gerais: acc.leads_gerais + r.leads_gerais,
          results: acc.results + (r.leads + r.conversations_started),
          conversations_started: acc.conversations_started + r.conversations_started,
          spend_brl: acc.spend_brl + Number(r.spend_brl || 0),
          link_clicks: acc.link_clicks + Number(r.link_clicks || 0),
          impressions: acc.impressions + Number(r.impressions || 0),
        }),
        { leads: 0, leads_gerais: 0, results: 0, conversations_started: 0, spend_brl: 0, link_clicks: 0, impressions: 0 }
      );
    }
  }

  return {
    date: isRange ? since : date,
    ...(isRange ? { since, until } : {}),
    channel_id: channelId,
    totals,
    ...(previousTotals ? { previousTotals } : {}),
    rows,
    chartData,
  };
}
