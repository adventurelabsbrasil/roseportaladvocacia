"use client";

import { useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ChartPoint } from "@/types/marketing";

type LeadsChartProps = { data: ChartPoint[]; useResults?: boolean };

export function LeadsChart({ data, useResults = false }: LeadsChartProps) {
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
  const campaigns = Array.from(
    new Map(data.map((d) => [d.campaign_id, d.campaign_name])).entries()
  );
  const series = dates.map((date) => {
    const point: Record<string, string | number> = {
      date: date.slice(5),
      fullDate: date,
    };
    for (const [campaignId, name] of campaigns) {
      const total = data
        .filter((d) => d.date === date && d.campaign_id === campaignId)
        .reduce((sum, d) => sum + (useResults ? d.results : d.leads), 0);
      point[name || campaignId] = total;
    }
    return point;
  });

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
    <ResponsiveContainer width="100%" height={320}>
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
          formatter={(value: number) => [value, useResults ? "Resultados" : "Leads"]}
          labelFormatter={(label) => `Data: ${label}`}
        />
        <Legend
          content={(props) => {
            const { payload } = props;
            if (!payload?.length) return null;
            return (
              <ul className="flex flex-wrap justify-center gap-4 mt-2 list-none">
                {payload.map((entry) => {
                  const key = entry.value ?? entry.dataKey;
                  const hidden = key != null && hiddenDataKeys.has(String(key));
                  return (
                    <li
                      key={key}
                      onClick={() => key != null && toggleLegend(String(key))}
                      className={
                        hidden
                          ? "text-gray-500 opacity-60 line-through cursor-pointer"
                          : "text-gray-300 cursor-pointer"
                      }
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " ") && key != null)
                          toggleLegend(String(key));
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-1.5 align-middle"
                        style={{ backgroundColor: entry.color }}
                      />
                      {entry.value}
                    </li>
                  );
                })}
              </ul>
            );
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
  );
}
