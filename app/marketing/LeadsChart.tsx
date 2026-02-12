"use client";

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

type LeadsChartProps = { data: ChartPoint[] };

export function LeadsChart({ data }: LeadsChartProps) {
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
        .reduce((sum, d) => sum + d.leads, 0);
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
          formatter={(value: number) => [value, "Leads"]}
          labelFormatter={(label) => `Data: ${label}`}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value) => <span className="text-gray-300">{value}</span>}
        />
        {campaigns.map(([campaignId, name], i) => (
          <Line
            key={campaignId}
            type="monotone"
            dataKey={name || campaignId}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            dot={{ fill: colors[i % colors.length], r: 4 }}
            activeDot={{ r: 6 }}
            connectNulls
            name={name || campaignId}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
