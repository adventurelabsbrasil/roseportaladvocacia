"use client";

import { getPresetRange } from "@/lib/date";

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

type MarketingSidebarProps = {
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  options: FilterOptions | null;
  loadingOptions: boolean;
  onApply: (override?: Partial<FilterState>) => void;
  open: boolean;
  onToggle: () => void;
};

export function MarketingSidebar({
  filterState,
  setFilterState,
  options,
  loadingOptions,
  onApply,
  open,
  onToggle,
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
        className="fixed left-4 top-4 z-20 rounded bg-[#1a1a1a] px-3 py-2 text-sm text-white border border-gray-700 lg:hidden"
      >
        {open ? "Fechar filtros" : "Filtros"}
      </button>

      <aside
        className={`
          fixed top-0 left-0 z-10 h-full w-72 overflow-y-auto bg-[#1a1a1a] border-r border-gray-800 p-4
          transition-transform duration-200 ease-out
          lg:static lg:z-0 lg:transform-none lg:flex-shrink-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="pt-12 lg:pt-4 space-y-6">
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
              className="w-full bg-[#0f0f0f] border border-gray-700 rounded px-3 py-2 text-white text-sm"
            />
            <label className="block text-xs text-gray-400">Até</label>
            <input
              type="date"
              value={filterState.until}
              onChange={(e) =>
                setFilterState((s) => ({ ...s, until: e.target.value }))
              }
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
          {loadingOptions ? (
            <p className="text-gray-500 text-xs">Carregando…</p>
          ) : options?.campaigns?.length ? (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {options.campaigns.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filterState.campaignIds.includes(c.id)}
                    onChange={() => toggleCampaign(c.id)}
                    className="rounded border-gray-600"
                  />
                  <span className="truncate">{c.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-xs">Nenhuma campanha</p>
          )}

          <h2 className="text-sm font-semibold text-white uppercase tracking-wider pt-2">
            Conjuntos de anúncio
          </h2>
          {options?.ad_sets?.length ? (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {options.ad_sets.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filterState.adSetIds.includes(a.id)}
                    onChange={() => toggleAdSet(a.id)}
                    className="rounded border-gray-600"
                  />
                  <span className="truncate">{a.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-xs">Nenhum conjunto</p>
          )}

          <h2 className="text-sm font-semibold text-white uppercase tracking-wider pt-2">
            Anúncios
          </h2>
          {options?.ads?.length ? (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {options.ads.slice(0, 50).map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filterState.adIds.includes(a.id)}
                    onChange={() => toggleAd(a.id)}
                    className="rounded border-gray-600"
                  />
                  <span className="truncate">{a.name}</span>
                </label>
              ))}
              {options.ads.length > 50 && (
                <p className="text-gray-500 text-xs">
                  +{options.ads.length - 50} mais
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-xs">Nenhum anúncio</p>
          )}

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
