import mapaBloques from "@/data/campo-blocks-map.json";
import type { BlockModalRow } from "@/lib/fenograma";
import { getBlockModalRowsByParentBlocks } from "@/lib/fenograma";
import { cachedAsync } from "@/lib/server-cache";

type CampoMapJsonFeature = {
  block: string;
  area: number | null;
  center: [number, number];
  bbox: [number, number, number, number];
  path: string;
};

export type CampoMapFeature = {
  block: string;
  mapArea: number | null;
  center: [number, number];
  bbox: [number, number, number, number];
  path: string;
  hasData: boolean;
  stemsIntensity: number;
  row: BlockModalRow;
};

export type CampoDashboardData = {
  generatedAt: string;
  map: {
    width: number;
    height: number;
  };
  summary: {
    blockCount: number;
    matchedBlocks: number;
    unmatchedBlocks: number;
    totalMappedArea: number;
    totalVisibleStems: number;
  };
  features: CampoMapFeature[];
};

const CAMPO_DASHBOARD_TTL_MS = 60 * 1000;

function roundValue(value: number) {
  return Number(value.toFixed(2));
}

function buildFallbackRow(block: string): BlockModalRow {
  return {
    block,
    cycleKey: null,
    area: "",
    variety: "",
    spType: "",
    spDate: null,
    harvestStartDate: null,
    harvestEndDate: null,
    totalStems: 0,
  };
}

export async function getCampoDashboardData(): Promise<CampoDashboardData> {
  return cachedAsync("campo:dashboard", CAMPO_DASHBOARD_TTL_MS, async () => {
    const features = mapaBloques.features as CampoMapJsonFeature[];
    const blocks = features.map((feature) => feature.block);
    const rowsByBlock = await getBlockModalRowsByParentBlocks(blocks);
    const maxVisibleStems = Math.max(
      ...features.map((feature) => rowsByBlock[feature.block]?.totalStems ?? 0),
      0,
    );

    const normalizedFeatures = features.map((feature) => {
      const row = rowsByBlock[feature.block] ?? buildFallbackRow(feature.block);
      const totalStems = row.totalStems ?? 0;

      return {
        block: feature.block,
        mapArea: feature.area ?? null,
        center: feature.center,
        bbox: feature.bbox,
        path: feature.path,
        hasData: Boolean(rowsByBlock[feature.block]),
        stemsIntensity: maxVisibleStems > 0 ? totalStems / maxVisibleStems : 0,
        row,
      } satisfies CampoMapFeature;
    });

    return {
      generatedAt: new Date().toISOString(),
      map: {
        width: mapaBloques.width,
        height: mapaBloques.height,
      },
      summary: {
        blockCount: normalizedFeatures.length,
        matchedBlocks: normalizedFeatures.filter((feature) => feature.hasData).length,
        unmatchedBlocks: normalizedFeatures.filter((feature) => !feature.hasData).length,
        totalMappedArea: roundValue(
          normalizedFeatures.reduce((sum, feature) => sum + (feature.mapArea ?? 0), 0),
        ),
        totalVisibleStems: roundValue(
          normalizedFeatures.reduce((sum, feature) => sum + feature.row.totalStems, 0),
        ),
      },
      features: normalizedFeatures,
    };
  });
}
