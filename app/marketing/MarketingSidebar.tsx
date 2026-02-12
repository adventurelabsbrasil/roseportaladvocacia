"use client";

import { useRef, useEffect, useState } from "react";
import { getPresetRange } from "@/lib/date";

function FilterDropdown({
  label,
  options,
  selectedIds,
  onToggle,
  loading,
}: {
  label: string;
  options: { id: string; name: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const filtered = query.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
    : options;
  const n = selectedIds.length;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left bg-[#0f0f0f] border border-gray-700 rounded px-3 py-2 text-white text-sm flex items-center justify-between"
      >
        <span className="truncate">
          {label}
          {n > 0 && <span className="text-gray-400 ml-1">({n})</span>}
        </span>
        <span className="text-gray-500 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#1a1a1a] border border-gray-700 rounded shadow-lg max-h-56 flex flex-col">
          <input
            type="text"
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="m-2 py-1.5 px-2 rounded bg-[#0f0f0f] border border-gray-700 text-white text-sm placeholder-gray-500"
          />
          <div className="overflow-y-auto flex-1 min-h-0 p-2 space-y-1">
            {loading ? (
              <p className="text-gray-500 text-xs">Carregando…</p>
            ) : filtered.length === 0 ? (
              <p className="text-gray-500 text-xs">Nenhum resultado</p>
            ) : (
              filtered.map((o) => (
                <label
                  key={o.id}
                  className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:bg-[#0f0f0f] rounded px-2 py-1"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(o.id)}
                    onChange={() => onToggle(o.id)}
                    className="rounded border-gray-600"
                  />
                  <span className="truncate">{o.name}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export type FilterState = {
  since: string;
  until: string;
  useRange: boolean;
  campaignIds: string[];
  adSetIds: string[];
  adIds: string[];
  objective: string;
};

type FilterOptions = {
  campaigns: { id: string; name: string; objective?: string }[];
  ad_sets: { id: string; name: string; campaign_id: string }[];
  ads: { id: string; name: string; campaign_id: string; ad_set_id?: string }[];
  objectives: string[];
};

type Channel = { id: string; name: string };

type MarketingSidebarProps = {
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  options: FilterOptions | null;
  loadingOptions: boolean;
  onApply: (override?: Partial<FilterState>) => void;
  open: boolean;
  onToggle: () => void;
  channels: Channel[];
  channelId: string;
  onChannelChange: (channelId: string) => void;
};

export function MarketingSidebar({
  filterState,
  setFilterState,
  options,
  loadingOptions,
  onApply,
  open,
  onToggle,
  channels,
  channelId,
  onChannelChange,
}: MarketingSidebarProps) {
  const setPreset = (preset: "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth") => {
    const { since, until } = getPresetRange(preset);
    const useRange = preset !== "yesterday";
    setFilterState((s) => ({ ...s, since, until, useRange }));
    onApply({ since, until, useRange });
  };

  const toggleCampaign = (id: string) => {
    setFilterState((s) => ({
      ...s,
      campaignIds: s.campaignIds.includes(id)
        ? s.campaignIds.filter((x) => x !== id)
        : [...s.campaignIds, id],
    }));
  };
  const toggleAdSet = (id: string) => {
    setFilterState((s) => ({
      ...s,
      adSetIds: s.adSetIds.includes(id)
        ? s.adSetIds.filter((x) => x !== id)
        : [...s.adSetIds, id],
    }));
  };
  const toggleAd = (id: string) => {
    setFilterState((s) => ({
      ...s,
      adIds: s.adIds.includes(id)
        ? s.adIds.filter((x) => x !== id)
        : [...s.adIds, id],
    }));
  };

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="fixed left-4 top-4 z-20 rounded bg-[#1a1a1a] px-3 py-2 text-sm text-white border border-gray-700"
        aria-label={open ? "Fechar filtros" : "Abrir filtros"}
      >
        {open ? "Fechar filtros" : "Filtros"}
      </button>

      <aside
        className={`
          fixed top-0 left-0 z-10 h-full overflow-y-auto bg-[#1a1a1a] border-r border-gray-800 p-4
          transition-all duration-200 ease-out
          lg:relative lg:flex-shrink-0 lg:z-0
          ${open ? "translate-x-0 w-72" : "-translate-x-full w-0 lg:translate-x-0 lg:w-0 lg:overflow-hidden"}
        `}
      >
        <div className="pt-12 lg:pt-4 space-y-6">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Canal
          </h2>
          <select
            value={channelId}
            onChange={(e) => onChannelChange(e.target.value)}
            className="w-full bg-[#0f0f0f] border border-gray-700 rounded px-3 py-2 text-white text-sm"
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

          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Período
          </h2>
          <div className="space-y-2">
            <label className="block text-xs text-gray-400">De</label>
            <input
              type="date"
              value={filterState.since}
              onChange={(e) =>
                setFilterState((s) => ({ ...s, since: e.target.value }))
              }
              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              className="w-full bg-[#0f0f0f] border border-gray-700 rounded px-3 py-2 text-white text-sm"
            />
            <label className="block text-xs text-gray-400">Até</label>
            <input
              type="date"
              value={filterState.until}
              onChange={(e) =>
                setFilterState((s) => ({ ...s, until: e.target.value }))
              }
              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              className="w-full bg-[#0f0f0f] border border-gray-700 rounded px-3 py-2 text-white text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPreset("yesterday")}
              className="px-2 py-1.5 rounded bg-[#0f0f0f] text-gray-300 text-xs hover:bg-gray-800"
            >
              Ontem
            </button>
            <button
              type="button"
              onClick={() => setPreset("last7")}
              className="px-2 py-1.5 rounded bg-[#0f0f0f] text-gray-300 text-xs hover:bg-gray-800"
            >
              7 dias
            </button>
            <button
              type="button"
              onClick={() => setPreset("last30")}
              className="px-2 py-1.5 rounded bg-[#0f0f0f] text-gray-300 text-xs hover:bg-gray-800"
            >
              30 dias
            </button>
            <button
              type="button"
              onClick={() => setPreset("thisMonth")}
              className="px-2 py-1.5 rounded bg-[#0f0f0f] text-gray-300 text-xs hover:bg-gray-800"
            >
              Este mês
            </button>
            <button
              type="button"
              onClick={() => setPreset("lastMonth")}
              className="px-2 py-1.5 rounded bg-[#0f0f0f] text-gray-300 text-xs hover:bg-gray-800"
            >
              Mês passado
            </button>
          </div>

          <h2 className="text-sm font-semibold text-white uppercase tracking-wider pt-2">
            Campanhas
          </h2>
          <FilterDropdown
            label="Campanhas"
            options={options?.campaigns ?? []}
            selectedIds={filterState.campaignIds}
            onToggle={toggleCampaign}
            loading={loadingOptions}
          />

          <h2 className="text-sm font-semibold text-white uppercase tracking-wider pt-2">
            Conjuntos de anúncio
          </h2>
          <FilterDropdown
            label="Conjuntos de anúncio"
            options={options?.ad_sets ?? []}
            selectedIds={filterState.adSetIds}
            onToggle={toggleAdSet}
            loading={loadingOptions}
          />

          <h2 className="text-sm font-semibold text-white uppercase tracking-wider pt-2">
            Anúncios
          </h2>
          <FilterDropdown
            label="Anúncios"
            options={options?.ads ?? []}
            selectedIds={filterState.adIds}
            onToggle={toggleAd}
            loading={loadingOptions}
          />

          <h2 className="text-sm font-semibold text-white uppercase tracking-wider pt-2">
            Objetivo
          </h2>
          <select
            value={filterState.objective}
            onChange={(e) =>
              setFilterState((s) => ({ ...s, objective: e.target.value }))
            }
            className="w-full bg-[#0f0f0f] border border-gray-700 rounded px-3 py-2 text-white text-sm"
          >
            <option value="">Todos</option>
            {(options?.objectives ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onApply()}
            className="w-full py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium"
          >
            Aplicar filtros
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[5] lg:hidden"
          aria-hidden
          onClick={onToggle}
        />
      )}
    </>
  );
}
