"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "dashboard-scale";
const SCALE_EVENT = "dashboard-scale-change";
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.15;
const STEP = 0.05;

function clampScale(value: number) {
  return Math.min(Math.max(value, MIN_SCALE), MAX_SCALE);
}

function applyScale(scale: number) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.style.setProperty("--dashboard-scale", scale.toFixed(2));
}

function readStoredScale() {
  if (typeof window === "undefined") {
    return 1;
  }

  const storedValue = Number(window.localStorage.getItem(STORAGE_KEY) ?? "1");
  return Number.isFinite(storedValue) ? clampScale(storedValue) : 1;
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

  const nextScale = clampScale(scale);
  window.localStorage.setItem(STORAGE_KEY, nextScale.toFixed(2));
  window.dispatchEvent(new Event(SCALE_EVENT));
}

export function DashboardScaleToggle() {
  const scale = useSyncExternalStore(subscribeToScaleChange, readStoredScale, () => 1);

  useEffect(() => {
    applyScale(scale);
  }, [scale]);

  function updateScale(nextScale: number) {
    persistScale(nextScale);
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/82 p-1 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-full"
        onClick={() => updateScale(scale - STEP)}
      >
        <Minus className="size-4" />
        <span className="sr-only">Reducir escala del dashboard</span>
      </Button>

      <button
        type="button"
        className="min-w-[58px] rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={() => updateScale(1)}
        title="Restablecer escala"
      >
        {Math.round(scale * 100)}%
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="size-8 rounded-full"
        onClick={() => updateScale(scale + STEP)}
      >
        <Plus className="size-4" />
        <span className="sr-only">Aumentar escala del dashboard</span>
      </Button>
    </div>
  );
}
