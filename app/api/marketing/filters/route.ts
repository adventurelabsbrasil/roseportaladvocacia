import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channel") ?? "meta_ads";

    const supabase = createServerSupabase();

    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id, name, objective")
      .eq("channel_id", channelId)
      .order("name");

    const campaignIds = (campaigns ?? []).map((c) => c.id);

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

    const { data: ads } = await supabase
      .from("ads")
      .select("id, name, campaign_id, ad_set_id")
      .in("campaign_id", campaignIds.length ? campaignIds : ["00000000-0000-0000-0000-000000000000"])
      .order("name");

    const objectives = [
      ...new Set(
        (campaigns ?? [])
          .map((c) => (c as { objective?: string }).objective)
          .filter((o): o is string => o != null && o !== "")
      ),
    ].sort();

    return NextResponse.json({
      campaigns: campaigns ?? [],
      ad_sets: adSets,
      ads: ads ?? [],
      objectives,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load filters";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
