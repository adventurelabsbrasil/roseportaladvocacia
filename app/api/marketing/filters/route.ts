import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Retorna opções de filtro (campanhas, conjuntos, anúncios, objetivos) restritas ao
 * período selecionado e aos filtros já aplicados (sobreposição). Só aparecem itens
 * que têm pelo menos uma linha em daily_metrics no período.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channel") ?? "meta_ads";
    const sinceParam = searchParams.get("since");
    const untilParam = searchParams.get("until");
    const dateParam = searchParams.get("date");
    const campaignIdsParam = searchParams.get("campaign_ids");
    const adSetIdsParam = searchParams.get("ad_set_ids");
    const adIdsParam = searchParams.get("ad_ids");
    const objectiveParam = searchParams.get("objective");

    const hasRange =
      sinceParam &&
      untilParam &&
      /^\d{4}-\d{2}-\d{2}$/.test(sinceParam) &&
      /^\d{4}-\d{2}-\d{2}$/.test(untilParam);
    const hasDate =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam);

    if (!hasRange && !hasDate) {
      return NextResponse.json(
        { error: "Informe since+until ou date" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();

    let metricsQuery = supabase
      .from("daily_metrics")
      .select("campaign_id, ad_id")
      .eq("channel_id", channelId);

    if (hasRange) {
      metricsQuery = metricsQuery
        .gte("date", sinceParam!)
        .lte("date", untilParam!);
    } else {
      metricsQuery = metricsQuery.eq("date", dateParam!);
    }

    const { data: metricsRows, error: metricsError } = await metricsQuery;
    if (metricsError) {
      throw new Error(metricsError.message);
    }

    const rows = (metricsRows ?? []) as { campaign_id: string; ad_id: string }[];
    let campaignIdSet = new Set(rows.map((r) => r.campaign_id));
    let adIdSet = new Set(rows.map((r) => r.ad_id));

    if (campaignIdsParam) {
      const filterCampaigns = campaignIdsParam.split(",").filter(Boolean);
      if (filterCampaigns.length) {
        campaignIdSet = new Set(
          [...campaignIdSet].filter((id) => filterCampaigns.includes(id))
        );
        adIdSet = new Set(
          rows
            .filter((r) => campaignIdSet.has(r.campaign_id))
            .map((r) => r.ad_id)
            .filter((id) => adIdSet.has(id))
        );
      }
    }
    if (adIdsParam) {
      const filterAds = adIdsParam.split(",").filter(Boolean);
      if (filterAds.length) {
        adIdSet = new Set([...adIdSet].filter((id) => filterAds.includes(id)));
        campaignIdSet = new Set(
          rows
            .filter((r) => adIdSet.has(r.ad_id))
            .map((r) => r.campaign_id)
            .filter((id) => campaignIdSet.has(id))
        );
      }
    }

    const campaignIds = [...campaignIdSet];
    const adIds = [...adIdSet];

    if (campaignIds.length === 0 && adIds.length === 0) {
      return NextResponse.json({
        campaigns: [],
        ad_sets: [],
        ads: [],
        objectives: [],
      });
    }

    let campaignsRes = await supabase
      .from("campaigns")
      .select("id, name, objective")
      .in("id", campaignIds.length ? campaignIds : ["00000000-0000-0000-0000-000000000000"])
      .eq("channel_id", channelId)
      .order("name");

    if (campaignsRes.error && /objective|column/.test(campaignsRes.error.message)) {
      const fallback = await supabase
        .from("campaigns")
        .select("id, name")
        .in("id", campaignIds.length ? campaignIds : ["00000000-0000-0000-0000-000000000000"])
        .eq("channel_id", channelId)
        .order("name");
      campaignsRes = fallback as typeof campaignsRes;
    }

    let campaigns = (campaignsRes.data ?? []) as {
      id: string;
      name: string;
      objective?: string;
    }[];

    if (objectiveParam && objectiveParam !== "") {
      campaigns = campaigns.filter((c) => c.objective === objectiveParam);
    }

    const campaignIdsAfterObjective = new Set(campaigns.map((c) => c.id));

    let adsRes = await supabase
      .from("ads")
      .select("id, name, campaign_id, ad_set_id")
      .in("id", adIds.length ? adIds : ["00000000-0000-0000-0000-000000000000"])
      .in("campaign_id", campaignIdsAfterObjective.size ? [...campaignIdsAfterObjective] : ["00000000-0000-0000-0000-000000000000"])
      .order("name");

    if (adsRes.error && /ad_set_id|column/.test(adsRes.error.message)) {
      const fallback = await supabase
        .from("ads")
        .select("id, name, campaign_id")
        .in("id", adIds.length ? adIds : ["00000000-0000-0000-0000-000000000000"])
        .in("campaign_id", campaignIdsAfterObjective.size ? [...campaignIdsAfterObjective] : ["00000000-0000-0000-0000-000000000000"])
        .order("name");
      adsRes = fallback as typeof adsRes;
    }

    let ads = (adsRes.data ?? []) as {
      id: string;
      name: string;
      campaign_id: string;
      ad_set_id?: string;
    }[];

    if (adSetIdsParam) {
      const filterAdSets = adSetIdsParam.split(",").filter(Boolean);
      if (filterAdSets.length) {
        ads = ads.filter(
          (a) => a.ad_set_id != null && filterAdSets.includes(a.ad_set_id)
        );
      }
    }

    const adSetIds = [
      ...new Set(
        ads.map((a) => a.ad_set_id).filter((id): id is string => id != null && id !== "")
      ),
    ];

    let adSets: { id: string; name: string; campaign_id: string }[] = [];
    if (adSetIds.length > 0) {
      try {
        const res = await supabase
          .from("ad_sets")
          .select("id, name, campaign_id")
          .in("id", adSetIds)
          .in("campaign_id", [...campaignIdsAfterObjective])
          .order("name");
        adSets = res.data ?? [];
      } catch {
        // ad_sets table may not exist
      }
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
