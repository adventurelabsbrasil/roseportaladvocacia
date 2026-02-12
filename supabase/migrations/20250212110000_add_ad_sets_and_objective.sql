-- Conjunto de anúncios (ad set) e objetivo da campanha
CREATE TABLE IF NOT EXISTS ad_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_ad_sets_campaign ON ad_sets(campaign_id);

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS objective TEXT;

ALTER TABLE ads
ADD COLUMN IF NOT EXISTS ad_set_id UUID REFERENCES ad_sets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ads_ad_set ON ads(ad_set_id);
