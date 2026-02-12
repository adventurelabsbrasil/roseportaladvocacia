"use client";

import { useEffect, useState, useCallback } from "react";
import type { DashboardData } from "@/types/marketing";
import { formatDateForDisplay, getYesterday } from "@/lib/date";
import { LeadsChart } from "./LeadsChart";

type Channel = { id: string; name: string };

export default function MarketingPage() {
  const [date, setDate] = useState(getYesterday());
  const [channelId, setChannelId] = useState("meta_ads");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/marketing?date=${encodeURIComponent(date)}&channel=${encodeURIComponent(channelId)}`
      );
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
  }, [date, channelId]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSync = async () => {
    setSyncing(true);
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

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-semibold text-white">
            Relatório Diário — Marketing
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-400">
              Data
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-white text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-400">
              Canal
              <select
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-white text-sm min-w-[140px]"
              >
                {channels.length
                  ? channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  : (
                      <option value="meta_ads">Meta Ads</option>
                    )}
              </select>
            </label>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {syncing ? "Sincronizando…" : "Sincronizar ontem"}
            </button>
          </div>
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
            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              <KpiCard
                label="Total de leads"
                value={formatNum(t!.leads)}
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
            </section>

            <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <MetricCard label="CPM" value={formatBRL(cpm)} />
              <MetricCard label="CPC" value={formatBRL(cpc)} />
              <MetricCard label="CPR (custo por lead)" value={formatBRL(cpr)} />
              <MetricCard
                label="Custo por mensagem iniciada"
                value={formatBRL(custoPorMensagem)}
              />
            </section>

            {data.chartData.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-medium text-white mb-4">
                  Leads por dia por campanha
                </h2>
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
                  <LeadsChart data={data.chartData} />
                </div>
              </section>
            )}

            <section>
              <h2 className="text-lg font-medium text-white mb-4">
                Por campanha e anúncio — {formatDateForDisplay(data.date)}
              </h2>
              <div className="overflow-x-auto rounded-lg border border-gray-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#1a1a1a] text-gray-400 text-left">
                      <th className="px-4 py-3 font-medium">Campanha</th>
                      <th className="px-4 py-3 font-medium">Anúncio</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Impressões
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        Cliques
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        Investido (BRL)
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        Leads
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        Conversas
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r, i) => (
                      <tr
                        key={`${r.campaign_id}-${r.ad_id}-${i}`}
                        className="border-t border-gray-800 hover:bg-[#1a1a1a]/50"
                      >
                        <td className="px-4 py-3 text-white">
                          {r.campaign_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {r.ad_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {formatNum(r.impressions)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {formatNum(r.link_clicks)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {formatBRL(r.spend_brl)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {formatNum(r.leads)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {formatNum(r.conversations_started)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
