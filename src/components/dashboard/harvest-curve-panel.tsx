"use client";

import dynamic from "next/dynamic";

import type { HarvestCurvePoint } from "@/lib/fenograma";

type HarvestCurvePanelProps = {
  data: HarvestCurvePoint[];
  projectionStartDay: number | null;
};

const HarvestCurveChart = dynamic(
  () =>
    import("@/components/dashboard/harvest-curve-chart").then(
      (mod) => mod.HarvestCurveChart,
    ),
  { ssr: false },
);

export function HarvestCurvePanel({
  data,
  projectionStartDay,
}: HarvestCurvePanelProps) {
  return <HarvestCurveChart data={data} projectionStartDay={projectionStartDay} />;
}
