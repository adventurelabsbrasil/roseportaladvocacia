import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channel") ?? "meta_ads";

    const supabase = createServerSupabase();

    let campaigns: { id: string; name: string; objective?: string }[] = [];
    const campaignsRes = await supabase
      .from("campaigns")
      .select("id, name, objective")
      .eq("channel_id", channelId)
      .order("name");
    if (campaignsRes.error && /objective|column/.test(campaignsRes.error.message)) {
      const fallback = await supabase
        .from("campaigns")
        .select("id, name")
        .eq("channel_id", channelId)
        .order("name");
      campaigns = (fallback.data ?? []) as { id: string; name: string }[];
    } else {
      campaigns = (campaignsRes.data ?? []) as { id: string; name: string; objective?: string }[];
    }

    const campaignIds = campaigns.map((c) => c.id);

    let adSets: { id: string; name: string; campaign_id: string }[] = [];
    try {
      const res = await supabase
        .from("ad_sets")
        .select("id, name, campaign_id")
        .in("campaign_id", campaignIds.length ? campaignIds : ["00000000-0000-0000-0000-000000000000"])
        .order("name");
      adSets = res.data ?? [];
    } catch {
      // ad_sets table may not exist yet
    }

    let ads: { id: string; name: string; campaign_id: string; ad_set_id?: string }[] = [];
    const adsRes = await supabase
      .from("ads")
      .select("id, name, campaign_id, ad_set_id")
      .in("campaign_id", campaignIds.length ? campaignIds : ["00000000-0000-0000-0000-000000000000"])
      .order("name");
    if (adsRes.error && /ad_set_id|column/.test(adsRes.error.message)) {
      const fallback = await supabase
        .from("ads")
        .select("id, name, campaign_id")
        .in("campaign_id", campaignIds.length ? campaignIds : ["00000000-0000-0000-0000-000000000000"])
        .order("name");
      ads = (fallback.data ?? []) as { id: string; name: string; campaign_id: string }[];
    } else {
      ads = (adsRes.data ?? []) as { id: string; name: string; campaign_id: string; ad_set_id?: string }[];
    }

    const objectives = [
      ...new Set(
        campaigns
          .map((c) => c.objective)
          .filter((o): o is string => o != null && o !== "")
      ),
    ].sort();

    return NextResponse.json({
      campaigns,
      ad_sets: adSets,
      ads,
      objectives,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load filters";
    console.error("[GET /api/marketing/filters]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
