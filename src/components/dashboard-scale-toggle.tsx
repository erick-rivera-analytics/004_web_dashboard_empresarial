"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Frame, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "dashboard-scale";
const MODE_STORAGE_KEY = "dashboard-scale-mode";
const SCALE_EVENT = "dashboard-scale-change";
const MIN_SCALE = 0.72;
const MAX_SCALE = 1.15;
const STEP = 0.05;
const BASE_DASHBOARD_WIDTH = 1600;
const BASE_DASHBOARD_HEIGHT = 1080;

function clampScale(value: number) {
  return Math.min(Math.max(value, MIN_SCALE), MAX_SCALE);
}

function applyScale(scale: number) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.style.setProperty("--dashboard-scale", scale.toFixed(2));
}

function readStoredMode() {
  if (typeof window === "undefined") {
    return "fit";
  }

  return window.localStorage.getItem(MODE_STORAGE_KEY) === "manual" ? "manual" : "fit";
}

function computeFitScale() {
  if (typeof window === "undefined") {
    return 1;
  }

  const widthScale = (window.innerWidth - 40) / BASE_DASHBOARD_WIDTH;
  const heightScale = (window.innerHeight - 36) / BASE_DASHBOARD_HEIGHT;
  return clampScale(Math.min(widthScale, heightScale, MAX_SCALE));
}

function readStoredScaleSnapshot() {
  const mode = readStoredMode();

  if (mode === "fit") {
    return `fit|${computeFitScale().toFixed(2)}`;
  }

  if (typeof window === "undefined") {
    return "manual|1.00";
  }

  const storedValue = Number(window.localStorage.getItem(STORAGE_KEY) ?? "1");
  const scale = Number.isFinite(storedValue) ? clampScale(storedValue) : 1;
  return `manual|${scale.toFixed(2)}`;
}

function subscribeToScaleChange(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => onStoreChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener(SCALE_EVENT, handleChange);
  window.addEventListener("resize", handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(SCALE_EVENT, handleChange);
    window.removeEventListener("resize", handleChange);
  };
}

function persistScale(scale: number) {
  if (typeof window === "undefined") {
    return;
  }

  const nextScale = clampScale(scale);
  window.localStorage.setItem(MODE_STORAGE_KEY, "manual");
  window.localStorage.setItem(STORAGE_KEY, nextScale.toFixed(2));
  window.dispatchEvent(new Event(SCALE_EVENT));
}

function persistFitMode() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MODE_STORAGE_KEY, "fit");
  window.dispatchEvent(new Event(SCALE_EVENT));
}

export function DashboardScaleToggle() {
  const snapshot = useSyncExternalStore(subscribeToScaleChange, readStoredScaleSnapshot, () => "fit|1.00");
  const [mode, scaleValue] = snapshot.split("|");
  const scale = Number(scaleValue ?? "1");
  const isFitMode = mode === "fit";

  useEffect(() => {
    applyScale(scale);
  }, [scale]);

  function updateScale(nextScale: number) {
    persistScale(nextScale);
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/82 p-1 backdrop-blur-sm">
      <Button
        variant={isFitMode ? "secondary" : "ghost"}
        size="icon"
        className="size-8 rounded-full"
        onClick={persistFitMode}
        title="Ajustar a la ventana"
      >
        <Frame className="size-4" />
        <span className="sr-only">Ajustar dashboard a la ventana</span>
      </Button>

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
        onClick={isFitMode ? persistFitMode : () => updateScale(1)}
        title={isFitMode ? "Escala automatica por ventana" : "Restablecer escala manual"}
      >
        {isFitMode ? `FIT ${Math.round(scale * 100)}%` : `${Math.round(scale * 100)}%`}
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
