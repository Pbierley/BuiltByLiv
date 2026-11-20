"use client";

import { useState } from "react";
import { MetricChart, trendText, type ChartPoint } from "@/components/metric-chart";
import type { ExerciseProgress } from "@/lib/queries";

export function ExerciseProgressCharts({
  exercises,
  unit,
}: {
  exercises: ExerciseProgress[];
  unit: "lb" | "kg";
}) {
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? "");
  const exercise = exercises.find((item) => item.id === exerciseId) ?? exercises[0];

  if (!exercise) {
    return (
      <p className="text-sm text-muted-foreground">
        Log a workout and the charts for weight, reps, volume, and time will show up here.
      </p>
    );
  }

  const charts = [
    exercise.weight.length
      ? {
          key: "weight",
          title: "Weight",
          points: exercise.weight,
          format: (value: number) => formatAmount(value, unit),
          tick: formatTick,
        }
      : null,
    exercise.reps.length
      ? {
          key: "reps",
          title: "Reps",
          points: exercise.reps,
          format: (value: number) => formatAmount(value, "reps"),
          tick: formatTick,
        }
      : null,
    exercise.volume.length
      ? {
          key: "volume",
          title: "Volume",
          points: exercise.volume,
          format: (value: number) => formatVolume(value, unit),
          tick: formatVolumeTick,
        }
      : null,
    exercise.duration.length
      ? {
          key: "duration",
          title: "Duration",
          points: exercise.duration,
          format: formatDuration,
          tick: formatDuration,
        }
      : null,
  ].filter((chart) => chart != null);

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-primary">Progress</p>
          <h2 className="mt-2 font-display text-3xl tracking-tight">{exercise.name}</h2>
        </div>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Exercise</span>
          <select
            value={exercise.id}
            onChange={(event) => setExerciseId(event.target.value)}
            className="h-11 min-w-56 border border-input bg-card px-3 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {exercises.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {charts.map((chart) => (
          <MetricCard
            key={chart.key}
            title={chart.title}
            points={chart.points}
            formatValue={chart.format}
            formatTick={chart.tick}
            wide={charts.length === 1 || chart.key === "volume"}
          />
        ))}
      </div>
    </section>
  );
}

function MetricCard({
  title,
  points,
  formatValue,
  formatTick,
  wide,
}: {
  title: string;
  points: ChartPoint[];
  formatValue: (value: number) => string;
  formatTick: (value: number) => string;
  wide: boolean;
}) {
  const latest = points[points.length - 1];
  return (
    <article className={`grid gap-2 border border-border bg-card p-5 ${wide ? "lg:col-span-2" : ""}`}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="font-display text-4xl tabular-nums tracking-tight">{formatValue(latest.value)}</p>
      </div>
      <p className="text-sm text-muted-foreground">{trendText(points, formatValue)}</p>
      <MetricChart
        points={points}
        formatValue={formatValue}
        formatTick={formatTick}
        label={`${title} for this exercise`}
      />
    </article>
  );
}

function formatTick(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatVolume(value: number, unit: string) {
  return `${Math.round(value).toLocaleString("en-US")} ${unit}`;
}

function formatVolumeTick(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function formatAmount(value: number, suffix: string) {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} ${suffix}`;
}

function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  if (minutes === 0) return `${remain}s`;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}
