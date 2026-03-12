"use client";

import { useEffect, useRef, useState } from "react";

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

export function useBlockProfileModal(selectedRow: BlockModalRow | null) {
  const blockCacheRef = useRef(new Map<string, CycleProfileBlockPayload>());
  const bedCacheRef = useRef(new Map<string, BedProfilePayload>());
  const valvesCacheRef = useRef(new Map<string, ValveProfilesByCyclePayload>());
  const valveCacheRef = useRef(new Map<string, ValveProfilePayload>());
  const curveCacheRef = useRef(new Map<string, HarvestCurvePayload>());

  const [blockData, setBlockData] = useState<CycleProfileBlockPayload | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  const [selectedCycleKey, setSelectedCycleKey] = useState<string | null>(null);
  const [bedData, setBedData] = useState<BedProfilePayload | null>(null);
  const [bedLoading, setBedLoading] = useState(false);
  const [bedError, setBedError] = useState<string | null>(null);

  const [selectedValveCycleKey, setSelectedValveCycleKey] = useState<string | null>(null);
  const [valvesData, setValvesData] = useState<ValveProfilesByCyclePayload | null>(null);
  const [valvesLoading, setValvesLoading] = useState(false);
  const [valvesError, setValvesError] = useState<string | null>(null);

  const [selectedValve, setSelectedValve] = useState<SelectedValveState | null>(null);
  const [valveData, setValveData] = useState<ValveProfilePayload | null>(null);
  const [valveLoading, setValveLoading] = useState(false);
  const [valveError, setValveError] = useState<string | null>(null);

  const [selectedCurveCycleKey, setSelectedCurveCycleKey] = useState<string | null>(null);
  const [curveData, setCurveData] = useState<HarvestCurvePayload | null>(null);
  const [curveLoading, setCurveLoading] = useState(false);
  const [curveError, setCurveError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRow) {
      setBlockData(null);
      setBlockError(null);
      setSelectedCycleKey(null);
      setBedData(null);
      setBedError(null);
      setSelectedValveCycleKey(null);
      setValvesData(null);
      setValvesError(null);
      setSelectedValve(null);
      setValveData(null);
      setValveError(null);
      setSelectedCurveCycleKey(null);
      setCurveData(null);
      setCurveLoading(false);
      setCurveError(null);
      return;
    }

    const currentRow = selectedRow;
    const controller = new AbortController();
    const blockCacheKey = buildBlockCacheKey(currentRow);

    setSelectedCycleKey(null);
    setBedData(null);
    setBedError(null);
    setSelectedValveCycleKey(null);
    setValvesData(null);
    setValvesError(null);
    setSelectedValve(null);
    setValveData(null);
    setValveError(null);
    setSelectedCurveCycleKey(null);
    setCurveData(null);
    setCurveLoading(false);
    setCurveError(null);

    const cachedBlock = blockCacheRef.current.get(blockCacheKey);

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
        const response = await fetch(buildBlockRequestUrl(currentRow), {
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          throw new Error(payload.message ?? "No se pudo cargar los ciclos del bloque.");
        }

        const payload = (await response.json()) as CycleProfileBlockPayload;
        blockCacheRef.current.set(blockCacheKey, payload);
        setBlockData(payload);
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setBlockError(
            fetchError instanceof Error
              ? fetchError.message
              : "No se pudo cargar los ciclos del bloque.",
          );
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
        const response = await fetch(
          `/api/fenograma/cycle/${encodeURIComponent(currentCycleKey)}/beds`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          throw new Error(payload.message ?? "No se pudo cargar el detalle de camas.");
        }

        const payload = (await response.json()) as BedProfilePayload;
        bedCacheRef.current.set(currentCycleKey, payload);
        setBedData(payload);
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setBedError(
            fetchError instanceof Error
              ? fetchError.message
              : "No se pudo cargar el detalle de camas.",
          );
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
    setSelectedValve(null);
    setValveData(null);
    setValveError(null);

    if (!selectedValveCycleKey) {
      setValvesData(null);
      setValvesError(null);
      return;
    }

    const currentCycleKey = selectedValveCycleKey;
    const controller = new AbortController();
    const cachedValves = valvesCacheRef.current.get(currentCycleKey);

    if (cachedValves) {
      setValvesData(cachedValves);
      setValvesLoading(false);
      setValvesError(null);
      return () => controller.abort();
    }

    setValvesData(null);

    async function loadValves() {
      setValvesLoading(true);
      setValvesError(null);

      try {
        const response = await fetch(
          `/api/fenograma/cycle/${encodeURIComponent(currentCycleKey)}/valves`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          throw new Error(payload.message ?? "No se pudo cargar el detalle de valvulas.");
        }

        const payload = (await response.json()) as ValveProfilesByCyclePayload;
        valvesCacheRef.current.set(currentCycleKey, payload);
        setValvesData(payload);
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setValvesError(
            fetchError instanceof Error
              ? fetchError.message
              : "No se pudo cargar el detalle de valvulas.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setValvesLoading(false);
        }
      }
    }

    void loadValves();
    return () => controller.abort();
  }, [selectedValveCycleKey]);

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
          setValveError(
            fetchError instanceof Error
              ? fetchError.message
              : "No se pudo cargar el detalle de la valvula.",
          );
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

  useEffect(() => {
    if (!selectedCurveCycleKey) {
      setCurveData(null);
      setCurveError(null);
      return;
    }

    const currentCycleKey = selectedCurveCycleKey;
    const controller = new AbortController();
    const cachedCurve = curveCacheRef.current.get(currentCycleKey);

    if (cachedCurve) {
      setCurveData(cachedCurve);
      setCurveLoading(false);
      setCurveError(null);
      return () => controller.abort();
    }

    setCurveData(null);

    async function loadCurve() {
      setCurveLoading(true);
      setCurveError(null);

      try {
        const response = await fetch(
          `/api/fenograma/cycle/${encodeURIComponent(currentCycleKey)}/curve`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          throw new Error(payload.message ?? "No se pudo cargar la curva de cosecha.");
        }

        const payload = (await response.json()) as HarvestCurvePayload;
        curveCacheRef.current.set(currentCycleKey, payload);
        setCurveData(payload);
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setCurveError(
            fetchError instanceof Error
              ? fetchError.message
              : "No se pudo cargar la curva de cosecha.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setCurveLoading(false);
        }
      }
    }

    void loadCurve();
    return () => controller.abort();
  }, [selectedCurveCycleKey]);

  function openBeds(cycleKey: string) {
    setSelectedCycleKey((current) => (current === cycleKey ? null : cycleKey));
    setBedError(null);
  }

  function closeBeds() {
    setSelectedCycleKey(null);
    setBedError(null);
  }

  function openValves(cycleKey: string) {
    setSelectedValveCycleKey((current) => (current === cycleKey ? null : cycleKey));
    setSelectedValve(null);
    setValveData(null);
    setValvesError(null);
    setValveError(null);
  }

  function openValve(cycleKey: string, valveId: string) {
    setSelectedValve((current) => (
      current?.cycleKey === cycleKey && current?.valveId === valveId
        ? null
        : { cycleKey, valveId }
    ));
    setValveError(null);
  }

  function openCurve(cycleKey: string) {
    setSelectedCurveCycleKey((current) => (current === cycleKey ? null : cycleKey));
    setCurveError(null);
  }

  function closeCurve() {
    setSelectedCurveCycleKey(null);
    setCurveError(null);
  }

  return {
    blockData,
    blockLoading,
    blockError,
    selectedCycleKey,
    bedData,
    bedLoading,
    bedError,
    selectedValveCycleKey,
    valvesData,
    valvesLoading,
    valvesError,
    selectedValve,
    valveData,
    valveLoading,
    valveError,
    selectedCurveCycleKey,
    curveData,
    curveLoading,
    curveError,
    openBeds,
    closeBeds,
    openValves,
    openValve,
    openCurve,
    closeCurve,
  };
}
