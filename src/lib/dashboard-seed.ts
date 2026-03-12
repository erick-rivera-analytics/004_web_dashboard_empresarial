export type FenogramRow = {
  id: string;
  cycle: string;
  block: string;
  manager: string;
  cultivar: string;
  status: "active" | "closed";
  projectedCut: number;
  executedCut: number;
  deviation: number;
  weekValues: Record<string, number | null>;
};

export type CycleSnapshot = {
  id: string;
  cycle: string;
  block: string;
  yieldKgM2: number;
  exportableQuality: number;
  harvestCompliance: number;
  costPerHectare: number;
  laborProductivity: number;
  waterEfficiency: number;
  forecastAccuracy: number;
  wasteRate: number;
};

export type RadarPoint = {
  label: string;
  left: number;
  right: number;
};

export const fenogramWeeks = ["2610", "2611", "2612", "2613", "2614", "2615", "2616", "2617", "2618"];

export const fenogramRows: FenogramRow[] = [
  {
    id: "fg-2610",
    cycle: "2610",
    block: "BQ-14",
    manager: "Paula Andrade",
    cultivar: "Freedom",
    status: "active",
    projectedCut: 14200,
    executedCut: 13040,
    deviation: -8.2,
    weekValues: { "2610": 12, "2611": 18, "2612": 24, "2613": 28, "2614": 32, "2615": 34, "2616": 29, "2617": 22, "2618": 16 },
  },
  {
    id: "fg-2611",
    cycle: "2611",
    block: "BQ-21",
    manager: "Mario Recalde",
    cultivar: "Explorer",
    status: "active",
    projectedCut: 15680,
    executedCut: 14520,
    deviation: -7.4,
    weekValues: { "2610": null, "2611": 10, "2612": 15, "2613": 21, "2614": 27, "2615": 31, "2616": 36, "2617": 28, "2618": 19 },
  },
  {
    id: "fg-2608",
    cycle: "2608",
    block: "BQ-14",
    manager: "Paula Andrade",
    cultivar: "Freedom",
    status: "closed",
    projectedCut: 13740,
    executedCut: 13610,
    deviation: -0.9,
    weekValues: { "2610": 14, "2611": 20, "2612": 27, "2613": 31, "2614": 33, "2615": 30, "2616": 25, "2617": 18, "2618": 12 },
  },
  {
    id: "fg-2605",
    cycle: "2605",
    block: "BQ-14",
    manager: "Paula Andrade",
    cultivar: "Freedom",
    status: "closed",
    projectedCut: 13210,
    executedCut: 12890,
    deviation: -2.4,
    weekValues: { "2610": 11, "2611": 16, "2612": 23, "2613": 27, "2614": 29, "2615": 27, "2616": 21, "2617": 15, "2618": 9 },
  },
  {
    id: "fg-2609",
    cycle: "2609",
    block: "BQ-21",
    manager: "Mario Recalde",
    cultivar: "Explorer",
    status: "closed",
    projectedCut: 14960,
    executedCut: 14780,
    deviation: -1.2,
    weekValues: { "2610": 13, "2611": 18, "2612": 24, "2613": 29, "2614": 31, "2615": 29, "2616": 24, "2617": 17, "2618": 11 },
  },
];

export const comparisonCycles: CycleSnapshot[] = [
  {
    id: "cy-2610-sierra",
    cycle: "2610",
    block: "BQ-14",
    yieldKgM2: 5.9,
    exportableQuality: 91,
    harvestCompliance: 92,
    costPerHectare: 1840,
    laborProductivity: 87,
    waterEfficiency: 82,
    forecastAccuracy: 94,
    wasteRate: 4.8,
  },
  {
    id: "cy-2611-orion",
    cycle: "2611",
    block: "BQ-21",
    yieldKgM2: 5.5,
    exportableQuality: 88,
    harvestCompliance: 88,
    costPerHectare: 1915,
    laborProductivity: 84,
    waterEfficiency: 79,
    forecastAccuracy: 90,
    wasteRate: 5.3,
  },
];

export const comparisonRadar: RadarPoint[] = [
  { label: "Rendimiento", left: 92, right: 86 },
  { label: "Calidad", left: 91, right: 88 },
  { label: "Productividad", left: 87, right: 84 },
  { label: "Agua", left: 82, right: 79 },
  { label: "Forecast", left: 94, right: 90 },
  { label: "Cumplimiento", left: 92, right: 88 },
];

export function getFenogramActiveRows() {
  return fenogramRows.filter((row) => row.status === "active");
}

export function getFenogramSummary() {
  const activeRows = getFenogramActiveRows();
  const executed = activeRows.reduce((sum, row) => sum + row.executedCut, 0);
  const averageDeviation = activeRows.length
    ? activeRows.reduce((sum, row) => sum + row.deviation, 0) / activeRows.length
    : 0;

  return {
    activeCycles: activeRows.length,
    visibleWeeks: fenogramWeeks.length,
    executed,
    averageDeviation,
  };
}

export function getFenogramTrend() {
  return fenogramWeeks.map((week) => {
    const total = fenogramRows.reduce((sum, row) => sum + (row.weekValues[week] ?? 0), 0);

    return {
      week,
      total,
    };
  });
}

export function getComparisonSummary() {
  const [left, right] = comparisonCycles;

  return {
    left,
    right,
    yieldGap: left.yieldKgM2 - right.yieldKgM2,
    qualityGap: left.exportableQuality - right.exportableQuality,
    complianceGap: left.harvestCompliance - right.harvestCompliance,
    costGap: right.costPerHectare - left.costPerHectare,
  };
}
