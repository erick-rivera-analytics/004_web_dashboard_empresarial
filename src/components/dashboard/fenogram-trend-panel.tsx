"use client";

import dynamic from "next/dynamic";

type FenogramTrendPoint = {
  week: string;
  total: number;
};

type FenogramTrendPanelProps = {
  data: FenogramTrendPoint[];
};

const FenogramTrendChart = dynamic(
  () =>
    import("@/components/dashboard/fenogram-trend-chart").then(
      (mod) => mod.FenogramTrendChart,
    ),
  { ssr: false },
);

export function FenogramTrendPanel({ data }: FenogramTrendPanelProps) {
  return <FenogramTrendChart data={data} />;
}
