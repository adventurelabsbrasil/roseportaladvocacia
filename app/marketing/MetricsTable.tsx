"use client";

import { useState, useMemo, Fragment, useCallback, useRef, useEffect } from "react";
import type { RowByCampaignAd } from "@/types/marketing";
import { formatDateBR } from "@/lib/date";

type GroupBy = "none" | "campaign" | "date" | "month";

const PAGE_SIZES = [10, 25, 50, 100];

type MetricsTableProps = {
  rows: RowByCampaignAd[];
  formatBRL: (n: number) => string;
  formatNum: (n: number) => string;
  reportDate?: string;
};

type ColId =
  | "report_date"
  | "channel_name"
  | "campaign_name"
  | "ad_name"
  | "objective"
  | "spend_brl"
  | "impressions"
  | "link_clicks"
  | "conversations_started"
  | "leads"
  | "leads_gerais"
  | "ctr"
  | "cpm"
  | "cpc"
  | "custo_conversa"
  | "cpl";

const COLUMNS: { id: ColId; label: string; align: "left" | "right"; filterable?: boolean }[] = [
  { id: "report_date", label: "Data do relatório", align: "left", filterable: false },
  { id: "channel_name", label: "Canal", align: "left", filterable: true },
  { id: "campaign_name", label: "Campanha", align: "left", filterable: true },
  { id: "ad_name", label: "Anúncio", align: "left", filterable: true },
  { id: "objective", label: "Objetivo", align: "left", filterable: true },
  { id: "spend_brl", label: "Valor investido", align: "right", filterable: false },
  { id: "impressions", label: "Impressões", align: "right", filterable: false },
  { id: "link_clicks", label: "Cliques", align: "right", filterable: false },
  { id: "conversations_started", label: "Conversas iniciadas", align: "right", filterable: false },
  { id: "leads", label: "Leads", align: "right", filterable: false },
  { id: "leads_gerais", label: "Leads Gerais", align: "right", filterable: false },
  { id: "ctr", label: "CTR", align: "right", filterable: false },
  { id: "cpm", label: "CPM", align: "right", filterable: false },
  { id: "cpc", label: "CPC", align: "right", filterable: false },
  { id: "custo_conversa", label: "Custo por Conversa", align: "right", filterable: false },
  { id: "cpl", label: "CPL", align: "right", filterable: false },
];

function getCellValue(
  r: RowByCampaignAd,
  colId: ColId,
  reportDate: string | undefined,
  formatBRL: (n: number) => string,
  formatNum: (n: number) => string
): string | number {
  const dateVal = r.date ?? reportDate ?? "";
  switch (colId) {
    case "report_date":
      return dateVal ? formatDateBR(dateVal, false) : "—";
    case "channel_name":
      return r.channel_name ?? "—";
    case "campaign_name":
      return r.campaign_name ?? "—";
    case "ad_name":
      return r.ad_name ?? "—";
    case "objective":
      return r.objective ?? "—";
    case "spend_brl":
      return formatBRL(r.spend_brl ?? 0);
    case "impressions":
      return formatNum(r.impressions ?? 0);
    case "link_clicks":
      return formatNum(r.link_clicks ?? 0);
    case "conversations_started":
      return formatNum(r.conversations_started ?? 0);
    case "leads":
      return formatNum(r.leads ?? 0);
    case "leads_gerais":
      return formatNum(r.leads_gerais ?? 0);
    case "ctr": {
      const imp = r.impressions ?? 0;
      const clicks = r.link_clicks ?? 0;
      const pct = imp > 0 ? (clicks / imp) * 100 : 0;
      return imp > 0 ? `${pct.toFixed(2)}%` : "—";
    }
    case "cpm": {
      const imp = r.impressions ?? 0;
      const spend = r.spend_brl ?? 0;
      const cpm = imp > 0 ? (spend / imp) * 1000 : 0;
      return imp > 0 ? formatBRL(cpm) : "—";
    }
    case "cpc": {
      const clicks = r.link_clicks ?? 0;
      const spend = r.spend_brl ?? 0;
      return clicks > 0 ? formatBRL(spend / clicks) : "—";
    }
    case "custo_conversa": {
      const conv = r.conversations_started ?? 0;
      const spend = r.spend_brl ?? 0;
      return conv > 0 ? formatBRL(spend / conv) : "—";
    }
    case "cpl": {
      const lg = r.leads_gerais ?? 0;
      const spend = r.spend_brl ?? 0;
      return lg > 0 ? formatBRL(spend / lg) : "—";
    }
    default:
      return "—";
  }
}

function getSortValue(r: RowByCampaignAd, colId: ColId, reportDate: string | undefined): string | number {
  const dateVal = r.date ?? reportDate ?? "";
  switch (colId) {
    case "report_date":
      return dateVal;
    case "channel_name":
      return (r.channel_name ?? "").toLowerCase();
    case "campaign_name":
      return (r.campaign_name ?? "").toLowerCase();
    case "ad_name":
      return (r.ad_name ?? "").toLowerCase();
    case "objective":
      return (r.objective ?? "").toLowerCase();
    case "spend_brl":
      return r.spend_brl ?? 0;
    case "impressions":
      return r.impressions ?? 0;
    case "link_clicks":
      return r.link_clicks ?? 0;
    case "conversations_started":
      return r.conversations_started ?? 0;
    case "leads":
      return r.leads ?? 0;
    case "leads_gerais":
      return r.leads_gerais ?? 0;
    case "ctr": {
      const imp = r.impressions ?? 0;
      const clicks = r.link_clicks ?? 0;
      return imp > 0 ? (clicks / imp) * 100 : 0;
    }
    case "cpm": {
      const imp = r.impressions ?? 0;
      const spend = r.spend_brl ?? 0;
      return imp > 0 ? (spend / imp) * 1000 : 0;
    }
    case "cpc": {
      const clicks = r.link_clicks ?? 0;
      const spend = r.spend_brl ?? 0;
      return clicks > 0 ? spend / clicks : 0;
    }
    case "custo_conversa": {
      const conv = r.conversations_started ?? 0;
      const spend = r.spend_brl ?? 0;
      return conv > 0 ? spend / conv : 0;
    }
    case "cpl": {
      const lg = r.leads_gerais ?? 0;
      const spend = r.spend_brl ?? 0;
      return lg > 0 ? spend / lg : 0;
    }
    default:
      return 0;
  }
}

const DEFAULT_VISIBLE: ColId[] = COLUMNS.map((c) => c.id);

export function MetricsTable({
  rows,
  formatBRL,
  formatNum,
  reportDate,
}: MetricsTableProps) {
  const [sortBy, setSortBy] = useState<ColId>("report_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [tableFilter, setTableFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [visibleColumns, setVisibleColumns] = useState<Set<ColId>>(new Set(DEFAULT_VISIBLE));
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!columnsOpen) return;
    const handle = (e: MouseEvent) => {
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) setColumnsOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [columnsOpen]);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const rowsWithDate = useMemo(() => rows, [rows]);
  const hasDate = rowsWithDate.some((r) => r.date);

  const filteredByColumns = useMemo(() => {
    let result = rows;
    const q = tableFilter.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          (r.campaign_name ?? "").toLowerCase().includes(q) ||
          (r.ad_name ?? "").toLowerCase().includes(q) ||
          (r.channel_name ?? "").toLowerCase().includes(q) ||
          (r.objective ?? "").toLowerCase().includes(q)
      );
    }
    COLUMNS.forEach((col) => {
      const filterVal = columnFilters[col.id]?.trim().toLowerCase();
      if (!filterVal || !col.filterable) return;
      result = result.filter((r) => {
        const cell = getCellValue(r, col.id, reportDate, formatBRL, formatNum);
        return String(cell).toLowerCase().includes(filterVal);
      });
    });
    return result;
  }, [rows, tableFilter, columnFilters, reportDate, formatBRL, formatNum]);

  const sortedRows = useMemo(() => {
    const arr = [...filteredByColumns];
    arr.sort((a, b) => {
      const va = getSortValue(a, sortBy, reportDate);
      const vb = getSortValue(b, sortBy, reportDate);
      if (va === vb) return 0;
      const cmp = typeof va === "string" && typeof vb === "string"
        ? va.localeCompare(vb, "pt-BR")
        : (Number(va) - Number(vb));
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filteredByColumns, sortBy, sortOrder, reportDate]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const visibleCols = useMemo(() => COLUMNS.filter((c) => visibleColumns.has(c.id)), [visibleColumns]);

  const handleSort = useCallback((colId: ColId) => {
    if (sortBy === colId) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(colId);
      setSortOrder("asc");
    }
  }, [sortBy]);

  const toggleColumn = useCallback((colId: ColId) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  }, []);

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
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${months[parseInt(m || "1", 10) - 1]} ${y}`;
  };

  const renderRow = (r: RowByCampaignAd, indent = false) => (
    <tr key={`${r.campaign_id}-${r.ad_id}-${r.date ?? ""}`} className="border-t border-gray-800 hover:bg-[#1a1a1a]/50">
      {visibleCols.map((col) => (
        <td
          key={col.id}
          className={`px-4 py-3 text-gray-300 ${col.align === "right" ? "text-right" : ""} ${indent ? "pl-8" : ""}`}
        >
          {getCellValue(r, col.id, reportDate, formatBRL, formatNum)}
        </td>
      ))}
    </tr>
  );

  if (sortedRows.length === 0) {
    return (
      <div className="text-gray-500 py-6 text-center text-sm">
        Nenhuma linha para exibir.
      </div>
    );
  }

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="text-gray-400">Agrupar por:</span>
      <select
        value={groupBy}
        onChange={(e) => {
          setGroupBy(e.target.value as GroupBy);
          setPage(1);
        }}
        className="bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-white"
      >
        <option value="none">Nenhum</option>
        <option value="campaign">Campanha</option>
        <option value="date" disabled={!hasDate}>Data {!hasDate && "(período necessário)"}</option>
        <option value="month" disabled={!hasDate}>Mês {!hasDate && "(período necessário)"}</option>
      </select>
      <div className="relative" ref={columnsRef}>
        <button
          type="button"
          onClick={() => setColumnsOpen((o) => !o)}
          className="bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-white hover:bg-gray-800"
        >
          Colunas ({visibleCols.length}/{COLUMNS.length})
        </button>
        {columnsOpen && (
          <div className="absolute left-0 top-full mt-1 z-20 bg-[#1a1a1a] border border-gray-700 rounded shadow-lg p-2 max-h-64 overflow-y-auto min-w-[180px]">
            {COLUMNS.map((col) => (
              <label key={col.id} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={visibleColumns.has(col.id)}
                  onChange={() => toggleColumn(col.id)}
                  className="rounded border-gray-600"
                />
                {col.label}
              </label>
            ))}
          </div>
        )}
      </div>
      <input
        type="text"
        placeholder="Filtrar (campanha, anúncio, canal, objetivo)"
        value={tableFilter}
        onChange={(e) => {
          setTableFilter(e.target.value);
          setPage(1);
        }}
        className="flex-1 min-w-[200px] bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 text-sm"
      />
      <span className="text-gray-500 text-xs">{sortedRows.length} linha(s)</span>
    </div>
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
        {toolbar}
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1a1a1a] text-gray-400 text-left">
                {visibleCols.map((col) => (
                  <th
                    key={col.id}
                    role="columnheader"
                    className={`px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-300 ${col.align === "right" ? "text-right" : ""} ${sortBy === col.id ? "text-white" : ""}`}
                    onClick={() => handleSort(col.id)}
                  >
                    {col.label}
                    {sortBy === col.id && <span className="ml-1">{sortOrder === "asc" ? " ↑" : " ↓"}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(byCampaign.entries()).map(([campaignId, groupRows]) => {
                const name = groupRows[0]?.campaign_name ?? campaignId;
                const expanded = expandedCampaigns.has(campaignId);
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
                      <td colSpan={visibleCols.length - 1} className="px-4 py-2 text-gray-400 italic">
                        {groupRows.length} anúncio(s)
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

  if (groupBy === "date" && hasDate) {
    const byDate = new Map<string, RowByCampaignAd[]>();
    for (const r of sortedRows) {
      const d = r.date ?? "";
      if (!d) continue;
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d)!.push(r);
    }
    const sortedDates = [...byDate.keys()].sort();
    return (
      <div className="space-y-4">
        {toolbar}
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1a1a1a] text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">Data</th>
                {visibleCols.filter((c) => c.id !== "report_date").map((col) => (
                  <th
                    key={col.id}
                    className={`px-4 py-3 font-medium cursor-pointer select-none ${col.align === "right" ? "text-right" : ""}`}
                    onClick={() => handleSort(col.id)}
                  >
                    {col.label}
                    {sortBy === col.id && (sortOrder === "asc" ? " ↑" : " ↓")}
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
                    <tr className="border-t border-gray-800 bg-[#1a1a1a]/70 cursor-pointer" onClick={() => toggleDate(d)}>
                      <td className="px-4 py-2 text-white font-medium">{expanded ? "−" : "+"} {formatDateBR(d, false)}</td>
                      <td colSpan={visibleCols.length - 1} className="px-4 py-2 text-gray-400 italic">
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
      const d = r.date ?? "";
      if (!d) continue;
      const m = d.slice(0, 7);
      if (!byMonth.has(m)) byMonth.set(m, []);
      byMonth.get(m)!.push(r);
    }
    const sortedMonths = [...byMonth.keys()].sort().reverse();
    return (
      <div className="space-y-4">
        {toolbar}
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1a1a1a] text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">Mês</th>
                {visibleCols.filter((c) => c.id !== "report_date").map((col) => (
                  <th
                    key={col.id}
                    className={`px-4 py-3 font-medium cursor-pointer ${col.align === "right" ? "text-right" : ""}`}
                    onClick={() => handleSort(col.id)}
                  >
                    {col.label}
                    {sortBy === col.id && (sortOrder === "asc" ? " ↑" : " ↓")}
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
                    <tr className="border-t border-gray-800 bg-[#1a1a1a]/70 cursor-pointer" onClick={() => toggleMonth(m)}>
                      <td className="px-4 py-2 text-white font-medium">{expanded ? "−" : "+"} {formatMonth(m)}</td>
                      <td colSpan={visibleCols.length - 1} className="px-4 py-2 text-gray-400 italic">
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
      {toolbar}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1a1a1a] text-gray-400 text-left">
              {visibleCols.map((col) => (
                <th
                  key={col.id}
                  role="columnheader"
                  className={`px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-300 ${col.align === "right" ? "text-right" : ""} ${sortBy === col.id ? "text-white" : ""}`}
                  onClick={() => handleSort(col.id)}
                >
                  {col.label}
                  {sortBy === col.id && <span className="ml-1">{sortOrder === "asc" ? " ↑" : " ↓"}</span>}
                </th>
              ))}
            </tr>
            <tr className="bg-[#0a1628] text-gray-500 text-left">
              {visibleCols.map((col) => (
                <th key={col.id} className={`px-4 py-2 ${col.align === "right" ? "text-right" : ""}`}>
                  {col.filterable ? (
                    <input
                      type="text"
                      placeholder={`Filtrar ${col.label}`}
                      value={columnFilters[col.id] ?? ""}
                      onChange={(e) => {
                        setColumnFilters((prev) => ({ ...prev, [col.id]: e.target.value }));
                        setPage(1);
                      }}
                      className="w-full min-w-0 max-w-[140px] bg-[#1a1a1a] border border-gray-700 rounded px-2 py-1 text-white text-xs placeholder-gray-500"
                    />
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((r) => renderRow(r))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Linhas por página:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-[#1a1a1a] border border-gray-700 rounded px-2 py-1.5 text-white"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Página {currentPage} de {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-2 py-1 rounded bg-[#1a1a1a] border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-2 py-1 rounded bg-[#1a1a1a] border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
