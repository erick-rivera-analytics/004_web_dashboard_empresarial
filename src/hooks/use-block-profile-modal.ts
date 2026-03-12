"use client";

import { useEffect, useRef, useState } from "react";

import type {
  BedProfilePayload,
  BlockModalRow,
  CycleProfileBlockPayload,
  ValveProfilePayload,
} from "@/lib/fenograma";

export type SelectedValveState = {
  cycleKey: string;
  valveId: string;
  bedId: string;
};

export function useBlockProfileModal(selectedRow: BlockModalRow | null) {
  const blockCacheRef = useRef(new Map<string, CycleProfileBlockPayload>());
  const bedCacheRef = useRef(new Map<string, BedProfilePayload>());
  const valveCacheRef = useRef(new Map<string, ValveProfilePayload>());
  const [blockData, setBlockData] = useState<CycleProfileBlockPayload | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [selectedCycleKey, setSelectedCycleKey] = useState<string | null>(null);
  const [bedData, setBedData] = useState<BedProfilePayload | null>(null);
  const [bedLoading, setBedLoading] = useState(false);
  const [bedError, setBedError] = useState<string | null>(null);
  const [selectedValve, setSelectedValve] = useState<SelectedValveState | null>(null);
  const [valveData, setValveData] = useState<ValveProfilePayload | null>(null);
  const [valveLoading, setValveLoading] = useState(false);
  const [valveError, setValveError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRow) {
      setBlockData(null);
      setBlockError(null);
      setSelectedCycleKey(null);
      setBedData(null);
      setBedError(null);
      setSelectedValve(null);
      setValveData(null);
      setValveError(null);
      return;
    }

    const currentRow = selectedRow;
    const controller = new AbortController();
    setSelectedCycleKey(null);
    setBedData(null);
    setBedError(null);
    setSelectedValve(null);
    setValveData(null);
    setValveError(null);

    const cachedBlock = blockCacheRef.current.get(currentRow.block);

    if (cachedBlock) {
      setBlockData(cachedBlock);
      setBlockLoading(false);
      setBlockError(null);
      return () => controller.abort();
    }

    setBlockData(null);

    async function loadBlock() {
      setBlockLoading(true);
      setBlockError(null);
      try {
        const response = await fetch(`/api/fenograma/block/${encodeURIComponent(currentRow.block)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          throw new Error(payload.message ?? "No se pudo cargar los ciclos del bloque.");
        }
        const payload = (await response.json()) as CycleProfileBlockPayload;
        blockCacheRef.current.set(currentRow.block, payload);
        setBlockData(payload);
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setBlockError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar los ciclos del bloque.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setBlockLoading(false);
        }
      }
    }

    void loadBlock();
    return () => controller.abort();
  }, [selectedRow]);

  useEffect(() => {
    setSelectedValve(null);
    setValveData(null);
    setValveError(null);

    if (!selectedCycleKey) {
      setBedData(null);
      setBedError(null);
      return;
    }

    const currentCycleKey = selectedCycleKey;
    const controller = new AbortController();
    const cachedBeds = bedCacheRef.current.get(currentCycleKey);

    if (cachedBeds) {
      setBedData(cachedBeds);
      setBedLoading(false);
      setBedError(null);
      return () => controller.abort();
    }

    setBedData(null);

    async function loadBeds() {
      setBedLoading(true);
      setBedError(null);
      try {
        const response = await fetch(`/api/fenograma/cycle/${encodeURIComponent(currentCycleKey)}/beds`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          throw new Error(payload.message ?? "No se pudo cargar el detalle de camas.");
        }
        const payload = (await response.json()) as BedProfilePayload;
        bedCacheRef.current.set(currentCycleKey, payload);
        setBedData(payload);
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setBedError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar el detalle de camas.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setBedLoading(false);
        }
      }
    }

    void loadBeds();
    return () => controller.abort();
  }, [selectedCycleKey]);

  useEffect(() => {
    if (!selectedValve) {
      setValveData(null);
      setValveError(null);
      return;
    }

    const currentValve = selectedValve;
    const controller = new AbortController();
    const valveKey = `${currentValve.cycleKey}|${currentValve.valveId}`;
    const cachedValve = valveCacheRef.current.get(valveKey);

    if (cachedValve) {
      setValveData(cachedValve);
      setValveLoading(false);
      setValveError(null);
      return () => controller.abort();
    }

    setValveData(null);

    async function loadValve() {
      setValveLoading(true);
      setValveError(null);
      try {
        const response = await fetch(
          `/api/fenograma/cycle/${encodeURIComponent(currentValve.cycleKey)}/valves/${encodeURIComponent(currentValve.valveId)}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          throw new Error(payload.message ?? "No se pudo cargar el detalle de la valvula.");
        }
        const payload = (await response.json()) as ValveProfilePayload;
        valveCacheRef.current.set(valveKey, payload);
        setValveData(payload);
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setValveError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar el detalle de la valvula.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setValveLoading(false);
        }
      }
    }

    void loadValve();
    return () => controller.abort();
  }, [selectedValve]);

  function openBeds(cycleKey: string) {
    setSelectedCycleKey((current) => (current === cycleKey ? null : cycleKey));
    setBedError(null);
  }

  function openValve(cycleKey: string, valveId: string, bedId: string) {
    setSelectedValve((current) => (
      current?.cycleKey === cycleKey
      && current?.valveId === valveId
      && current?.bedId === bedId
        ? null
        : { cycleKey, valveId, bedId }
    ));
    setValveError(null);
  }

  return {
    blockData,
    blockLoading,
    blockError,
    selectedCycleKey,
    bedData,
    bedLoading,
    bedError,
    selectedValve,
    valveData,
    valveLoading,
    valveError,
    openBeds,
    openValve,
  };
}
