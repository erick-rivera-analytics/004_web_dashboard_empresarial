import { readFile } from "node:fs/promises";
import { join } from "node:path";

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

type CampoGeoJsonFeature = {
  properties?: {
    bloquePad?: string | null;
  };
};

type CampoGeoJsonCollection = {
  features?: CampoGeoJsonFeature[];
};

export type CampoMapFeature = {
  block: string;
  mapArea: number | null;
  center: [number, number] | null;
  bbox: [number, number, number, number] | null;
  path: string | null;
  hasData: boolean;
  stemsIntensity: number;
  row: BlockModalRow;
};

export type CampoDashboardData = {
  generatedAt: string;
  map: {
    width: number;
    height: number;
    renderableBlockCount: number;
    geometryBlockCount: number;
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

function sortBlockIds(a: string, b: string) {
  return a.localeCompare(b, "en-US", {
    numeric: true,
    sensitivity: "base",
  });
}

function normalizeBlockKey(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return "";
  }

  if (!/^\d+$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return String(Number(trimmed));
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

function buildSummaryFeatureLookup(features: CampoMapJsonFeature[]) {
  const lookup = new Map<string, CampoMapJsonFeature>();

  for (const feature of features) {
    const key = normalizeBlockKey(feature.block);

    if (!key || lookup.has(key)) {
      continue;
    }

    lookup.set(key, feature);
  }

  return lookup;
}

async function loadRenderableBlocksFromGeoJson() {
  const geoPath = join(process.cwd(), "public", "data", "campo-geo.json");
  const content = await readFile(geoPath, "utf8");
  const geoJson = JSON.parse(content) as CampoGeoJsonCollection;
  const uniqueBlocks = new Set<string>();

  for (const feature of geoJson.features ?? []) {
    const block = feature.properties?.bloquePad?.trim();

    if (block) {
      uniqueBlocks.add(block);
    }
  }

  return Array.from(uniqueBlocks).sort(sortBlockIds);
}

export async function getCampoDashboardData(): Promise<CampoDashboardData> {
  return cachedAsync("campo:dashboard", CAMPO_DASHBOARD_TTL_MS, async () => {
    const summaryFeatures = mapaBloques.features as CampoMapJsonFeature[];
    const renderableBlocks = await loadRenderableBlocksFromGeoJson();
    const blocksForQuery = Array.from(
      new Set([
        ...summaryFeatures.map((feature) => feature.block),
        ...renderableBlocks,
      ]),
    ).sort(sortBlockIds);
    const rowsByBlock = await getBlockModalRowsByParentBlocks(blocksForQuery);
    const rowsByNormalizedBlock = new Map<string, BlockModalRow>();

    for (const row of Object.values(rowsByBlock)) {
      const key = normalizeBlockKey(row.block);

      if (!key || rowsByNormalizedBlock.has(key)) {
        continue;
      }

      rowsByNormalizedBlock.set(key, row);
    }

    const summaryFeatureLookup = buildSummaryFeatureLookup(summaryFeatures);
    const renderableFeatures = renderableBlocks.map((block) => {
      const normalizedKey = normalizeBlockKey(block);
      const row = rowsByNormalizedBlock.get(normalizedKey) ?? buildFallbackRow(block);
      const summaryFeature = summaryFeatureLookup.get(normalizedKey);

      return {
        block,
        mapArea: summaryFeature?.area ?? null,
        center: summaryFeature?.center ?? null,
        bbox: summaryFeature?.bbox ?? null,
        path: summaryFeature?.path ?? null,
        hasData: rowsByNormalizedBlock.has(normalizedKey),
        stemsIntensity: 0,
        row,
      } satisfies CampoMapFeature;
    });
    const maxVisibleStems = Math.max(
      ...renderableFeatures.map((feature) => feature.row.totalStems ?? 0),
      0,
    );
    const normalizedRenderableFeatures = renderableFeatures.map((feature) => ({
      ...feature,
      stemsIntensity:
        maxVisibleStems > 0 ? (feature.row.totalStems ?? 0) / maxVisibleStems : 0,
    }));
    const normalizedSummaryFeatures = summaryFeatures.map((feature) => {
      const row = rowsByNormalizedBlock.get(normalizeBlockKey(feature.block))
        ?? buildFallbackRow(feature.block);

      return {
        block: feature.block,
        mapArea: feature.area ?? null,
        hasData: rowsByNormalizedBlock.has(normalizeBlockKey(feature.block)),
        row,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      map: {
        width: mapaBloques.width,
        height: mapaBloques.height,
        renderableBlockCount: normalizedRenderableFeatures.length,
        geometryBlockCount: normalizedRenderableFeatures.length,
      },
      summary: {
        blockCount: normalizedSummaryFeatures.length,
        matchedBlocks: normalizedSummaryFeatures.filter((feature) => feature.hasData).length,
        unmatchedBlocks: normalizedSummaryFeatures.filter((feature) => !feature.hasData).length,
        totalMappedArea: roundValue(
          normalizedSummaryFeatures.reduce(
            (sum, feature) => sum + (feature.mapArea ?? 0),
            0,
          ),
        ),
        totalVisibleStems: roundValue(
          normalizedSummaryFeatures.reduce(
            (sum, feature) => sum + feature.row.totalStems,
            0,
          ),
        ),
      },
      features: normalizedRenderableFeatures,
    };
  });
}
