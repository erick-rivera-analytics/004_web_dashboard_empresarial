"use client";

import dynamic from "next/dynamic";

type RadarPoint = {
  label: string;
  left: number;
  right: number;
};

type ComparisonRadarPanelProps = {
  data: RadarPoint[];
};

const ComparisonRadarChart = dynamic(
  () =>
    import("@/components/dashboard/comparison-radar-chart").then(
      (mod) => mod.ComparisonRadarChart,
    ),
  { ssr: false },
);

export function ComparisonRadarPanel({ data }: ComparisonRadarPanelProps) {
  return <ComparisonRadarChart data={data} />;
}
