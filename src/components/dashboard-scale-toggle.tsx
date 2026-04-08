"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Frame, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "dashboard-ui-scale";
const SCALE_EVENT = "dashboard-scale-change";
const MIN_SCALE = 0.92;
const MAX_SCALE = 1.08;
const STEP = 0.05;

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function applyScale(scale: number) {
  if (typeof document === "undefined") {
    return;
  }

  const nextScale = clampValue(scale, MIN_SCALE, MAX_SCALE);
  document.documentElement.style.fontSize = `${(16 * nextScale).toFixed(2)}px`;
  document.documentElement.style.setProperty("--dashboard-ui-scale", nextScale.toFixed(2));
}

function readStoredScaleSnapshot() {
  if (typeof window === "undefined") {
    return "1.00";
  }

  const storedValue = Number(window.localStorage.getItem(STORAGE_KEY) ?? "1");
  const scale = Number.isFinite(storedValue) ? clampValue(storedValue, MIN_SCALE, MAX_SCALE) : 1;
  return scale.toFixed(2);
}

function subscribeToScaleChange(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener(SCALE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(SCALE_EVENT, handleChange);
  };
}

function persistScale(scale: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, clampValue(scale, MIN_SCALE, MAX_SCALE).toFixed(2));
  window.dispatchEvent(new Event(SCALE_EVENT));
}

export function DashboardScaleToggle() {
  const snapshot = useSyncExternalStore(subscribeToScaleChange, readStoredScaleSnapshot, () => "1.00");
  const scale = Number(snapshot ?? "1");

  useEffect(() => {
    applyScale(scale);
  }, [scale]);

  function updateScale(nextScale: number) {
    persistScale(nextScale);
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-slate-700/50 bg-slate-950/80 p-1 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
        onClick={() => persistScale(1)}
        title="Restablecer tamano del dashboard"
      >
        <Frame className="size-4" aria-hidden="true" />
        <span className="sr-only">Restablecer tamano del dashboard</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 disabled:opacity-40"
        onClick={() => updateScale(scale - STEP)}
        disabled={scale <= MIN_SCALE}
        title="Reducir tamano del dashboard"
      >
        <Minus className="size-4" aria-hidden="true" />
        <span className="sr-only">Reducir tamano del dashboard</span>
      </Button>

      <span
        className={cn(
          "min-w-[58px] cursor-default select-none rounded-full px-2 py-1 text-center text-xs text-slate-400",
          Math.abs(scale - 1) < 0.01 ? "font-semibold text-slate-200" : "font-medium",
        )}
        title="Escala visual actual del dashboard"
      >
        {`${Math.round(scale * 100)}%`}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 disabled:opacity-40"
        onClick={() => updateScale(scale + STEP)}
        disabled={scale >= MAX_SCALE}
        title="Aumentar tamano del dashboard"
      >
        <Plus className="size-4" aria-hidden="true" />
        <span className="sr-only">Aumentar tamano del dashboard</span>
      </Button>
    </div>
  );
}
