"use client";

import { useMemo, useState } from "react";
import useSWRImmutable from "swr/immutable";

import { fetchJson } from "@/lib/fetch-json";
import type {
  BedProfilePayload,
  BlockModalRow,
  CycleProfileBlockPayload,
  HarvestCurvePayload,
  ValveProfilePayload,
  ValveProfilesByCyclePayload,
} from "@/lib/fenograma";

export type SelectedValveState = {
  cycleKey: string;
  valveId: string;
};

type KeyedCycleState = {
  rowKey: string;
  cycleKey: string;
};

type KeyedValveState = {
  rowKey: string;
  cycleKey: string;
  valveId: string;
};

function buildBlockRequestUrl(row: BlockModalRow) {
  const params = new URLSearchParams();

  if (row.cycleKey) {
    params.set("cycleKey", row.cycleKey);
  }

  const query = params.toString();
  return query
    ? `/api/fenograma/block/${encodeURIComponent(row.block)}?${query}`
    : `/api/fenograma/block/${encodeURIComponent(row.block)}`;
}

function buildBlockCacheKey(row: BlockModalRow) {
  return row.cycleKey ? `${row.block}|${row.cycleKey}` : row.block;
}

async function swrFenogramaFetcher<T>([url, fallbackMessage]: readonly [string, string]) {
  return fetchJson<T>(url, fallbackMessage);
}

export function useBlockProfileModal(selectedRow: BlockModalRow | null) {
  const [selectedCycleState, setSelectedCycleState] = useState<KeyedCycleState | null>(null);
  const [selectedValveCycleState, setSelectedValveCycleState] = useState<KeyedCycleState | null>(null);
  const [selectedValveState, setSelectedValveState] = useState<KeyedValveState | null>(null);
  const [selectedCurveState, setSelectedCurveState] = useState<KeyedCycleState | null>(null);

  const selectedRowKey = useMemo(
    () => (selectedRow ? buildBlockCacheKey(selectedRow) : null),
    [selectedRow],
  );
  const selectedCycleKey = selectedRowKey && selectedCycleState?.rowKey === selectedRowKey
    ? selectedCycleState.cycleKey
    : null;
  const selectedValveCycleKey = selectedRowKey && selectedValveCycleState?.rowKey === selectedRowKey
    ? selectedValveCycleState.cycleKey
    : null;
  const selectedValve = selectedRowKey && selectedValveState?.rowKey === selectedRowKey
    ? { cycleKey: selectedValveState.cycleKey, valveId: selectedValveState.valveId }
    : null;
  const selectedCurveCycleKey = selectedRowKey && selectedCurveState?.rowKey === selectedRowKey
    ? selectedCurveState.cycleKey
    : null;

  const blockRequest = selectedRow
    ? [buildBlockRequestUrl(selectedRow), "No se pudo cargar los ciclos del bloque."] as const
    : null;
  const bedsRequest = selectedCycleKey
    ? [`/api/fenograma/cycle/${encodeURIComponent(selectedCycleKey)}/beds`, "No se pudo cargar el detalle de camas."] as const
    : null;
  const valvesRequest = selectedValveCycleKey
    ? [`/api/fenograma/cycle/${encodeURIComponent(selectedValveCycleKey)}/valves`, "No se pudo cargar el detalle de valvulas."] as const
    : null;
  const valveRequest = selectedValve
    ? [
      `/api/fenograma/cycle/${encodeURIComponent(selectedValve.cycleKey)}/valves/${encodeURIComponent(selectedValve.valveId)}`,
      "No se pudo cargar el detalle de la valvula.",
    ] as const
    : null;
  const curveRequest = selectedCurveCycleKey
    ? [`/api/fenograma/cycle/${encodeURIComponent(selectedCurveCycleKey)}/curve`, "No se pudo cargar la curva de cosecha."] as const
    : null;

  const {
    data: blockData,
    error: blockRequestError,
    isLoading: blockLoading,
  } = useSWRImmutable<CycleProfileBlockPayload>(blockRequest, swrFenogramaFetcher, {
    revalidateOnFocus: false,
  });
  const {
    data: bedData,
    error: bedsRequestError,
    isLoading: bedLoading,
  } = useSWRImmutable<BedProfilePayload>(bedsRequest, swrFenogramaFetcher, {
    revalidateOnFocus: false,
  });
  const {
    data: valvesData,
    error: valvesRequestError,
    isLoading: valvesLoading,
  } = useSWRImmutable<ValveProfilesByCyclePayload>(valvesRequest, swrFenogramaFetcher, {
    revalidateOnFocus: false,
  });
  const {
    data: valveData,
    error: valveRequestError,
    isLoading: valveLoading,
  } = useSWRImmutable<ValveProfilePayload>(valveRequest, swrFenogramaFetcher, {
    revalidateOnFocus: false,
  });
  const {
    data: curveData,
    error: curveRequestError,
    isLoading: curveLoading,
  } = useSWRImmutable<HarvestCurvePayload>(curveRequest, swrFenogramaFetcher, {
    revalidateOnFocus: false,
  });

  function openBeds(cycleKey: string) {
    if (!selectedRowKey) {
      return;
    }

    setSelectedCycleState((current) => (
      current?.rowKey === selectedRowKey && current.cycleKey === cycleKey
        ? null
        : { rowKey: selectedRowKey, cycleKey }
    ));
    setSelectedValveState(null);
  }

  function closeBeds() {
    setSelectedCycleState(null);
    setSelectedValveState(null);
  }

  function openValves(cycleKey: string) {
    if (!selectedRowKey) {
      return;
    }

    setSelectedValveCycleState((current) => (
      current?.rowKey === selectedRowKey && current.cycleKey === cycleKey
        ? null
        : { rowKey: selectedRowKey, cycleKey }
    ));
    setSelectedValveState(null);
  }

  function closeValves() {
    setSelectedValveCycleState(null);
    setSelectedValveState(null);
  }

  function openValve(cycleKey: string, valveId: string) {
    if (!selectedRowKey) {
      return;
    }

    setSelectedValveState((current) => (
      current?.rowKey === selectedRowKey
      && current?.cycleKey === cycleKey
      && current?.valveId === valveId
        ? null
        : { rowKey: selectedRowKey, cycleKey, valveId }
    ));
  }

  function openCurve(cycleKey: string) {
    if (!selectedRowKey) {
      return;
    }

    setSelectedCurveState((current) => (
      current?.rowKey === selectedRowKey && current.cycleKey === cycleKey
        ? null
        : { rowKey: selectedRowKey, cycleKey }
    ));
  }

  function closeCurve() {
    setSelectedCurveState(null);
  }

  return {
    blockData: blockData ?? null,
    blockLoading,
    blockError: blockRequestError?.message ?? null,
    selectedCycleKey,
    bedData: bedData ?? null,
    bedLoading,
    bedError: bedsRequestError?.message ?? null,
    selectedValveCycleKey,
    valvesData: valvesData ?? null,
    valvesLoading,
    valvesError: valvesRequestError?.message ?? null,
    selectedValve,
    valveData: valveData ?? null,
    valveLoading,
    valveError: valveRequestError?.message ?? null,
    selectedCurveCycleKey,
    curveData: curveData ?? null,
    curveLoading,
    curveError: curveRequestError?.message ?? null,
    openBeds,
    closeBeds,
    openValves,
    closeValves,
    openValve,
    openCurve,
    closeCurve,
  };
}
