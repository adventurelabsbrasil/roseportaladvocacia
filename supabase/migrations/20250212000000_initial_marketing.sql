-- Marketing report: channels, campaigns, ads, daily_metrics
-- Run this in Supabase SQL Editor or via Supabase CLI

-- Channels (Meta Ads, Google Ads, etc.)
CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campaigns per channel
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_channel ON campaigns(channel_id);

-- Ads per campaign
CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_ads_campaign ON ads(campaign_id);

-- Daily metrics (one row per channel/campaign/ad/date)
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions BIGINT NOT NULL DEFAULT 0,
  link_clicks BIGINT NOT NULL DEFAULT 0,
  spend_brl NUMERIC(12,2) NOT NULL DEFAULT 0,
  leads INT NOT NULL DEFAULT 0,
  conversations_started INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel_id, campaign_id, ad_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_channel_date ON daily_metrics(channel_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_campaign_date ON daily_metrics(campaign_id, date);

-- RLS: enable but allow service role full access (anon can read if you add policy later)
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: service role bypasses RLS by default in Supabase
-- Optional: allow anon read for dashboard (uncomment when you have anon key)
-- CREATE POLICY "Allow public read on channels" ON channels FOR SELECT USING (true);
-- CREATE POLICY "Allow public read on campaigns" ON campaigns FOR SELECT USING (true);
-- CREATE POLICY "Allow public read on ads" ON ads FOR SELECT USING (true);
-- CREATE POLICY "Allow public read on daily_metrics" ON daily_metrics FOR SELECT USING (true);

-- Seed Meta Ads channel
INSERT INTO channels (id, name, enabled) VALUES ('meta_ads', 'Meta Ads', true)
ON CONFLICT (id) DO NOTHING;
