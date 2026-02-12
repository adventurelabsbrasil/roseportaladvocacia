"use client";

import { useEffect, useState, useCallback } from "react";
import type { DashboardData } from "@/types/marketing";
import { formatDateForDisplay, getYesterday } from "@/lib/date";
import { LeadsChart } from "./LeadsChart";
import { MetricsTable } from "./MetricsTable";
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
  const [syncing, setSyncing] = useState(false);
  const [historySyncing, setHistorySyncing] = useState(false);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
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

  const loadFilterOptions = useCallback(async () => {
    setLoadingFilterOptions(true);
    try {
      const res = await fetch(
        `/api/marketing/filters?channel=${encodeURIComponent(channelId)}`
      );
      if (res.ok) {
        const json = await res.json();
        setFilterOptions(json);
      }
    } catch {
      setFilterOptions(null);
    } finally {
      setLoadingFilterOptions(false);
    }
  }, [channelId]);

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
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    loadData();
  }, [channelId]);

  const handleSync = async () => {
    setSyncing(true);
    setHistoryMessage(null);
    try {
      const res = await fetch("/api/sync/meta", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sync falhou");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no sync");
    } finally {
      setSyncing(false);
    }
  };

  const handlePullHistory = async () => {
    setHistorySyncing(true);
    setHistoryMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/sync/meta/history?since=2025-08-01", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Histórico falhou");
      const msg =
        json.success !== undefined
          ? `Histórico: ${json.success} lotes ok, ${json.errors || 0} com erro.`
          : "Histórico concluído.";
      setHistoryMessage(msg);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao puxar histórico");
    } finally {
      setHistorySyncing(false);
    }
  };

  const t = data?.totals ?? null;
  const cpm =
    t && t.impressions > 0 ? (t.spend_brl / t.impressions) * 1000 : 0;
  const cpc = t && t.link_clicks > 0 ? t.spend_brl / t.link_clicks : 0;
  const custoPorResultado =
    t && t.results > 0 ? t.spend_brl / t.results : 0;
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

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 flex">
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
      <div className="flex-1 min-w-0 p-6">
        <div className="max-w-6xl mx-auto">
          <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <h1 className="text-2xl font-semibold text-white">
              Relatório Diário — Marketing
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <button
              type="button"
              onClick={handleSync}
              disabled={syncing || historySyncing}
              className="px-4 py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {syncing ? "Sincronizando…" : "Sincronizar ontem"}
            </button>
            <button
              type="button"
              onClick={handlePullHistory}
              disabled={syncing || historySyncing}
              className="px-4 py-2 rounded bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {historySyncing
                ? "Puxando histórico…"
                : "Puxar histórico (01/08/2025 até ontem)"}
            </button>
            </div>
          </header>

        {historyMessage && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-900/30 border border-emerald-800 text-emerald-200">
            {historyMessage}
          </div>
        )}

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
              <KpiCard
                label="Resultados (mensagem iniciada / objetivo)"
                value={formatNum(t!.results)}
              />
              <KpiCard
                label="Conversas iniciadas"
                value={formatNum(t!.conversations_started)}
              />
              <KpiCard
                label="Valor investido (BRL)"
                value={formatBRL(t!.spend_brl)}
              />
              <KpiCard
                label="Cliques no link"
                value={formatNum(t!.link_clicks)}
              />
              <KpiCard
                label="Impressões"
                value={formatNum(t!.impressions)}
              />
              <KpiCard
                label="Leads"
                value={formatNum((t!.leads ?? 0) + (t!.conversations_started ?? 0))}
              />
            </section>

            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              <MetricCard
                label="Custo por resultado (principal)"
                value={formatBRL(custoPorResultado)}
              />
              <MetricCard
                label="Custo por mensagem iniciada"
                value={formatBRL(custoPorMensagem)}
              />
              <MetricCard label="CPM" value={formatBRL(cpm)} />
              <MetricCard label="CPC" value={formatBRL(cpc)} />
              <MetricCard label="CPR (custo por lead)" value={formatBRL(cpr)} />
            </section>

            {data.chartData.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-medium text-white mb-4">
                  Resultados por dia por campanha
                </h2>
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
                  <LeadsChart data={data.chartData} useResults />
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
              />
            </section>
          </>
        ) : (
          <div className="text-gray-400 py-12">
            Nenhum dado para a data e canal selecionados. Use &quot;Sincronizar
            ontem&quot; para buscar dados do Meta.
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-white text-xl font-semibold">{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-white font-medium">{value}</p>
    </div>
  );
}
