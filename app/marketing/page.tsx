"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { DashboardData, DashboardTotals } from "@/types/marketing";
import { formatDateForDisplay, getYesterday } from "@/lib/date";
import { LeadsChart } from "./LeadsChart";
import { MetricsTable } from "./MetricsTable";
import { ScoreCard } from "./ScoreCard";
import {
  MarketingSidebar,
  type FilterState,
} from "./MarketingSidebar";

type Channel = { id: string; name: string };

const initialFilterState = (): FilterState => {
  const d = getYesterday();
  return {
    since: d,
    until: d,
    useRange: false,
    campaignIds: [],
    adSetIds: [],
    adIds: [],
    objective: "",
  };
};

export default function MarketingPage() {
  const [channelId, setChannelId] = useState("meta_ads");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [filterState, setFilterState] = useState<FilterState>(initialFilterState);
  const [filterOptions, setFilterOptions] = useState<{
    campaigns: { id: string; name: string; objective?: string }[];
    ad_sets: { id: string; name: string; campaign_id: string }[];
    ads: { id: string; name: string; campaign_id: string; ad_set_id?: string }[];
    objectives: string[];
  } | null>(null);
  const [loadingFilterOptions, setLoadingFilterOptions] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/channels");
      if (!res.ok) throw new Error("Falha ao carregar canais");
      const list = await res.json();
      setChannels(Array.isArray(list) ? list : []);
    } catch {
      setChannels([{ id: "meta_ads", name: "Meta Ads" }]);
    }
  }, []);

  const loadFilterOptions = useCallback(
    async (state?: FilterState) => {
      const s = state ?? filterState;
      setLoadingFilterOptions(true);
      try {
        const params = new URLSearchParams();
        params.set("channel", channelId);
        const useRange =
          s.useRange || (s.since && s.until && s.since !== s.until);
        if (useRange && s.since && s.until) {
          params.set("since", s.since);
          params.set("until", s.until);
        } else {
          params.set("date", s.since || getYesterday());
        }
        if (s.campaignIds.length)
          params.set("campaign_ids", s.campaignIds.join(","));
        if (s.adSetIds.length)
          params.set("ad_set_ids", s.adSetIds.join(","));
        if (s.adIds.length) params.set("ad_ids", s.adIds.join(","));
        if (s.objective) params.set("objective", s.objective);
        const res = await fetch(`/api/marketing/filters?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setFilterOptions(json);
        }
      } catch {
        setFilterOptions(null);
      } finally {
        setLoadingFilterOptions(false);
      }
    },
    [channelId, filterState]
  );

  const loadData = useCallback(
    async (override?: Partial<FilterState>) => {
      const state = override ? { ...filterState, ...override } : filterState;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("channel", channelId);
        const useRange =
          state.useRange || (state.since && state.until && state.since !== state.until);
        if (useRange && state.since && state.until) {
          params.set("since", state.since);
          params.set("until", state.until);
        } else {
          params.set("date", state.since || getYesterday());
        }
        if (state.campaignIds.length)
          params.set("campaign_ids", state.campaignIds.join(","));
        if (state.adSetIds.length)
          params.set("ad_set_ids", state.adSetIds.join(","));
        if (state.adIds.length)
          params.set("ad_ids", state.adIds.join(","));
        if (state.objective) params.set("objective", state.objective);

        const res = await fetch(`/api/marketing?${params.toString()}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText);
        }
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar dados");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [channelId, filterState]
  );

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    loadFilterOptions(filterState);
  }, [
    loadFilterOptions,
    filterState.since,
    filterState.until,
    filterState.useRange,
    filterState.campaignIds.join(","),
    filterState.adSetIds.join(","),
    filterState.adIds.join(","),
    filterState.objective,
  ]);

  useEffect(() => {
    loadData();
  }, [channelId]);

  const t = data?.totals ?? null;
  const cpm =
    t && t.impressions > 0 ? (t.spend_brl / t.impressions) * 1000 : 0;
  const cpc = t && t.link_clicks > 0 ? t.spend_brl / t.link_clicks : 0;
  const cpr = t && t.leads > 0 ? t.spend_brl / t.leads : 0;
  const custoPorMensagem =
    t && t.conversations_started > 0
      ? t.spend_brl / t.conversations_started
      : 0;

  const formatBRL = (n: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const formatNum = (n: number) =>
    new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  const prev = data?.previousTotals;
  const isRange = Boolean(data?.since && data?.until && data.since !== data.until);

  const dailyByDate = useMemo(() => {
    if (!data?.rows?.length) return new Map<string, Partial<DashboardTotals>>();
    const map = new Map<string, Partial<DashboardTotals>>();
    for (const r of data.rows) {
      const d = r.date ?? data.date;
      const cur = map.get(d) ?? {
        spend_brl: 0,
        impressions: 0,
        link_clicks: 0,
        conversations_started: 0,
        leads: 0,
        leads_gerais: 0,
      };
      cur.spend_brl = (cur.spend_brl ?? 0) + (r.spend_brl ?? 0);
      cur.impressions = (cur.impressions ?? 0) + (r.impressions ?? 0);
      cur.link_clicks = (cur.link_clicks ?? 0) + (r.link_clicks ?? 0);
      cur.conversations_started = (cur.conversations_started ?? 0) + (r.conversations_started ?? 0);
      cur.leads = (cur.leads ?? 0) + (r.leads ?? 0);
      cur.leads_gerais = (cur.leads_gerais ?? 0) + (r.leads_gerais ?? 0);
      map.set(d, cur);
    }
    return map;
  }, [data?.rows, data?.date]);

  const sortedDates = useMemo(() => [...dailyByDate.keys()].sort(), [dailyByDate]);

  const spark = useMemo<(key: keyof DashboardTotals) => number[]>(
    () => (key) => {
      if (!sortedDates.length) return [];
      return sortedDates.map((d) => (dailyByDate.get(d)?.[key] as number) ?? 0);
    },
    [sortedDates, dailyByDate]
  );

  const delta = useCallback(
    (current: number, previous: number): number | null => {
      if (previous === 0) return current > 0 ? 100 : null;
      return ((current - previous) / previous) * 100;
    },
    []
  );

  return (
    <div className="min-h-screen bg-[#0a1628] text-gray-100 flex">
      <MarketingSidebar
        filterState={filterState}
        setFilterState={setFilterState}
        options={filterOptions}
        loadingOptions={loadingFilterOptions}
        onApply={loadData}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        channels={channels}
        channelId={channelId}
        onChannelChange={setChannelId}
      />
      <div
        className={`flex-1 min-w-0 p-6 transition-[padding] duration-200 ${
          sidebarOpen ? "lg:pl-72" : ""
        }`}
      >
        <div className="max-w-6xl mx-auto">
          <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <h1 className="text-2xl font-semibold text-white">
              Relatório Diário — Marketing
            </h1>
          </header>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-800 text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-gray-400 py-12">Carregando…</div>
        ) : data ? (
          <>
            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <ScoreCard
                label="Leads Gerais"
                value={formatNum(t!.leads_gerais ?? 0)}
                deltaPercent={prev ? delta(t!.leads_gerais ?? 0, prev.leads_gerais ?? 0) : null}
                sparklineData={isRange ? spark("leads_gerais") : []}
                metricType="result"
              />
              <ScoreCard
                label="Leads"
                value={formatNum(t!.leads ?? 0)}
                deltaPercent={prev ? delta(t!.leads ?? 0, prev.leads ?? 0) : null}
                sparklineData={isRange ? spark("leads") : []}
                metricType="result"
              />
              <ScoreCard
                label="Conversas iniciadas"
                value={formatNum(t!.conversations_started)}
                deltaPercent={prev ? delta(t!.conversations_started, prev.conversations_started ?? 0) : null}
                sparklineData={isRange ? spark("conversations_started") : []}
                metricType="result"
              />
              <ScoreCard
                label="Valor investido (BRL)"
                value={formatBRL(t!.spend_brl)}
                deltaPercent={prev ? delta(t!.spend_brl, prev.spend_brl ?? 0) : null}
                sparklineData={isRange ? spark("spend_brl") : []}
                metricType="cost"
              />
              <ScoreCard
                label="Cliques no link"
                value={formatNum(t!.link_clicks)}
                deltaPercent={prev ? delta(t!.link_clicks, prev.link_clicks ?? 0) : null}
                sparklineData={isRange ? spark("link_clicks") : []}
                metricType="result"
              />
              <ScoreCard
                label="Impressões"
                value={formatNum(t!.impressions)}
                deltaPercent={prev ? delta(t!.impressions, prev.impressions ?? 0) : null}
                sparklineData={isRange ? spark("impressions") : []}
                metricType="result"
              />
            </section>

            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              <ScoreCard
                label="Custo por mensagem iniciada"
                value={formatBRL(custoPorMensagem)}
                deltaPercent={
                  prev && prev.conversations_started
                    ? delta(custoPorMensagem, (prev.spend_brl ?? 0) / prev.conversations_started)
                    : null
                }
                sparklineData={[]}
                metricType="cost"
              />
              <ScoreCard
                label="CPM"
                value={formatBRL(cpm)}
                deltaPercent={
                  prev && prev.impressions
                    ? delta(cpm, ((prev.spend_brl ?? 0) / prev.impressions) * 1000)
                    : null
                }
                sparklineData={[]}
                metricType="cost"
              />
              <ScoreCard
                label="CPC"
                value={formatBRL(cpc)}
                deltaPercent={
                  prev && prev.link_clicks
                    ? delta(cpc, (prev.spend_brl ?? 0) / prev.link_clicks)
                    : null
                }
                sparklineData={[]}
                metricType="cost"
              />
              <ScoreCard
                label="CPL (custo por lead)"
                value={formatBRL(cpr)}
                deltaPercent={
                  prev && prev.leads_gerais
                    ? delta(cpr, (prev.spend_brl ?? 0) / prev.leads_gerais)
                    : null
                }
                sparklineData={[]}
                metricType="cost"
              />
            </section>

            {data.chartData.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-medium text-white mb-4">
                  Conversas iniciadas por dia por campanha
                </h2>
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
                  <LeadsChart data={data.chartData} metric="conversations" />
                </div>
              </section>
            )}

            <section>
              <h2 className="text-lg font-medium text-white mb-4">
                Por campanha e anúncio
                {data.since && data.until && data.since !== data.until
                  ? ` — ${formatDateForDisplay(data.since)} a ${formatDateForDisplay(data.until)}`
                  : ` — ${formatDateForDisplay(data.date)}`}
              </h2>
              <MetricsTable
                rows={data.rows}
                formatBRL={formatBRL}
                formatNum={formatNum}
                reportDate={data.date}
              />
            </section>
          </>
        ) : (
          <div className="text-gray-400 py-12">
            Nenhum dado para a data e canal selecionados.
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

