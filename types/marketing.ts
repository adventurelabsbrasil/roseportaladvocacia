export type DashboardTotals = {
  leads: number;
  conversations_started: number;
  spend_brl: number;
  link_clicks: number;
  impressions: number;
};

export type RowByCampaignAd = {
  campaign_id: string;
  campaign_name: string;
  ad_id: string;
  ad_name: string;
  impressions: number;
  link_clicks: number;
  spend_brl: number;
  leads: number;
  conversations_started: number;
};

export type ChartPoint = {
  date: string;
  campaign_name: string;
  campaign_id: string;
  leads: number;
};

export type DashboardData = {
  date: string;
  channel_id: string;
  totals: DashboardTotals;
  rows: RowByCampaignAd[];
  chartData: ChartPoint[];
};
