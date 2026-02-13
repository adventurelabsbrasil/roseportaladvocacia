"use client";

import { useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ChartPoint } from "@/types/marketing";
import { formatDateBR } from "@/lib/date";

type LeadsChartProps = {
  data: ChartPoint[];
  /** "conversations" = conversas iniciadas (padrão), "leads" = leads (parser Meta) */
  metric?: "conversations" | "leads";
};

export function LeadsChart({ data, metric = "conversations" }: LeadsChartProps) {
  const [hiddenDataKeys, setHiddenDataKeys] = useState<Set<string>>(new Set());

  const toggleLegend = useCallback((dataKey: string) => {
    setHiddenDataKeys((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) next.delete(dataKey);
      else next.add(dataKey);
      return next;
    });
  }, []);

  const dates = [...new Set(data.map((d) => d.date))].sort();
  const allCampaigns = Array.from(
    new Map(data.map((d) => [d.campaign_id, d.campaign_name])).entries()
  );
  const campaignTotals = new Map<string, number>();
  for (const d of data) {
    const v = metric === "conversations" ? d.conversations_started : d.leads;
    campaignTotals.set(d.campaign_id, (campaignTotals.get(d.campaign_id) ?? 0) + v);
  }
  const campaigns = allCampaigns
    .sort((a, b) => (campaignTotals.get(b[0]) ?? 0) - (campaignTotals.get(a[0]) ?? 0))
    .slice(0, 5);

  const series = dates.map((date) => {
    const point: Record<string, string | number> = {
      date: formatDateBR(date, true),
      fullDate: date,
    };
    for (const [campaignId, name] of campaigns) {
      const total = data
        .filter((d) => d.date === date && d.campaign_id === campaignId)
        .reduce(
          (sum, d) =>
            sum +
            (metric === "conversations" ? d.conversations_started : d.leads),
          0
        );
      point[name || campaignId] = total;
    }
    return point;
  });

  const metricLabel =
    metric === "conversations" ? "Conversas iniciadas" : "Leads";

  const colors = [
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#f59e0b",
    "#ec4899",
  ];

  if (series.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
        Sem dados para exibir no gráfico.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="w-full" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series}
            margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="date"
              stroke="#888"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
            />
            <YAxis stroke="#888" tick={{ fill: "#9ca3af", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#e5e7eb" }}
              formatter={(value: number) => [value, metricLabel]}
              labelFormatter={(_, payload) => {
                const full = payload?.[0]?.payload?.fullDate;
                return full ? `Data: ${formatDateBR(full, false)}` : "";
              }}
            />
            {campaigns.map(([campaignId, name], i) => {
              const dataKey = name || campaignId;
              return (
                <Line
                  key={campaignId}
                  type="monotone"
                  dataKey={dataKey}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2}
                  dot={{ fill: colors[i % colors.length], r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                  name={dataKey}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  hide={hiddenDataKeys.has(dataKey)}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="overflow-x-auto overflow-y-hidden">
        <ul className="flex flex-wrap justify-center gap-4 list-none min-h-[2rem]">
          {campaigns.map(([campaignId, name], i) => {
            const dataKey = name || campaignId;
            const hidden = hiddenDataKeys.has(dataKey);
            const color = colors[i % colors.length];
            return (
              <li
                key={campaignId}
                onClick={() => toggleLegend(dataKey)}
                className={
                  hidden
                    ? "text-gray-500 opacity-60 line-through cursor-pointer shrink-0"
                    : "text-gray-300 cursor-pointer shrink-0"
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") toggleLegend(dataKey);
                }}
                role="button"
                tabIndex={0}
              >
                <span
                  className="inline-block w-3 h-3 rounded-full mr-1.5 align-middle"
                  style={{ backgroundColor: color }}
                />
                {dataKey}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
