import { createServerSupabase } from "@/lib/supabase/server";
import type { DashboardData, RowByCampaignAd, ChartPoint } from "@/types/marketing";

export async function loadDashboardData(
  date: string,
  channelId: string
): Promise<DashboardData> {
  const supabase = createServerSupabase();

  const { data: metricsRows, error: metricsError } = await supabase
    .from("daily_metrics")
    .select("campaign_id, ad_id, impressions, link_clicks, spend_brl, leads, conversations_started")
    .eq("channel_id", channelId)
    .eq("date", date);

  if (metricsError) throw new Error(metricsError.message);

  const campaignIds = [...new Set((metricsRows ?? []).map((r) => r.campaign_id))];
  const adIds = [...new Set((metricsRows ?? []).map((r) => r.ad_id))];

  const [campaignsRes, adsRes] = await Promise.all([
    campaignIds.length
      ? supabase.from("campaigns").select("id, name").in("id", campaignIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    adIds.length
      ? supabase.from("ads").select("id, name").in("id", adIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const campaignNames = new Map(
    (campaignsRes.data ?? []).map((c) => [c.id, c.name])
  );
  const adNames = new Map((adsRes.data ?? []).map((a) => [a.id, a.name]));

  const rows: RowByCampaignAd[] = (metricsRows ?? []).map((r) => ({
    campaign_id: r.campaign_id,
    campaign_name: campaignNames.get(r.campaign_id) ?? "",
    ad_id: r.ad_id,
    ad_name: adNames.get(r.ad_id) ?? "",
    impressions: Number(r.impressions) || 0,
    link_clicks: Number(r.link_clicks) || 0,
    spend_brl: Number(r.spend_brl) || 0,
    leads: Number(r.leads) || 0,
    conversations_started: Number(r.conversations_started) || 0,
  }));

  const totals = rows.reduce(
    (acc, r) => ({
      leads: acc.leads + r.leads,
      conversations_started: acc.conversations_started + r.conversations_started,
      spend_brl: acc.spend_brl + r.spend_brl,
      link_clicks: acc.link_clicks + r.link_clicks,
      impressions: acc.impressions + r.impressions,
    }),
    { leads: 0, conversations_started: 0, spend_brl: 0, link_clicks: 0, impressions: 0 }
  );

  const { data: allMetricsForChart } = await supabase
    .from("daily_metrics")
    .select("date, campaign_id, leads")
    .eq("channel_id", channelId)
    .order("date", { ascending: true });

  const campaignIdsInChart = [...new Set((allMetricsForChart ?? []).map((r) => r.campaign_id))];
  const { data: campaignsForChart } =
    campaignIdsInChart.length > 0
      ? await supabase.from("campaigns").select("id, name").in("id", campaignIdsInChart)
      : { data: [] as { id: string; name: string }[] };
  const chartCampaignNames = new Map(
    (campaignsForChart ?? []).map((c) => [c.id, c.name])
  );

  const chartData: ChartPoint[] = (allMetricsForChart ?? []).map((r) => ({
    date: r.date,
    campaign_id: r.campaign_id,
    campaign_name: chartCampaignNames.get(r.campaign_id) ?? "",
    leads: Number(r.leads) || 0,
  }));

  return {
    date,
    channel_id: channelId,
    totals,
    rows,
    chartData,
  };
}
