"use client";

import { useId } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

type ScoreCardProps = {
  label: string;
  value: string;
  deltaPercent: number | null;
  sparklineData: number[];
  metricType: "cost" | "result";
};

export function ScoreCard({
  label,
  value,
  deltaPercent,
  sparklineData,
  metricType,
}: ScoreCardProps) {
  const hasDelta = deltaPercent != null && Number.isFinite(deltaPercent);
  const isPositive = (deltaPercent ?? 0) > 0;
  const isNegative = (deltaPercent ?? 0) < 0;
  const isCost = metricType === "cost";
  const good = isCost ? isNegative : isPositive;
  const bad = isCost ? isPositive : isNegative;
  const deltaColor = !hasDelta ? "text-gray-500" : good ? "text-emerald-400" : bad ? "text-red-400" : "text-gray-400";

  const chartData = sparklineData.length
    ? sparklineData.map((v, i) => ({ i, v }))
    : [];
  const gradientId = useId().replace(/:/g, "");

  return (
    <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4 flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="text-white text-xl font-semibold">{value}</p>
        {hasDelta && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${deltaColor}`}>
            {isPositive && <span aria-hidden>↑</span>}
            {isNegative && <span aria-hidden>↓</span>}
            {deltaPercent! > 0 ? "+" : ""}
            {deltaPercent!.toFixed(1)}% vs período anterior
          </p>
        )}
      </div>
      {chartData.length > 1 && (
        <div className="shrink-0 w-14 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6b7280" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#6b7280" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke="#9ca3af"
                strokeWidth={1}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
