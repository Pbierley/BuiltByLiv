"use client";

import { useState } from "react";

export type ChartPoint = {
  at: string;
  label: string;
  value: number;
};

const width = 640;
const height = 220;
const pad = { left: 58, right: 18, top: 16, bottom: 32 };

export function MetricChart({
  points,
  formatValue,
  formatTick = formatValue,
  label,
}: {
  points: ChartPoint[];
  formatValue: (value: number) => string;
  formatTick?: (value: number) => string;
  label: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  if (!points.length) return null;

  const values = points.map((point) => point.value);
  const { min, max, ticks } = axisBounds(Math.min(...values), Math.max(...values));
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const xAt = (index: number) =>
    pad.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
  const yAt = (value: number) => pad.top + ((max - value) / (max - min)) * innerHeight;
  const labelIndexes =
    points.length <= 4
      ? points.map((_, index) => index)
      : [0, Math.round((points.length - 1) / 2), points.length - 1];
  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xAt(index).toFixed(1)} ${yAt(point.value).toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${xAt(points.length - 1).toFixed(1)} ${(pad.top + innerHeight).toFixed(1)} L ${xAt(0).toFixed(1)} ${(pad.top + innerHeight).toFixed(1)} Z`;
  const chosen = active ?? points.length - 1;
  const summary = `${label}. ${points[0].label}, ${formatValue(points[0].value)}. Latest, ${points[points.length - 1].label}, ${formatValue(points[points.length - 1].value)}.`;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-52 w-full overflow-visible"
        role="img"
        aria-label={summary}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={yAt(tick)}
              y2={yAt(tick)}
              className="stroke-border"
            />
            <text
              x={pad.left - 10}
              y={yAt(tick) + 4}
              textAnchor="end"
              fontSize="12"
              className="fill-muted-foreground"
            >
              {formatTick(tick)}
            </text>
          </g>
        ))}
        <path d={area} className="fill-primary/15" />
        <path d={line} className="fill-none stroke-primary" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point, index) => (
          <g key={`${point.at}-${index}`}>
            <circle
              cx={xAt(index)}
              cy={yAt(point.value)}
              r="12"
              className="fill-transparent"
              tabIndex={0}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
            >
              <title>
                {point.label}: {formatValue(point.value)}
              </title>
            </circle>
            <circle
              cx={xAt(index)}
              cy={yAt(point.value)}
              r={index === chosen ? 5 : 3.5}
              className="pointer-events-none fill-card stroke-primary"
              strokeWidth={index === chosen ? 2.5 : 2}
            />
          </g>
        ))}
        {labelIndexes.map((index) => (
          <text
            key={points[index].at + index}
            x={xAt(index)}
            y={height - 8}
            textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
            fontSize="12"
            className="fill-muted-foreground"
          >
            {points[index].label.replace(/, \d{4}$/, "")}
          </text>
        ))}
      </svg>
      {active != null ? (
        <p
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap text-sm"
          style={{
            left: `${(xAt(active) / width) * 100}%`,
            top: `${(yAt(points[active].value) / height) * 100}%`,
          }}
        >
          <span className="inline-flex items-baseline gap-2 border border-border bg-card px-2 py-1 leading-5">
            <span className="text-muted-foreground">{points[active].label}</span>
            <span className="font-medium tabular-nums">{formatValue(points[active].value)}</span>
          </span>
        </p>
      ) : null}
    </div>
  );
}

function axisBounds(low: number, high: number) {
  const span = Math.max(high - low, Math.abs(high) * 0.08, 1);
  const rough = span / 3;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((value) => value >= rough) ?? rough;
  const min = Math.floor(low / step) * step;
  const max = Math.ceil(high / step) * step;
  const ticks: number[] = [];
  for (let value = max; value >= min - step / 100; value -= step) ticks.push(Number(value.toFixed(4)));
  return { min, max: Math.max(max, min + step), ticks };
}

export function trendText(points: ChartPoint[], formatValue: (value: number) => string) {
  if (points.length < 2) return "One log so far";
  const delta = points[points.length - 1].value - points[0].value;
  if (Math.abs(delta) < 0.05) return `Same as ${points[0].label}`;
  const sign = delta > 0 ? "+" : "−";
  return `${sign}${formatValue(Math.abs(delta))} since ${points[0].label}`;
}
