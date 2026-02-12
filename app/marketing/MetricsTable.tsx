"use client";

import { useState, useMemo, Fragment } from "react";
import type { RowByCampaignAd } from "@/types/marketing";

type SortKey = keyof RowByCampaignAd;
type GroupBy = "none" | "campaign" | "date" | "month";

type MetricsTableProps = {
  rows: RowByCampaignAd[];
  formatBRL: (n: number) => string;
  formatNum: (n: number) => string;
  };

const SORT_KEYS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "campaign_name", label: "Campanha", align: "left" },
  { key: "ad_name", label: "Anúncio", align: "left" },
  { key: "impressions", label: "Impressões", align: "right" },
  { key: "link_clicks", label: "Cliques", align: "right" },
  { key: "spend_brl", label: "Investido (BRL)", align: "right" },
  { key: "results", label: "Resultados", align: "right" },
  { key: "conversations_started", label: "Conversas", align: "right" },
  { key: "leads", label: "Leads", align: "right" },
];

export function MetricsTable({
  rows,
  formatBRL,
  formatNum,
}: MetricsTableProps) {
  const [sortBy, setSortBy] = useState<SortKey>("campaign_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(
    new Set()
  );
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const rowsWithDate = useMemo(() => {
    type RowWithDate = RowByCampaignAd & { date?: string };
    return rows as RowWithDate[];
  }, [rows]);

  const hasDate = rowsWithDate.some((r) => "date" in r && r.date);

  const sortedRows = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const va = a[sortBy];
      const vb = b[sortBy];
      if (typeof va === "string" && typeof vb === "string") {
        const c = va.localeCompare(vb);
        return sortOrder === "asc" ? c : -c;
      }
      const na = Number(va) || 0;
      const nb = Number(vb) || 0;
      return sortOrder === "asc" ? na - nb : nb - na;
    });
    return arr;
  }, [rows, sortBy, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else setSortBy(key);
  };

  const toggleCampaign = (id: string) => {
    setExpandedCampaigns((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleDate = (d: string) => {
    setExpandedDates((s) => {
      const next = new Set(s);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };
  const toggleMonth = (m: string) => {
    setExpandedMonths((s) => {
      const next = new Set(s);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  const formatMonth = (yyyyMm: string) => {
    const [y, m] = yyyyMm.split("-");
    const months = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez",
    ];
    return `${months[parseInt(m || "1", 10) - 1]} ${y}`;
  };

  if (sortedRows.length === 0) {
    return (
      <div className="text-gray-500 py-6 text-center text-sm">
        Nenhuma linha para exibir.
      </div>
    );
  }

  const renderRow = (r: RowByCampaignAd, indent = false) => (
    <tr
      key={`${r.campaign_id}-${r.ad_id}`}
      className="border-t border-gray-800 hover:bg-[#1a1a1a]/50"
    >
      <td className={`px-4 py-3 text-white ${indent ? "pl-8" : ""}`}>
        {r.campaign_name || "—"}
      </td>
      <td className={`px-4 py-3 text-gray-300 ${indent ? "pl-8" : ""}`}>
        {r.ad_name || "—"}
      </td>
      {SORT_KEYS.slice(2).map(({ key, align }) => (
        <td
          key={key}
          className={`px-4 py-3 text-right text-gray-300 ${
            key === "impressions" || key === "link_clicks" ? "" : ""
          }`}
        >
          {key === "spend_brl"
            ? formatBRL(Number(r[key]) || 0)
            : formatNum(Number(r[key]) || 0)}
        </td>
      ))}
    </tr>
  );

  if (groupBy === "campaign") {
    const byCampaign = new Map<string, RowByCampaignAd[]>();
    for (const r of sortedRows) {
      const id = r.campaign_id;
      if (!byCampaign.has(id)) byCampaign.set(id, []);
      byCampaign.get(id)!.push(r);
    }
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-gray-400">Agrupar por:</span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-white"
          >
            <option value="none">Nenhum</option>
            <option value="campaign">Campanha</option>
            <option value="date" disabled={!hasDate}>
              Data {!hasDate && "(período necessário)"}
            </option>
            <option value="month" disabled={!hasDate}>
              Mês {!hasDate && "(período necessário)"}
            </option>
          </select>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1a1a1a] text-gray-400 text-left">
                {SORT_KEYS.map(({ key, label, align }) => (
                  <th
                    key={key}
                    className={`px-4 py-3 font-medium cursor-pointer select-none ${
                      align === "right" ? "text-right" : ""
                    } ${sortBy === key ? "text-white" : ""}`}
                    onClick={() => handleSort(key)}
                  >
                    {label}
                    {sortBy === key && (
                      <span className="ml-1">
                        {sortOrder === "asc" ? " ↑" : " ↓"}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(byCampaign.entries()).map(([campaignId, groupRows]) => {
                const name = groupRows[0]?.campaign_name ?? campaignId;
                const expanded = expandedCampaigns.has(campaignId);
                const totalResults = groupRows.reduce(
                  (s, r) => s + (r.results || 0),
                  0
                );
                return (
                  <Fragment key={campaignId}>
                    <tr
                      className="border-t border-gray-800 bg-[#1a1a1a]/70 cursor-pointer hover:bg-[#1a1a1a]"
                      onClick={() => toggleCampaign(campaignId)}
                    >
                      <td className="px-4 py-2 text-white font-medium">
                        <span className="mr-2">{expanded ? "−" : "+"}</span>
                        {name}
                      </td>
                      <td className="px-4 py-2 text-gray-400 italic">
                        {groupRows.length} anúncio(s)
                      </td>
                      <td colSpan={2} className="px-4 py-2 text-right text-gray-400" />
                      <td className="px-4 py-2 text-right text-white">
                        {formatNum(totalResults)}
                      </td>
                      <td colSpan={3} className="px-4 py-2 text-right text-gray-400" />
                    </tr>
                    {expanded && groupRows.map((r) => renderRow(r, true))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (groupBy === "date" && hasDate) {
    const byDate = new Map<string, RowByCampaignAd[]>();
    for (const r of sortedRows) {
      const d = (r as RowByCampaignAd & { date?: string }).date ?? "";
      if (!d) continue;
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d)!.push(r);
    }
    const sortedDates = [...byDate.keys()].sort();
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-gray-400">Agrupar por:</span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-white"
          >
            <option value="none">Nenhum</option>
            <option value="campaign">Campanha</option>
            <option value="date">Data</option>
            <option value="month">Mês</option>
          </select>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1a1a1a] text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">Data</th>
                {SORT_KEYS.slice(1).map(({ key, label, align }) => (
                  <th
                    key={key}
                    className={`px-4 py-3 font-medium cursor-pointer select-none ${
                      align === "right" ? "text-right" : ""
                    }`}
                    onClick={() => handleSort(key)}
                  >
                    {label}
                    {sortBy === key && (sortOrder === "asc" ? " ↑" : " ↓")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedDates.map((d) => {
                const groupRows = byDate.get(d) ?? [];
                const expanded = expandedDates.has(d);
                return (
                  <Fragment key={d}>
                    <tr
                      className="border-t border-gray-800 bg-[#1a1a1a]/70 cursor-pointer"
                      onClick={() => toggleDate(d)}
                    >
                      <td className="px-4 py-2 text-white font-medium">
                        {expanded ? "−" : "+"} {d}
                      </td>
                      <td colSpan={7} className="px-4 py-2 text-gray-400 italic">
                        {groupRows.length} linha(s)
                      </td>
                    </tr>
                    {expanded && groupRows.map((r) => renderRow(r, true))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (groupBy === "month" && hasDate) {
    const byMonth = new Map<string, RowByCampaignAd[]>();
    for (const r of sortedRows) {
      const d = (r as RowByCampaignAd & { date?: string }).date ?? "";
      if (!d) continue;
      const m = d.slice(0, 7);
      if (!byMonth.has(m)) byMonth.set(m, []);
      byMonth.get(m)!.push(r);
    }
    const sortedMonths = [...byMonth.keys()].sort().reverse();
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-gray-400">Agrupar por:</span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-white"
          >
            <option value="none">Nenhum</option>
            <option value="campaign">Campanha</option>
            <option value="date">Data</option>
            <option value="month">Mês</option>
          </select>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1a1a1a] text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">Mês</th>
                {SORT_KEYS.slice(1).map(({ key, label, align }) => (
                  <th
                    key={key}
                    className={`px-4 py-3 font-medium cursor-pointer ${
                      align === "right" ? "text-right" : ""
                    }`}
                    onClick={() => handleSort(key)}
                  >
                    {label}
                    {sortBy === key && (sortOrder === "asc" ? " ↑" : " ↓")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedMonths.map((m) => {
                const groupRows = byMonth.get(m) ?? [];
                const expanded = expandedMonths.has(m);
                return (
                  <Fragment key={m}>
                    <tr
                      className="border-t border-gray-800 bg-[#1a1a1a]/70 cursor-pointer"
                      onClick={() => toggleMonth(m)}
                    >
                      <td className="px-4 py-2 text-white font-medium">
                        {expanded ? "−" : "+"} {formatMonth(m)}
                      </td>
                      <td colSpan={7} className="px-4 py-2 text-gray-400 italic">
                        {groupRows.length} linha(s)
                      </td>
                    </tr>
                    {expanded && groupRows.map((r) => renderRow(r, true))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-gray-400">Agrupar por:</span>
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupBy)}
          className="bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-white"
        >
          <option value="none">Nenhum</option>
          <option value="campaign">Campanha</option>
          <option value="date" disabled={!hasDate}>
            Data {!hasDate && "(período necessário)"}
          </option>
          <option value="month" disabled={!hasDate}>
            Mês {!hasDate && "(período necessário)"}
          </option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1a1a1a] text-gray-400 text-left">
              {SORT_KEYS.map(({ key, label, align }) => (
                <th
                  key={key}
                  className={`px-4 py-3 font-medium cursor-pointer select-none ${
                    align === "right" ? "text-right" : ""
                  } ${sortBy === key ? "text-white" : ""}`}
                  onClick={() => handleSort(key)}
                >
                  {label}
                  {sortBy === key && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? " ↑" : " ↓"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r) => renderRow(r))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
