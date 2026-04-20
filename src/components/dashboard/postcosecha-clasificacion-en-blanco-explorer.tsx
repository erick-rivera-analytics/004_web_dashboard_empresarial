"use client";

import { startTransition, type ReactNode, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  BrainCircuit,
  Download,
  LoaderCircle,
  Play,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  TableProperties,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PoscosechaClasificacionRecipeOverlay } from "@/components/dashboard/postcosecha-clasificacion-en-blanco-recipe-overlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchJson } from "@/lib/fetch-json";
import {
  buildClasificacionAvailabilityDerived,
  buildClasificacionPrecheck,
} from "@/lib/postcosecha-clasificacion-en-blanco-client";
import type {
  PoscosechaSkuInput,
  PoscosechaSkuPayload,
  PoscosechaSkuRecord,
} from "@/lib/postcosecha-sku-types";
import type {
  PoscosechaClasificacionAvailabilityRow,
  PoscosechaClasificacionBootData,
  PoscosechaClasificacionLotSlot,
  PoscosechaClasificacionOrderRow,
  PoscosechaClasificacionOrderOrigin,
  PoscosechaClasificacionOrderSlot,
  PoscosechaClasificacionRecipeInput,
  PoscosechaClasificacionRecipePayload,
  PoscosechaClasificacionRecipeResult,
  PoscosechaClasificacionResultOrderRow,
  PoscosechaClasificacionRunMode,
  PoscosechaClasificacionRunPayload,
  SolverDateKey,
} from "@/lib/postcosecha-clasificacion-en-blanco-types";
import {
  POSCOSECHA_CLASIFICACION_RUN_MODES,
  SOLVER_DATE_KEYS,
} from "@/lib/postcosecha-clasificacion-en-blanco-types";
import { cn } from "@/lib/utils";

type PoscosechaClasificacionEnBlancoExplorerProps = {
  initialData: PoscosechaClasificacionBootData;
  initialError?: string | null;
};

const ORDER_ORIGIN_OPTIONS: Array<{
  value: PoscosechaClasificacionOrderOrigin;
  label: string;
  description: string;
}> = [
  {
    value: "GV",
    label: "GV",
    description: "Disponibilidad proveniente de GV.",
  },
  {
    value: "PRECLASIFICACION",
    label: "PRECLASIFICACION",
    description: "Disponibilidad proveniente de preclasificacion.",
  },
  {
    value: "APERTURA",
    label: "APERTURA",
    description: "Disponibilidad proveniente de apertura.",
  },
];

const ORDER_RESTRICTION_OPTIONS: Array<{
  value: PoscosechaClasificacionOrderOrigin | null;
  label: string;
  description: string;
}> = [
  {
    value: null,
    label: "Sin restriccion",
    description: "La orden puede resolverse con cualquier origen disponible.",
  },
  {
    value: "GV",
    label: "GV",
    description: "Usa GV como origen preferido o estricto segun el tipo elegido.",
  },
  {
    value: "APERTURA",
    label: "APERTURA",
    description: "Usa apertura como origen preferido o estricto segun el tipo elegido.",
  },
  {
    value: "PRECLASIFICACION",
    label: "PRECLASIFICACION",
    description: "Usa preclasificacion como origen preferido o estricto segun el tipo elegido.",
  },
];

const CLASIFICACION_DRAFT_STORAGE_KEY = "postcosecha_clasificacion_en_blanco_draft_v1";
const CLASIFICACION_RESULT_STORAGE_KEY = "postcosecha_clasificacion_en_blanco_result_v1";

type PoscosechaClasificacionDraftSnapshot = {
  version: 1;
  orders: PoscosechaClasificacionOrderRow[];
  availability: PoscosechaClasificacionAvailabilityRow[];
  settings: PoscosechaClasificacionBootData["settings"];
  orderSlots: PoscosechaClasificacionOrderSlot[];
  lotSlots: PoscosechaClasificacionLotSlot[];
};

type PoscosechaClasificacionResultSnapshot = {
  version: 1;
  resultBundle: PoscosechaClasificacionRunPayload["data"] | null;
  activeMode: PoscosechaClasificacionRunMode | null;
  isResultStale: boolean;
};

function readDraftSnapshot(): PoscosechaClasificacionDraftSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CLASIFICACION_DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PoscosechaClasificacionDraftSnapshot> | null;
    if (!parsed || parsed.version !== 1) {
      return null;
    }

    return {
      version: 1,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      availability: Array.isArray(parsed.availability) ? parsed.availability : [],
      settings: parsed.settings ?? { desperdicio: 0.13 },
      orderSlots: Array.isArray(parsed.orderSlots) ? parsed.orderSlots : [],
      lotSlots: Array.isArray(parsed.lotSlots) ? parsed.lotSlots : [],
    };
  } catch {
    return null;
  }
}

function writeDraftSnapshot(snapshot: PoscosechaClasificacionDraftSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CLASIFICACION_DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
}

function readResultSnapshot(): PoscosechaClasificacionResultSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(CLASIFICACION_RESULT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PoscosechaClasificacionResultSnapshot> | null;
    if (!parsed || parsed.version !== 1) {
      return null;
    }

    return {
      version: 1,
      resultBundle: parsed.resultBundle ?? null,
      activeMode: parsed.activeMode ?? null,
      isResultStale: Boolean(parsed.isResultStale),
    };
  } catch {
    return null;
  }
}

function writeResultSnapshot(snapshot: PoscosechaClasificacionResultSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CLASIFICACION_RESULT_STORAGE_KEY, JSON.stringify(snapshot));
}

function mergeDraftOrders(
  baseRows: PoscosechaClasificacionOrderRow[],
  draftRows: PoscosechaClasificacionOrderRow[],
) {
  const draftBySkuId = new Map(draftRows.map((row) => [row.skuId, row]));
  return baseRows.map((row) => {
    const draft = draftBySkuId.get(row.skuId);
    if (!draft) {
      return row;
    }

    return {
      ...row,
      ...Object.fromEntries(SOLVER_DATE_KEYS.map((key) => [key, Math.max(toInteger(draft[key]), 0)])),
    };
  });
}

function mergeDraftAvailability(
  baseRows: PoscosechaClasificacionAvailabilityRow[],
  draftRows: PoscosechaClasificacionAvailabilityRow[],
) {
  const draftByGrade = new Map(draftRows.map((row) => [row.grado, row]));
  return baseRows.map((row) => {
    const draft = draftByGrade.get(row.grado);
    if (!draft) {
      return row;
    }

    return {
      ...row,
      pesoTalloSeed: Math.max(toFloat(draft.pesoTalloSeed), 0),
      ...Object.fromEntries(SOLVER_DATE_KEYS.map((key) => [key, Math.max(toInteger(draft[key]), 0)])),
    };
  });
}

function mergeDraftOrderSlots(
  baseSlots: PoscosechaClasificacionOrderSlot[],
  draftSlots: PoscosechaClasificacionOrderSlot[],
) : PoscosechaClasificacionOrderSlot[] {
  const merged: PoscosechaClasificacionOrderSlot[] = draftSlots
    .filter((slot): slot is PoscosechaClasificacionOrderSlot => SOLVER_DATE_KEYS.includes(slot.key))
    .map((slot) => ({
      key: slot.key,
      restriction: slot.restriction ?? null,
      restrictionMode: slot.restrictionMode === "STRICT" ? "STRICT" : "SOFT",
    }));

  return merged.length ? merged : baseSlots;
}

function mergeDraftLotSlots(
  baseSlots: PoscosechaClasificacionLotSlot[],
  draftSlots: PoscosechaClasificacionLotSlot[],
) : PoscosechaClasificacionLotSlot[] {
  const merged: PoscosechaClasificacionLotSlot[] = draftSlots
    .filter((slot): slot is PoscosechaClasificacionLotSlot => SOLVER_DATE_KEYS.includes(slot.key))
    .map((slot) => ({
      key: slot.key,
      lotDate: typeof slot.lotDate === "string" && slot.lotDate.trim().length ? slot.lotDate : null,
      origin: slot.origin === "APERTURA" || slot.origin === "PRECLASIFICACION" ? slot.origin : "GV",
    }));

  return merged.length ? merged : baseSlots;
}

function buildHydratedDraftState(
  bootData: PoscosechaClasificacionBootData,
  draft: PoscosechaClasificacionDraftSnapshot | null,
) {
  const baseOrderSlots = buildInitialOrderSlots(bootData.orderSlots ?? bootData.dateSlots);
  const baseLotSlots = buildInitialLotSlots(bootData.lotSlots ?? bootData.dateSlots);

  if (!draft) {
    return {
      orders: bootData.ordersTemplate,
      availability: bootData.availabilityTemplate,
      settings: bootData.settings,
      orderSlots: baseOrderSlots,
      lotSlots: baseLotSlots,
    };
  }

  return {
    orders: mergeDraftOrders(bootData.ordersTemplate, draft.orders),
    availability: mergeDraftAvailability(bootData.availabilityTemplate, draft.availability),
    settings: {
      desperdicio: Math.max(toFloat(draft.settings?.desperdicio ?? bootData.settings.desperdicio), 0),
    },
    orderSlots: mergeDraftOrderSlots(baseOrderSlots, draft.orderSlots),
    lotSlots: mergeDraftLotSlots(baseLotSlots, draft.lotSlots),
  };
}

function formatNumber(value: number | null, digits = 2) {
  if (value === null || value === undefined) {
    return "-";
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatInteger(value: number | null) {
  if (value === null || value === undefined) {
    return "-";
  }

  return Math.round(value).toLocaleString("en-US");
}

function formatPercent(value: number | null) {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${(value * 100).toFixed(1)}%`;
}

function buildTimestampLabel(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function handleCaptureInputTab(event: React.KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Tab") {
    return;
  }

  const currentInput = event.currentTarget;
  const captureContainer = currentInput.closest("[data-capture-scope='true']");
  if (!captureContainer) {
    return;
  }

  const inputs = Array.from(
    captureContainer.querySelectorAll<HTMLInputElement>("input[data-capture-input='true']"),
  );
  const currentIndex = inputs.indexOf(currentInput);

  if (currentIndex === -1) {
    return;
  }

  const nextIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1;
  const nextInput = inputs[nextIndex];

  if (!nextInput) {
    return;
  }

  event.preventDefault();
  nextInput.focus();
  nextInput.select();
}

function toInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(Math.round(parsed), 0) : 0;
}

function toFloat(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function mapSkuRecordToFormValues(record: PoscosechaSkuRecord): PoscosechaSkuInput {
  return {
    sku: record.sku,
    pesoIdealBunch: record.pesoIdealBunch,
    tallosMin: record.tallosMin,
    tallosMax: record.tallosMax,
    pesoMinObjetivo: record.pesoMinObjetivo,
    pesoMaxObjetivo: record.pesoMaxObjetivo,
    maxGradosObjetivo: record.maxGradosObjetivo,
    changeReason: "",
  };
}

function buildSkuPayload(values: PoscosechaSkuInput): PoscosechaSkuInput {
  return {
    sku: values.sku.trim(),
    pesoIdealBunch: toFloat(values.pesoIdealBunch),
    tallosMin: toInteger(values.tallosMin),
    tallosMax: toInteger(values.tallosMax),
    pesoMinObjetivo: toFloat(values.pesoMinObjetivo),
    pesoMaxObjetivo: toFloat(values.pesoMaxObjetivo),
    maxGradosObjetivo: toInteger(values.maxGradosObjetivo),
    changeReason: values.changeReason?.trim() || null,
  };
}

function validateSkuForm(values: PoscosechaSkuInput) {
  const payload = buildSkuPayload(values);
  const errors: Partial<Record<keyof PoscosechaSkuInput, string>> = {};

  if (!payload.sku) {
    errors.sku = "El SKU es obligatorio.";
  }
  if (payload.pesoIdealBunch <= 0) {
    errors.pesoIdealBunch = "El peso ideal debe ser mayor a cero.";
  }
  if (payload.tallosMin < 1) {
    errors.tallosMin = "Los tallos minimos deben ser al menos 1.";
  }
  if (payload.tallosMax < payload.tallosMin) {
    errors.tallosMax = "Los tallos maximos no pueden ser menores a los minimos.";
  }
  if (payload.pesoMinObjetivo <= 0) {
    errors.pesoMinObjetivo = "El peso minimo objetivo debe ser mayor a cero.";
  }
  if (payload.pesoMaxObjetivo < payload.pesoMinObjetivo) {
    errors.pesoMaxObjetivo = "El peso maximo objetivo no puede ser menor al minimo.";
  }
  if (payload.maxGradosObjetivo < 1) {
    errors.maxGradosObjetivo = "El maximo de grados debe ser al menos 1.";
  }

  return errors;
}

function formatShortDate(value: string) {
  if (!value) {
    return "Sin fecha";
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function buildInitialOrderSlots(
  initialSlots: PoscosechaClasificacionOrderSlot[] | undefined,
): PoscosechaClasificacionOrderSlot[] {
  if (initialSlots && initialSlots.length > 0) {
    return initialSlots;
  }

  return [{ key: SOLVER_DATE_KEYS[0], restriction: null, restrictionMode: "SOFT" }];
}

function buildInitialLotSlots(
  initialSlots: PoscosechaClasificacionLotSlot[] | undefined,
): PoscosechaClasificacionLotSlot[] {
  if (initialSlots && initialSlots.length > 0) {
    return initialSlots;
  }

  return [{ key: SOLVER_DATE_KEYS[0], lotDate: null, origin: "GV" }];
}

function getOrderLabel(index: number) {
  return `Orden ${index + 1}`;
}

function getAvailabilityLabel(origin: PoscosechaClasificacionOrderOrigin, loteFecha: string) {
  return `${origin} - ${loteFecha ? formatShortDate(loteFecha) : "sin fecha"}`;
}

function FloatingPanel({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-3xl rounded-[28px] border border-border/70 bg-card/96 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Button type="button" variant="ghost" className="rounded-full px-3" onClick={onClose} aria-label="Cerrar">
            X
          </Button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

function orderTotal(row: PoscosechaClasificacionOrderRow) {
  return SOLVER_DATE_KEYS.reduce((accumulator, key) => accumulator + toInteger(row[key]), 0);
}

function orderSlotTotal(rows: PoscosechaClasificacionOrderRow[], dateKey: SolverDateKey) {
  return rows.reduce((accumulator, row) => accumulator + toInteger(row[dateKey]), 0);
}

function orderSlotActiveSkuCount(rows: PoscosechaClasificacionOrderRow[], dateKey: SolverDateKey) {
  return rows.filter((row) => toInteger(row[dateKey]) > 0).length;
}

function lotSlotMallasTotal(rows: PoscosechaClasificacionAvailabilityRow[], dateKey: SolverDateKey) {
  return rows.reduce((accumulator, row) => accumulator + toInteger(row[dateKey]), 0);
}

function lotSlotNetStemsTotal(
  rows: PoscosechaClasificacionAvailabilityRow[],
  dateKey: SolverDateKey,
  desperdicio: number,
) {
  return rows.reduce((accumulator, row) => accumulator + Math.round(toInteger(row[dateKey]) * 20 * (1 - desperdicio)), 0);
}

function SummaryTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "positive" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border px-4 py-4",
        tone === "positive"
          ? "border-chart-success-bold/40 bg-chart-success-bold/10"
          : tone === "warning"
            ? "border-slate-400/40 bg-slate-400/10"
            : "border-border/70 bg-background/80",
      )}
    >
      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function ResultStatusBadge({ status }: { status: string }) {
  const tone = status === "Dentro de objetivo"
    ? "border-chart-success-bold/45 bg-chart-success-bold/10 text-foreground"
    : status === "Sin resolver"
      ? "border-slate-500/45 bg-slate-500/12 text-foreground"
      : "border-slate-400/45 bg-slate-400/12 text-foreground";

  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-medium", tone)}>
      {status}
    </span>
  );
}

function SkuInfoOverlay({
  row,
  isEditing,
  isSaving,
  formValues,
  formErrors,
  onEdit,
  onCancelEdit,
  onFieldChange,
  onSubmit,
  onClose,
}: {
  row: PoscosechaSkuRecord | null;
  isEditing: boolean;
  isSaving: boolean;
  formValues: PoscosechaSkuInput;
  formErrors: Partial<Record<keyof PoscosechaSkuInput, string>>;
  onEdit: () => void;
  onCancelEdit: () => void;
  onFieldChange: <Key extends keyof PoscosechaSkuInput>(field: Key, value: PoscosechaSkuInput[Key]) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  if (!row) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-border/70 bg-card/96 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
          <div className="space-y-2">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.24em]">
              Ficha SKU
            </Badge>
            <div>
              <h3 className="text-2xl font-semibold text-foreground">{row.sku}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {isEditing
                  ? "Edicion directa del SKU usando la misma logica del maestro."
                  : "Vista informativa del SKU con acceso directo a modificacion."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Button type="button" variant="outline" className="rounded-full" onClick={onCancelEdit}>
                Cancelar
              </Button>
            ) : (
              <Button type="button" variant="outline" className="rounded-full" onClick={onEdit}>
                Modificar
              </Button>
            )}
            <Button type="button" variant="ghost" className="rounded-full" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>

        {isEditing ? (
          <form className="space-y-5 px-6 py-6" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sku-edit-name">SKU</Label>
                <Input
                  id="sku-edit-name"
                  value={formValues.sku}
                  onChange={(event) => onFieldChange("sku", event.target.value)}
                />
                {formErrors.sku ? <p className="text-xs text-destructive">{formErrors.sku}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku-edit-peso-ideal">Peso ideal</Label>
                <Input
                  id="sku-edit-peso-ideal"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formValues.pesoIdealBunch}
                  onChange={(event) => onFieldChange("pesoIdealBunch", Number(event.target.value))}
                />
                {formErrors.pesoIdealBunch ? <p className="text-xs text-destructive">{formErrors.pesoIdealBunch}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku-edit-max-grados">Max grados</Label>
                <Input
                  id="sku-edit-max-grados"
                  type="number"
                  min={1}
                  step={1}
                  value={formValues.maxGradosObjetivo}
                  onChange={(event) => onFieldChange("maxGradosObjetivo", Number(event.target.value))}
                />
                {formErrors.maxGradosObjetivo ? <p className="text-xs text-destructive">{formErrors.maxGradosObjetivo}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku-edit-tallos-min">Tallos min</Label>
                <Input
                  id="sku-edit-tallos-min"
                  type="number"
                  min={1}
                  step={1}
                  value={formValues.tallosMin}
                  onChange={(event) => onFieldChange("tallosMin", Number(event.target.value))}
                />
                {formErrors.tallosMin ? <p className="text-xs text-destructive">{formErrors.tallosMin}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku-edit-tallos-max">Tallos max</Label>
                <Input
                  id="sku-edit-tallos-max"
                  type="number"
                  min={1}
                  step={1}
                  value={formValues.tallosMax}
                  onChange={(event) => onFieldChange("tallosMax", Number(event.target.value))}
                />
                {formErrors.tallosMax ? <p className="text-xs text-destructive">{formErrors.tallosMax}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku-edit-peso-min">Peso min</Label>
                <Input
                  id="sku-edit-peso-min"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formValues.pesoMinObjetivo}
                  onChange={(event) => onFieldChange("pesoMinObjetivo", Number(event.target.value))}
                />
                {formErrors.pesoMinObjetivo ? <p className="text-xs text-destructive">{formErrors.pesoMinObjetivo}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku-edit-peso-max">Peso max</Label>
                <Input
                  id="sku-edit-peso-max"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formValues.pesoMaxObjetivo}
                  onChange={(event) => onFieldChange("pesoMaxObjetivo", Number(event.target.value))}
                />
                {formErrors.pesoMaxObjetivo ? <p className="text-xs text-destructive">{formErrors.pesoMaxObjetivo}</p> : null}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sku-edit-reason">Motivo del cambio</Label>
                <Input
                  id="sku-edit-reason"
                  value={formValues.changeReason ?? ""}
                  onChange={(event) => onFieldChange("changeReason", event.target.value)}
                  placeholder="Ej: ajuste directo desde solver"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="rounded-full" disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
            <SummaryTile
              label="Peso ideal"
              value={`${formatNumber(row.pesoIdealBunch)} g`}
              hint="Peso objetivo del bunch para este SKU."
            />
            <SummaryTile
              label="Rango de peso"
              value={`${formatNumber(row.pesoMinObjetivo)} - ${formatNumber(row.pesoMaxObjetivo)} g`}
              hint="Limites operativos configurados para este SKU."
            />
            <SummaryTile
              label="Tallos min"
              value={formatInteger(row.tallosMin)}
              hint="Minimo esperado de tallos por bunch."
            />
            <SummaryTile
              label="Tallos max"
              value={formatInteger(row.tallosMax)}
              hint="Maximo esperado de tallos por bunch."
            />
          </div>
        )}
      </div>
    </div>
  );
}

function OrdersInputTable({
  rows,
  onChange,
  onOpenSku,
  orderSlots,
}: {
  rows: PoscosechaClasificacionOrderRow[];
  onChange: (skuId: string, dateKey: SolverDateKey, value: string) => void;
  onOpenSku: (skuId: string) => void;
  orderSlots: PoscosechaClasificacionOrderSlot[];
}) {
  return (
    <div className="max-h-[600px] overflow-auto rounded-[24px] border border-border/70">
      <table className="min-w-[720px] w-full text-sm">
        <thead className="sticky top-0 bg-background/95 backdrop-blur">
          <tr className="border-b border-border/70 text-left">
            <th className="px-4 py-3 font-medium">SKU</th>
            {orderSlots.map((slot, index) => (
              <th key={slot.key} className="px-3 py-3 text-center font-medium">
                {getOrderLabel(index)}
              </th>
            ))}
            <th className="px-4 py-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.skuId} className="border-b border-border/50 last:border-b-0">
              <td className="px-4 py-3 align-middle font-medium">
                <button
                  type="button"
                  className="text-left text-foreground transition hover:text-slate-700 hover:underline"
                  onClick={() => onOpenSku(row.skuId)}
                >
                  <span className="block">{row.sku}</span>
                </button>
              </td>
              {orderSlots.map((slot) => (
                <td key={slot.key} className="px-3 py-2 text-center">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={row[slot.key]}
                    onChange={(event) => onChange(row.skuId, slot.key, event.target.value)}
                    className="mx-auto h-9 w-20 text-right"
                  />
                </td>
              ))}
              <td className="px-4 py-3 text-right font-medium text-muted-foreground">
                {formatInteger(orderTotal(row))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AvailabilityInputTable({
  rows,
  desperdicio,
  onDateChange,
  onWeightChange,
  lotSlots,
}: {
  rows: PoscosechaClasificacionAvailabilityRow[];
  desperdicio: number;
  onDateChange: (grado: number, dateKey: SolverDateKey, value: string) => void;
  onWeightChange: (grado: number, value: string) => void;
  lotSlots: PoscosechaClasificacionLotSlot[];
}) {
  const derivedRows = buildClasificacionAvailabilityDerived(rows, desperdicio);
  const derivedByGrade = new Map(derivedRows.map((row) => [row.grado, row]));

  return (
    <div className="max-h-[600px] overflow-auto rounded-[24px] border border-border/70">
      <table className="min-w-[860px] w-full text-sm">
        <thead className="sticky top-0 bg-background/95 backdrop-blur">
          <tr className="border-b border-border/70 text-left">
            <th className="px-4 py-3 font-medium">Grado</th>
            {lotSlots.map((slot) => (
              <th key={slot.key} className="px-3 py-3 text-center font-medium">
                {getAvailabilityLabel(slot.origin, slot.lotDate ?? "")}
              </th>
            ))}
            <th className="px-3 py-3 text-center font-medium">Peso tallo seed (g)</th>
            <th className="px-4 py-3 text-right font-medium">Mallas</th>
            <th className="px-4 py-3 text-right font-medium">Tallos netos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const derived = derivedByGrade.get(row.grado);

            return (
              <tr key={row.grado} className="border-b border-border/50 last:border-b-0">
                <td className="px-4 py-3 align-middle font-medium">{row.grado}</td>
                {lotSlots.map((slot) => (
                  <td key={slot.key} className="px-3 py-2 text-center">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={row[slot.key]}
                      onChange={(event) => onDateChange(row.grado, slot.key, event.target.value)}
                      className="mx-auto h-9 w-20 text-right"
                    />
                  </td>
                ))}
                <td className="px-3 py-2 text-center">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={row.pesoTalloSeed}
                    onChange={(event) => onWeightChange(row.grado, event.target.value)}
                    className="mx-auto h-9 w-24 text-right"
                  />
                </td>
                <td className="px-4 py-3 text-right font-medium text-muted-foreground">
                  {formatInteger(derived?.mallasTotales ?? 0)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-muted-foreground">
                  {formatInteger(derived?.tallosNetos ?? 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SimpleTableCard({
  title,
  description,
  table,
}: {
  title: string;
  description: string;
  table: ReactNode;
}) {
  return (
    <Card className="starter-panel border-border/70 bg-card/84">
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{table}</CardContent>
    </Card>
  );
}

function OrderSlotCaptureTable({
  rows,
  slotKey,
  slotLabel,
  idealBySkuId,
  onChange,
  onOpenSku,
}: {
  rows: PoscosechaClasificacionOrderRow[];
  slotKey: SolverDateKey;
  slotLabel: string;
  idealBySkuId: Map<string, number>;
  onChange: (skuId: string, dateKey: SolverDateKey, value: string) => void;
  onOpenSku: (skuId: string) => void;
}) {
  return (
    <div data-capture-scope="true" className="max-h-[70vh] overflow-auto rounded-[24px] border border-border/70">
      <table className="min-w-[640px] w-full text-sm">
        <thead className="sticky top-0 bg-background/95 backdrop-blur">
          <tr className="border-b border-border/70 text-left">
            <th className="px-4 py-3 font-medium">SKU</th>
            <th className="px-4 py-3 text-center font-medium">{slotLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.skuId} className="border-b border-border/50 last:border-b-0">
              <td className="px-4 py-3 align-middle">
                <button
                  type="button"
                  tabIndex={-1}
                  className="text-left text-foreground transition hover:text-slate-700 hover:underline"
                  onClick={() => onOpenSku(row.skuId)}
                >
                  <span className="block font-medium">{row.sku}</span>
                  <span className="block text-xs text-muted-foreground">
                    Peso ideal: {formatNumber(idealBySkuId.get(row.skuId) ?? null, 2)} g
                  </span>
                </button>
              </td>
              <td className="px-4 py-2 text-center">
                <Input
                  data-capture-input="true"
                  type="number"
                  min={0}
                  step={1}
                  value={row[slotKey]}
                  onChange={(event) => onChange(row.skuId, slotKey, event.target.value)}
                  onKeyDown={handleCaptureInputTab}
                  className="mx-auto h-9 w-24 text-right"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LotSlotCaptureTable({
  rows,
  slotKey,
  slotLabel,
  onDateChange,
}: {
  rows: PoscosechaClasificacionAvailabilityRow[];
  slotKey: SolverDateKey;
  slotLabel: string;
  onDateChange: (grado: number, dateKey: SolverDateKey, value: string) => void;
}) {
  return (
    <div data-capture-scope="true" className="max-h-[70vh] overflow-auto rounded-[24px] border border-border/70">
      <table className="min-w-[420px] w-full text-sm">
        <thead className="sticky top-0 bg-background/95 backdrop-blur">
          <tr className="border-b border-border/70 text-left">
            <th className="px-4 py-3 font-medium">Grado</th>
            <th className="px-4 py-3 text-center font-medium">{slotLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.grado} className="border-b border-border/50 last:border-b-0">
              <td className="px-4 py-3 font-medium">{row.grado}</td>
              <td className="px-4 py-2 text-center">
                <Input
                  data-capture-input="true"
                  type="number"
                  min={0}
                  step={1}
                  value={row[slotKey]}
                  onChange={(event) => onDateChange(row.grado, slotKey, event.target.value)}
                  onKeyDown={handleCaptureInputTab}
                  className="mx-auto h-9 w-24 text-right"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AvailabilityWeightEditor({
  rows,
  onWeightChange,
}: {
  rows: PoscosechaClasificacionAvailabilityRow[];
  onWeightChange: (grado: number, value: string) => void;
}) {
  return (
    <div data-capture-scope="true" className="max-h-[70vh] overflow-auto rounded-[24px] border border-border/70">
      <table className="min-w-[420px] w-full text-sm">
        <thead className="sticky top-0 bg-background/95 backdrop-blur">
          <tr className="border-b border-border/70 text-left">
            <th className="px-4 py-3 font-medium">Grado</th>
            <th className="px-4 py-3 text-center font-medium">Peso tallo seed (g)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.grado} className="border-b border-border/50 last:border-b-0">
              <td className="px-4 py-3 font-medium">{row.grado}</td>
              <td className="px-4 py-2 text-center">
                <Input
                  data-capture-input="true"
                  type="number"
                  min={0}
                  step={0.01}
                  value={row.pesoTalloSeed}
                  onChange={(event) => onWeightChange(row.grado, event.target.value)}
                  onKeyDown={handleCaptureInputTab}
                  className="mx-auto h-9 w-28 text-right"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function cloneOrderRows(rows: PoscosechaClasificacionOrderRow[]) {
  return rows.map((row) => ({ ...row }));
}

function cloneAvailabilityRows(rows: PoscosechaClasificacionAvailabilityRow[]) {
  return rows.map((row) => ({ ...row }));
}

function buildRecipeInput(
  row: PoscosechaClasificacionResultOrderRow,
  netStemValues: Record<string, number>,
  availabilityRows: PoscosechaClasificacionAvailabilityRow[],
): PoscosechaClasificacionRecipeInput | null {
  const grades = Object.entries(netStemValues)
    .map(([gradeLabel, value]) => {
      const grade = Number(gradeLabel);
      const tallosNetos = Math.max(Math.round(Number(value) || 0), 0);
      const availabilityRow = availabilityRows.find((item) => item.grado === grade);

      return {
        grado: Number.isFinite(grade) ? grade : 0,
        tallosNetos,
        pesoTalloSeed: availabilityRow?.pesoTalloSeed ?? 0,
      };
    })
    .filter((item) => item.grado > 0 && item.tallosNetos > 0);

  if (!grades.length || row.pedidoResuelto <= 0) {
    return null;
  }

  return {
    sku: row.sku,
    pedidoResuelto: Math.max(Math.round(row.pedidoResuelto), 0),
    pesoIdealBunch: row.pesoIdealBunch,
    pesoMinObjetivo: row.pesoMinObjetivo,
    pesoMaxObjetivo: row.pesoMaxObjetivo,
    tallosMin: row.tallosMin,
    tallosMax: row.tallosMax,
    tallosAsignadosNetos: row.tallosAsignadosNetos,
    tallosPromedioRamo: row.tallosPromedioRamo,
    grados: grades,
  };
}

export function PoscosechaClasificacionEnBlancoExplorer({
  initialData,
  initialError,
}: PoscosechaClasificacionEnBlancoExplorerProps) {
  const initialOrderSlots = useMemo(
    () => buildInitialOrderSlots(initialData.orderSlots ?? initialData.dateSlots),
    [initialData.dateSlots, initialData.orderSlots],
  );
  const initialLotSlots = useMemo(
    () => buildInitialLotSlots(initialData.lotSlots ?? initialData.dateSlots),
    [initialData.dateSlots, initialData.lotSlots],
  );
  const [bootData, setBootData] = useState(initialData);
  const [orders, setOrders] = useState(initialData.ordersTemplate);
  const [availability, setAvailability] = useState(initialData.availabilityTemplate);
  const [settings, setSettings] = useState(initialData.settings);
  const [orderSlots, setOrderSlots] = useState<PoscosechaClasificacionOrderSlot[]>(initialOrderSlots);
  const [lotSlots, setLotSlots] = useState<PoscosechaClasificacionLotSlot[]>(initialLotSlots);
  const [resultBundle, setResultBundle] = useState<PoscosechaClasificacionRunPayload["data"] | null>(null);
  const [activeMode, setActiveMode] = useState<PoscosechaClasificacionRunMode | null>(null);
  const [isResultStale, setIsResultStale] = useState(false);
  const [search, setSearch] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [selectedSkuInfo, setSelectedSkuInfo] = useState<PoscosechaSkuRecord | null>(null);
  const [isSkuEditing, setIsSkuEditing] = useState(false);
  const [isSkuSaving, setIsSkuSaving] = useState(false);
  const [skuFormValues, setSkuFormValues] = useState<PoscosechaSkuInput>({
    sku: "",
    pesoIdealBunch: 0,
    tallosMin: 0,
    tallosMax: 0,
    pesoMinObjetivo: 0,
    pesoMaxObjetivo: 0,
    maxGradosObjetivo: 1,
    changeReason: "",
  });
  const [skuFormErrors, setSkuFormErrors] = useState<Partial<Record<keyof PoscosechaSkuInput, string>>>({});
  const [selectedRecipeSku, setSelectedRecipeSku] = useState<string | null>(null);
  const [recipeData, setRecipeData] = useState<PoscosechaClasificacionRecipeResult | null>(null);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [isRecipeLoading, setIsRecipeLoading] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [editingOrderSlotKey, setEditingOrderSlotKey] = useState<SolverDateKey | null>(null);
  const [editingLotSlotKey, setEditingLotSlotKey] = useState<SolverDateKey | null>(null);
  const [isWeightEditorOpen, setIsWeightEditorOpen] = useState(false);
  const [draftOrderRows, setDraftOrderRows] = useState<PoscosechaClasificacionOrderRow[]>([]);
  const [draftOrderSlot, setDraftOrderSlot] = useState<PoscosechaClasificacionOrderSlot | null>(null);
  const [draftLotRows, setDraftLotRows] = useState<PoscosechaClasificacionAvailabilityRow[]>([]);
  const [draftLotSlot, setDraftLotSlot] = useState<PoscosechaClasificacionLotSlot | null>(null);
  const [draftWeightRows, setDraftWeightRows] = useState<PoscosechaClasificacionAvailabilityRow[]>([]);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const deferredSearch = useDeferredValue(search);

  const filteredOrders = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();

    if (!normalized) {
      return orders;
    }

    return orders.filter((row) => row.sku.toLowerCase().includes(normalized));
  }, [deferredSearch, orders]);

  const availabilityDerived = useMemo(
    () => buildClasificacionAvailabilityDerived(availability, settings.desperdicio),
    [availability, settings.desperdicio],
  );

  const precheckModes = useMemo(() => {
    return POSCOSECHA_CLASIFICACION_RUN_MODES.map((mode) => ({
      mode,
      label: mode,
      precheck: buildClasificacionPrecheck(
        orders,
        availability,
        bootData.skuMaster,
        settings.desperdicio,
        orderSlots,
        lotSlots,
        mode,
      ),
    }));
  }, [availability, bootData.skuMaster, lotSlots, orderSlots, orders, settings.desperdicio]);

  const ordersWithCapture = useMemo(
    () => orders.filter((row) => orderTotal(row) > 0).length,
    [orders],
  );

  const gradesWithCapture = useMemo(
    () => availabilityDerived.filter((row) => row.mallasTotales > 0).length,
    [availabilityDerived],
  );

  const flexiblePrecheck = useMemo(() => {
    const masterBySkuId = new Map(bootData.skuMaster.map((record) => [record.skuId, record]));
    const flexibleKeys = new Set(
      orderSlots
        .filter((slot) => !slot.restriction || slot.restrictionMode !== "STRICT")
        .map((slot) => slot.key),
    );
    const lotKeys = new Set(lotSlots.map((slot) => slot.key));

    let tallosPedidos = 0;
    for (const row of orders) {
      const masterRecord = masterBySkuId.get(row.skuId);
      if (!masterRecord) {
        continue;
      }
      const totalPedido = SOLVER_DATE_KEYS.reduce(
        (accumulator, key) => accumulator + (flexibleKeys.has(key) ? toInteger(row[key]) : 0),
        0,
      );
      tallosPedidos += totalPedido * toInteger(masterRecord.tallosMin);
    }

    const tallosDisponibles = buildClasificacionAvailabilityDerived(
      availability.map((row) => ({
        ...row,
        fecha_1: lotKeys.has("fecha_1") ? row.fecha_1 : 0,
        fecha_2: lotKeys.has("fecha_2") ? row.fecha_2 : 0,
        fecha_3: lotKeys.has("fecha_3") ? row.fecha_3 : 0,
        fecha_4: lotKeys.has("fecha_4") ? row.fecha_4 : 0,
        fecha_5: lotKeys.has("fecha_5") ? row.fecha_5 : 0,
      })),
      settings.desperdicio,
    ).reduce((accumulator, row) => accumulator + row.tallosNetos, 0);

    const diferencia = tallosPedidos - tallosDisponibles;

    return {
      isValid: tallosPedidos > 0 && tallosDisponibles > 0,
      tallosPedidos,
      tallosDisponibles,
      diferencia,
      message:
        tallosPedidos <= 0
          ? "Debes ingresar pedidos flexibles mayores a cero."
          : tallosDisponibles <= 0
            ? "Debes ingresar disponibilidad mayor a cero."
            : diferencia < 0
              ? "Las ordenes no estrictas tienen disponibilidad total suficiente y aun queda saldo."
              : "Las ordenes no estrictas consumen toda la disponibilidad y aun queda demanda pendiente.",
    };
  }, [availability, bootData.skuMaster, lotSlots, orderSlots, orders, settings.desperdicio]);

  const estimatedWeightKpis = useMemo(() => {
    const masterBySkuId = new Map(bootData.skuMaster.map((record) => [record.skuId, record]));
    const totalAvailableWeight = availabilityDerived.reduce((accumulator, row) => accumulator + row.pesoTotalGestionable, 0);
    const totalAvailableStems = availabilityDerived.reduce((accumulator, row) => accumulator + row.tallosNetos, 0);
    const availableAvgStemWeight = totalAvailableStems > 0 ? totalAvailableWeight / totalAvailableStems : null;

    let totalRequiredIdealWeight = 0;
    let totalRequiredMinStems = 0;
    for (const row of orders) {
      const masterRecord = masterBySkuId.get(row.skuId);
      if (!masterRecord) {
        continue;
      }
      const totalPedido = orderTotal(row);
      totalRequiredIdealWeight += totalPedido * toFloat(masterRecord.pesoIdealBunch);
      totalRequiredMinStems += totalPedido * toInteger(masterRecord.tallosMin);
    }

    const requiredAvgStemWeight = totalRequiredMinStems > 0 ? totalRequiredIdealWeight / totalRequiredMinStems : null;
    const expectedOverweightPct = availableAvgStemWeight !== null && requiredAvgStemWeight !== null
      ? (availableAvgStemWeight / requiredAvgStemWeight) - 1
      : null;
    const expectedEfficiencyPct = availableAvgStemWeight !== null && requiredAvgStemWeight !== null
      ? requiredAvgStemWeight / availableAvgStemWeight
      : null;

    return {
      availableAvgStemWeight,
      requiredAvgStemWeight,
      expectedOverweightPct,
      expectedEfficiencyPct,
    };
  }, [availabilityDerived, bootData.skuMaster, orders]);

  const activeRun = useMemo(
    () => resultBundle?.runs.find((run) => run.mode === activeMode) ?? resultBundle?.runs.find((run) => Boolean(run.result)) ?? null,
    [activeMode, resultBundle],
  );

  const result = activeRun?.result ?? null;

  const resultOrderRowsBySku = useMemo(
    () => new Map((result?.orderRows ?? []).map((row) => [row.sku, row])),
    [result],
  );

  const orderSlotMeta = useMemo(
    () =>
      orderSlots.map((slot, index) => ({
        ...slot,
        orderLabel: getOrderLabel(index),
        totalBunches: orderSlotTotal(orders, slot.key),
        activeSkus: orderSlotActiveSkuCount(orders, slot.key),
      })),
    [orderSlots, orders],
  );

  const lotSlotMeta = useMemo(
    () =>
      lotSlots.map((slot, index) => ({
        ...slot,
        lotOrderLabel: `Lote ${index + 1}`,
        lotLabel: getAvailabilityLabel(slot.origin, slot.lotDate ?? ""),
        totalMallas: lotSlotMallasTotal(availability, slot.key),
        totalNetStems: lotSlotNetStemsTotal(availability, slot.key, settings.desperdicio),
      })),
    [availability, lotSlots, settings.desperdicio],
  );

  const activeEditingOrderSlot = useMemo(
    () => orderSlotMeta.find((slot) => slot.key === editingOrderSlotKey) ?? null,
    [editingOrderSlotKey, orderSlotMeta],
  );

  const activeEditingLotSlot = useMemo(
    () => lotSlotMeta.find((slot) => slot.key === editingLotSlotKey) ?? null,
    [editingLotSlotKey, lotSlotMeta],
  );

  const skuMasterById = useMemo(
    () => new Map(bootData.skuMaster.map((row) => [row.skuId, row])),
    [bootData.skuMaster],
  );

  const skuIdealById = useMemo(
    () => new Map(bootData.skuMaster.map((row) => [row.skuId, row.pesoIdealBunch])),
    [bootData.skuMaster],
  );

  const netStemValuesBySku = useMemo(
    () => new Map((result?.netStemMatrix.rows ?? []).map((row) => [row.sku, row.values])),
    [result],
  );

  useEffect(() => {
    if (initialError) {
      toast.error(initialError);
    }
  }, [initialError]);

  useEffect(() => {
    if (!result) {
      setSelectedSkuInfo(null);
      setIsSkuEditing(false);
      setIsSkuSaving(false);
      setSkuFormErrors({});
      setSelectedRecipeSku(null);
      setRecipeData(null);
      setRecipeError(null);
      setIsRecipeLoading(false);
    }
  }, [result]);

  useEffect(() => {
    if (!activeEditingOrderSlot) {
      setDraftOrderRows([]);
      setDraftOrderSlot(null);
      return;
    }

    setDraftOrderRows(cloneOrderRows(orders));
    setDraftOrderSlot({
      key: activeEditingOrderSlot.key,
      restriction: activeEditingOrderSlot.restriction,
      restrictionMode: activeEditingOrderSlot.restrictionMode,
    });
  }, [activeEditingOrderSlot, orders]);

  useEffect(() => {
    if (!activeEditingLotSlot) {
      setDraftLotRows([]);
      setDraftLotSlot(null);
      return;
    }

    setDraftLotRows(cloneAvailabilityRows(availability));
    setDraftLotSlot({
      key: activeEditingLotSlot.key,
      lotDate: activeEditingLotSlot.lotDate,
      origin: activeEditingLotSlot.origin,
    });
  }, [activeEditingLotSlot, availability]);

  useEffect(() => {
    if (!isWeightEditorOpen) {
      setDraftWeightRows([]);
      return;
    }

    setDraftWeightRows(cloneAvailabilityRows(availability));
  }, [availability, isWeightEditorOpen]);

  useEffect(() => {
    const nextDraft = readDraftSnapshot();
    const nextResultSnapshot = readResultSnapshot();
    if (!nextDraft) {
      if (nextResultSnapshot) {
        setResultBundle(nextResultSnapshot.resultBundle);
        setActiveMode(nextResultSnapshot.activeMode);
        setIsResultStale(nextResultSnapshot.isResultStale);
      }
      setHasHydratedDraft(true);
      return;
    }

    const hydrated = buildHydratedDraftState(initialData, nextDraft);
    setOrders(hydrated.orders);
    setAvailability(hydrated.availability);
    setSettings(hydrated.settings);
    setOrderSlots(hydrated.orderSlots);
    setLotSlots(hydrated.lotSlots);
    setResultBundle(nextResultSnapshot?.resultBundle ?? null);
    setActiveMode(nextResultSnapshot?.activeMode ?? null);
    setIsResultStale(nextResultSnapshot?.isResultStale ?? false);
    setHasHydratedDraft(true);
  }, [initialData]);

  useEffect(() => {
    if (!hasHydratedDraft) {
      return;
    }

    writeDraftSnapshot({
      version: 1,
      orders,
      availability,
      settings,
      orderSlots,
      lotSlots,
    });
  }, [availability, hasHydratedDraft, lotSlots, orderSlots, orders, settings]);

  useEffect(() => {
    if (!hasHydratedDraft) {
      return;
    }

    writeResultSnapshot({
      version: 1,
      resultBundle,
      activeMode,
      isResultStale,
    });
  }, [activeMode, hasHydratedDraft, isResultStale, resultBundle]);

  function applyBootData(nextData: PoscosechaClasificacionBootData) {
    const hydrated = buildHydratedDraftState(nextData, readDraftSnapshot());
    const nextResultSnapshot = readResultSnapshot();
    setBootData(nextData);
    setOrders(hydrated.orders);
    setAvailability(hydrated.availability);
    setSettings(hydrated.settings);
    setOrderSlots(hydrated.orderSlots);
    setLotSlots(hydrated.lotSlots);
    setResultBundle(nextResultSnapshot?.resultBundle ?? null);
    setActiveMode(nextResultSnapshot?.activeMode ?? null);
    setIsResultStale(nextResultSnapshot?.isResultStale ?? false);
  }

  function markResultStale() {
    setIsResultStale((current) => current || Boolean(resultBundle));
  }

  function clearResults() {
    setResultBundle(null);
    setActiveMode(null);
    setIsResultStale(false);
  }

  function addOrderSlot() {
    setOrderSlots((current) => {
      const usedKeys = new Set(current.map((slot) => slot.key));
      const nextKey = SOLVER_DATE_KEYS.find((key) => !usedKeys.has(key));

      if (!nextKey) {
        toast.error("Ya alcanzaste el maximo de 5 ordenes para este solver.");
        return current;
      }

      return [...current, { key: nextKey, restriction: null, restrictionMode: "SOFT" }];
    });
  }

  function removeOrderSlot(dateKey: SolverDateKey) {
    setOrderSlots((current) => {
      if (current.length <= 1) {
        toast.error("Debe existir al menos una orden activa.");
        return current;
      }

      return current.filter((slot) => slot.key !== dateKey);
    });
    startTransition(() => {
      setOrders((current) => current.map((row) => ({ ...row, [dateKey]: 0 })));
      markResultStale();
    });
  }

  function addLotSlot() {
    setLotSlots((current) => {
      const usedKeys = new Set(current.map((slot) => slot.key));
      const nextKey = SOLVER_DATE_KEYS.find((key) => !usedKeys.has(key));

      if (!nextKey) {
        toast.error("Ya alcanzaste el maximo de 5 fechas de lote para este solver.");
        return current;
      }

      return [...current, { key: nextKey, lotDate: null, origin: "GV" }];
    });
  }

  function removeLotSlot(dateKey: SolverDateKey) {
    setLotSlots((current) => {
      if (current.length <= 1) {
        toast.error("Debe existir al menos una fecha de lote activa.");
        return current;
      }

      return current.filter((slot) => slot.key !== dateKey);
    });
    startTransition(() => {
      setAvailability((current) => current.map((row) => ({ ...row, [dateKey]: 0 })));
      markResultStale();
    });
  }

  function updateLotDate(dateKey: SolverDateKey, value: string) {
    setLotSlots((current) =>
      current.map((slot) => (slot.key === dateKey ? { ...slot, lotDate: value || null } : slot)),
    );
  }

  function updateLotSlotOrigin(dateKey: SolverDateKey, origin: PoscosechaClasificacionOrderOrigin) {
    setLotSlots((current) =>
      current.map((slot) => (slot.key === dateKey ? { ...slot, origin } : slot)),
    );
    markResultStale();
  }

  function updateOrderSlotRestriction(dateKey: SolverDateKey, restriction: PoscosechaClasificacionOrderOrigin | null) {
    setOrderSlots((current) =>
      current.map((slot) => (slot.key === dateKey ? { ...slot, restriction } : slot)),
    );
    markResultStale();
  }

  function updateOrderSlotRestrictionMode(dateKey: SolverDateKey, restrictionMode: "STRICT" | "SOFT") {
    setOrderSlots((current) =>
      current.map((slot) => (slot.key === dateKey ? { ...slot, restrictionMode } : slot)),
    );
    markResultStale();
  }

  function updateDraftLotDate(value: string) {
    setDraftLotSlot((current) => (current ? { ...current, lotDate: value || null } : current));
  }

  function updateDraftLotOrigin(origin: PoscosechaClasificacionOrderOrigin) {
    setDraftLotSlot((current) => (current ? { ...current, origin } : current));
  }

  function updateDraftOrderRestriction(restriction: PoscosechaClasificacionOrderOrigin | null) {
    setDraftOrderSlot((current) =>
      current
        ? {
            ...current,
            restriction,
            restrictionMode: restriction ? current.restrictionMode : "SOFT",
          }
        : current,
    );
  }

  function updateDraftOrderRestrictionMode(restrictionMode: "STRICT" | "SOFT") {
    setDraftOrderSlot((current) => (current ? { ...current, restrictionMode } : current));
  }

  function saveOrderDraft() {
    if (!draftOrderSlot || !activeEditingOrderSlot) {
      return;
    }

    setOrders(cloneOrderRows(draftOrderRows));
    setOrderSlots((current) =>
      current.map((slot) =>
        slot.key === activeEditingOrderSlot.key
          ? {
              ...slot,
              restriction: draftOrderSlot.restriction,
              restrictionMode: draftOrderSlot.restrictionMode,
            }
          : slot,
      ),
    );
    markResultStale();
    setEditingOrderSlotKey(null);
  }

  function saveLotDraft() {
    if (!draftLotSlot || !activeEditingLotSlot) {
      return;
    }

    setAvailability(cloneAvailabilityRows(draftLotRows));
    setLotSlots((current) =>
      current.map((slot) =>
        slot.key === activeEditingLotSlot.key
          ? {
              ...slot,
              lotDate: draftLotSlot.lotDate,
              origin: draftLotSlot.origin,
            }
          : slot,
      ),
    );
    markResultStale();
    setEditingLotSlotKey(null);
  }

  function saveWeightDraft() {
    setAvailability(cloneAvailabilityRows(draftWeightRows));
    markResultStale();
    setIsWeightEditorOpen(false);
  }

  function closeRecipeOverlay() {
    setSelectedRecipeSku(null);
    setRecipeData(null);
    setRecipeError(null);
    setIsRecipeLoading(false);
  }

  function openSkuInfo(skuId: string) {
    const skuRecord = skuMasterById.get(skuId);
    if (skuRecord) {
      setSelectedSkuInfo(skuRecord);
      setIsSkuEditing(false);
      setSkuFormValues(mapSkuRecordToFormValues(skuRecord));
      setSkuFormErrors({});
      return;
    }

    toast.error("No se encontro la ficha del SKU seleccionado.");
  }

  function closeSkuInfoOverlay() {
    setSelectedSkuInfo(null);
    setIsSkuEditing(false);
    setIsSkuSaving(false);
    setSkuFormErrors({});
  }

  function openSkuEditMode() {
    if (!selectedSkuInfo) {
      return;
    }
    setIsSkuEditing(true);
    setSkuFormValues(mapSkuRecordToFormValues(selectedSkuInfo));
    setSkuFormErrors({});
  }

  function cancelSkuEditMode() {
    if (selectedSkuInfo) {
      setSkuFormValues(mapSkuRecordToFormValues(selectedSkuInfo));
    }
    setIsSkuEditing(false);
    setSkuFormErrors({});
  }

  function updateSkuField<Key extends keyof PoscosechaSkuInput>(
    field: Key,
    value: PoscosechaSkuInput[Key],
  ) {
    setSkuFormValues((current) => ({
      ...current,
      [field]: value,
    }));
    setSkuFormErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  async function handleSkuSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedSkuInfo) {
      return;
    }

    const nextErrors = validateSkuForm(skuFormValues);
    setSkuFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error("Revisa los campos del SKU antes de guardar.");
      return;
    }

    setIsSkuSaving(true);

    try {
      const payload = buildSkuPayload(skuFormValues);
      const response = await fetchJson<PoscosechaSkuPayload>(
        `/api/postcosecha/administrar-maestros/skus/${encodeURIComponent(selectedSkuInfo.skuId)}`,
        "No se pudo actualizar el SKU.",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const updatedSku = response.data;

      setBootData((current) => ({
        ...current,
        skuMaster: current.skuMaster.map((item) => (item.skuId === updatedSku.skuId ? updatedSku : item)),
        ordersTemplate: current.ordersTemplate.map((item) =>
          item.skuId === updatedSku.skuId ? { ...item, sku: updatedSku.sku } : item,
        ),
      }));
      setOrders((current) =>
        current.map((item) => (item.skuId === updatedSku.skuId ? { ...item, sku: updatedSku.sku } : item)),
      );
      setSelectedSkuInfo(updatedSku);
      setSkuFormValues(mapSkuRecordToFormValues(updatedSku));
      setIsSkuEditing(false);
      markResultStale();
      toast.success("SKU actualizado correctamente desde el solver.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el SKU.");
    } finally {
      setIsSkuSaving(false);
    }
  }

  async function reloadBase() {
    setIsReloading(true);

    try {
      const nextData = await fetchJson<PoscosechaClasificacionBootData>(
        "/api/postcosecha/planificacion/solver/clasificacion-en-blanco",
        "No se pudo recargar la base del solver.",
      );

      applyBootData(nextData);
      toast.success("Base del solver recargada correctamente.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo recargar la base del solver.",
      );
    } finally {
      setIsReloading(false);
    }
  }

  function updateOrderValue(skuId: string, dateKey: SolverDateKey, value: string) {
    const nextValue = toInteger(value);

    startTransition(() => {
      setOrders((current) =>
        current.map((row) =>
          row.skuId === skuId
            ? { ...row, [dateKey]: nextValue }
            : row,
        ),
      );
      markResultStale();
    });
  }

  function updateDraftOrderValue(skuId: string, dateKey: SolverDateKey, value: string) {
    const nextValue = toInteger(value);
    setDraftOrderRows((current) =>
      current.map((row) =>
        row.skuId === skuId
          ? { ...row, [dateKey]: nextValue }
          : row,
      ),
    );
  }

  function updateAvailabilityDate(grado: number, dateKey: SolverDateKey, value: string) {
    const nextValue = toInteger(value);

    startTransition(() => {
      setAvailability((current) =>
        current.map((row) =>
          row.grado === grado
            ? { ...row, [dateKey]: nextValue }
            : row,
        ),
      );
      markResultStale();
    });
  }

  function updateDraftAvailabilityDate(grado: number, dateKey: SolverDateKey, value: string) {
    const nextValue = toInteger(value);
    setDraftLotRows((current) =>
      current.map((row) =>
        row.grado === grado
          ? { ...row, [dateKey]: nextValue }
          : row,
      ),
    );
  }

  function updateAvailabilityWeight(grado: number, value: string) {
    const nextValue = Math.round(toFloat(value) * 100) / 100;

    startTransition(() => {
      setAvailability((current) =>
        current.map((row) =>
          row.grado === grado
            ? { ...row, pesoTalloSeed: nextValue }
            : row,
        ),
      );
      markResultStale();
    });
  }

  function updateDraftAvailabilityWeight(grado: number, value: string) {
    const nextValue = Math.round(toFloat(value) * 100) / 100;
    setDraftWeightRows((current) =>
      current.map((row) =>
        row.grado === grado
          ? { ...row, pesoTalloSeed: nextValue }
          : row,
      ),
    );
  }

  function resetOrders() {
    setOrders(bootData.ordersTemplate);
    markResultStale();
  }

  function resetAvailability() {
    setAvailability(bootData.availabilityTemplate);
    setSettings(bootData.settings);
    markResultStale();
  }

  async function handleRunSolver() {
    setIsRunning(true);

    try {
      const payload = await fetchJson<PoscosechaClasificacionRunPayload>(
        "/api/postcosecha/planificacion/solver/clasificacion-en-blanco",
        "No se pudo ejecutar Clasificacion en blanco.",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orders,
            availability,
            orderSlots,
            lotSlots,
            settings,
          }),
        },
      );

      setResultBundle(payload.data);
      setActiveMode(payload.data.runs.find((run) => Boolean(run.result))?.mode ?? payload.data.runs[0]?.mode ?? null);
      setIsResultStale(false);
      toast.success("Clasificacion en blanco se resolvio correctamente.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo ejecutar Clasificacion en blanco.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  async function handleOpenRecipe(sku: string) {
    const orderRow = resultOrderRowsBySku.get(sku);
    const netStemValues = netStemValuesBySku.get(sku);

    if (!orderRow || !netStemValues) {
      toast.error("No se encontro el detalle del SKU para construir la receta.");
      return;
    }

    const payload = buildRecipeInput(orderRow, netStemValues, availability);

    if (!payload) {
      toast.error("El SKU seleccionado no tiene suficiente informacion para construir la receta.");
      return;
    }

    setSelectedRecipeSku(sku);
    setRecipeData(null);
    setRecipeError(null);
    setIsRecipeLoading(true);

    try {
      const response = await fetchJson<PoscosechaClasificacionRecipePayload>(
        "/api/postcosecha/planificacion/solver/clasificacion-en-blanco/receta",
        "No se pudo construir la receta del SKU.",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      setRecipeData(response.data);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "No se pudo construir la receta del SKU.";
      setRecipeError(message);
    } finally {
      setIsRecipeLoading(false);
    }
  }

  async function handleExportPdf() {
    if (!resultBundle?.runs.some((run) => Boolean(run.result))) {
      return;
    }

    setIsExportingPdf(true);

    try {
      const resolvedRuns = resultBundle.runs.filter((run) => Boolean(run.result));
      const runSections = await Promise.all(
        resolvedRuns.map(async (run) => {
          const runResult = run.result;
          if (!runResult) {
            return null;
          }

          const runOrderRowsBySku = new Map(runResult.orderRows.map((row) => [row.sku, row]));
          const runNetStemValuesBySku = new Map(runResult.netStemMatrix.rows.map((row) => [row.sku, row.values]));
          const resolvedRows = runResult.orderRows.filter((row) => row.pedidoResuelto > 0);

          const recipeResponses = await Promise.all(
            resolvedRows.map(async (row) => {
              const netStemValues = runNetStemValuesBySku.get(row.sku);
              if (!netStemValues) {
                return {
                  sku: row.sku,
                  data: null,
                  error: "No se encontro la matriz neta de tallos para este SKU.",
                };
              }

              const recipeInput = buildRecipeInput(row, netStemValues, availability);
              if (!recipeInput) {
                return {
                  sku: row.sku,
                  data: null,
                  error: "No hubo datos suficientes para construir la receta.",
                };
              }

              try {
                const response = await fetchJson<PoscosechaClasificacionRecipePayload>(
                  "/api/postcosecha/planificacion/solver/clasificacion-en-blanco/receta",
                  `No se pudo construir la receta de ${row.sku}.`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(recipeInput),
                  },
                );

                return {
                  sku: row.sku,
                  data: response.data,
                  error: null,
                };
              } catch (error) {
                return {
                  sku: row.sku,
                  data: null,
                  error: error instanceof Error ? error.message : "No se pudo construir la receta.",
                };
              }
            }),
          );

          return {
            run,
            runResult,
            runOrderRowsBySku,
            recipes: recipeResponses.filter((item): item is { sku: string; data: PoscosechaClasificacionRecipeResult; error: null } => Boolean(item.data)),
            omittedRecipes: recipeResponses.filter((item) => !item.data),
          };
        }),
      );

      const sections = runSections.filter((item): item is NonNullable<typeof item> => Boolean(item));
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      const usableWidth = pageWidth - margin * 2;
      let y = margin;

      const ensureSpace = (needed = 24) => {
        if (y + needed > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      const addLine = (text: string, opts?: { size?: number; bold?: boolean; muted?: boolean; indent?: number }) => {
        const size = opts?.size ?? 10;
        const indent = opts?.indent ?? 0;
        doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
        doc.setFontSize(size);
        doc.setTextColor(opts?.muted ? 107 : 17, opts?.muted ? 114 : 17, opts?.muted ? 128 : 24);
        const lines = doc.splitTextToSize(text, usableWidth - indent);
        ensureSpace(lines.length * (size + 3) + 4);
        doc.text(lines, margin + indent, y);
        y += lines.length * (size + 3) + 4;
      };

      const addRule = () => {
        ensureSpace(12);
        doc.setDrawColor(229, 231, 235);
        doc.line(margin, y, pageWidth - margin, y);
        y += 12;
      };

      const addSectionTitle = (text: string) => {
        ensureSpace(24);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(17, 24, 39);
        doc.text(text, margin, y);
        y += 18;
      };

      const addTable = (headers: string[], rows: string[][], widths: number[]) => {
        const rowHeight = 18;
        ensureSpace(rowHeight * 2);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(17, 24, 39);

        let x = margin;
        headers.forEach((header, index) => {
          doc.text(header, x + 4, y);
          x += widths[index] ?? 80;
        });
        y += rowHeight - 4;
        doc.setDrawColor(209, 213, 219);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        doc.setFont("helvetica", "normal");
        rows.forEach((row) => {
          const wrapped = row.map((cell, index) => doc.splitTextToSize(cell, (widths[index] ?? 80) - 8));
          const maxLines = Math.max(...wrapped.map((cell) => cell.length), 1);
          ensureSpace(maxLines * 11 + 8);
          let cellX = margin;
          wrapped.forEach((cell, index) => {
            doc.text(cell, cellX + 4, y);
            cellX += widths[index] ?? 80;
          });
          y += maxLines * 11 + 6;
          doc.setDrawColor(243, 244, 246);
          doc.line(margin, y, pageWidth - margin, y);
          y += 8;
        });
      };

      addLine("Clasificacion en blanco", { size: 18, bold: true });
      addLine("Orden de trabajo consolidada por origen resuelto", { muted: true });
      addLine(
        `Generado: ${new Date().toLocaleString("es-EC")} | Archivo: clasificacion_en_blanco_${buildTimestampLabel()}.pdf`,
        { muted: true },
      );
      addRule();

      addSectionTitle("Configuracion");
      orderSlotMeta.forEach((slot) => {
        addLine(
          `${slot.orderLabel}${slot.restriction ? ` | restr. ${slot.restriction} ${slot.restrictionMode === "STRICT" ? "estricta" : "suave"}` : ""}`,
          { size: 9 },
        );
      });
      lotSlotMeta.forEach((slot) => {
        addLine(`${slot.lotLabel} | ${slot.origin}`, { size: 9, muted: true });
      });

      addRule();
      addSectionTitle("Resumen ejecutivo");
      addLine(
        `${formatInteger(sections.length)} corrida(s) con resultado. El documento consolida la resolucion completa por origen, incluyendo ordenes resueltas y sus recetas.`,
        { size: 9, muted: true },
      );

      sections.forEach(({ run, runResult, recipes, omittedRecipes }) => {
        addRule();
        addSectionTitle(run.label);
        addLine(run.originScope, { size: 9, muted: true });
        addLine(
          `Cumplimiento macro: ${formatPercent(runResult.stage2Summary.cumplimiento_peso_macro ?? 0)} | Sobrepeso macro: ${formatPercent(runResult.stage2Summary.sobrepeso_pct_macro ?? 0)} | Peso real total: ${formatNumber(runResult.stage2Summary.peso_real_total ?? 0)} g`,
          { size: 9, muted: true },
        );

        addTable(
          ["SKU", "Estado", "Pedido", "Resuelto", "Peso ideal", "Peso real", "Sobrepeso"],
          runResult.orderRows
            .filter((row) => row.pedidoResuelto > 0)
            .map((row) => [
              row.sku,
              row.estadoPeso,
              formatInteger(row.pedidoTotal),
              formatInteger(row.pedidoResuelto),
              formatNumber(row.pesoIdealPedido),
              formatNumber(row.pesoRealTotal),
              formatPercent(row.sobrepesoPct),
            ]),
          [110, 90, 55, 60, 70, 70, 60],
        );

        addLine("Combinaciones de tallos por SKU resuelto", { size: 10, bold: true });
        if (recipes.length === 0) {
          addLine("No hubo recetas disponibles para esta corrida.", { muted: true });
        }

        recipes.forEach(({ sku, data }) => {
          addRule();
          addLine(sku, { size: 12, bold: true });
          addLine(
            `Bunches resueltos: ${formatInteger(data.summary.bunchesResueltos)} | Peso promedio real: ${formatNumber(data.summary.pesoPromedioReal)} g | Estado: ${data.summary.status}`,
            { size: 9, muted: true },
          );
          addTable(
            ["Receta", "Cant.", "Tallos", "Peso", "Dif.", "Estado"],
            data.rows.map((recipe) => [
              recipe.composicion.map((item) => `${item.grado}x${item.tallos}`).join(" + "),
              formatInteger(recipe.cantidad),
              formatInteger(recipe.tallosPorBunch),
              formatNumber(recipe.pesoPorBunch),
              formatNumber(recipe.difIdeal),
              recipe.estadoPeso,
            ]),
            [200, 45, 55, 55, 50, 95],
          );
        });

        if (omittedRecipes.length > 0) {
          addLine("SKUs sin receta exportada", { size: 10, bold: true });
          addTable(
            ["SKU", "Motivo"],
            omittedRecipes.map((item) => [item.sku, item.error ?? "Sin detalle"]),
            [140, usableWidth - 140],
          );
        }
      });

      const filename = `clasificacion_en_blanco_${buildTimestampLabel()}.pdf`;
      doc.save(filename);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo exportar el PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="starter-panel border-border/70 bg-card/84">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Gestion / Poscosecha / Planificacion / Solver
                </Badge>
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  Maestro SKU desde PostgreSQL
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {bootData.metadata.engine}
                </Badge>
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl">Clasificacion en blanco</CardTitle>
                <CardDescription className="max-w-4xl text-sm leading-relaxed">
                  Esta vista usa el maestro activo de SKU de postcosecha como fuente oficial y
                  ejecuta el solver real para resolver bunches por prioridad, mezcla de grados y
                  tabla final en mallas.
                </CardDescription>
              </div>
            </div>
            <div className="rounded-full bg-slate-900/10 p-4 text-slate-700 dark:bg-slate-900/20 dark:text-white">
              <BrainCircuit className="size-6" aria-hidden="true" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              label="SKU activos"
              value={formatInteger(bootData.skuMaster.length)}
              hint="Maestro vigente disponible para pedidos."
            />
            <SummaryTile
              label="SKU con captura"
              value={formatInteger(ordersWithCapture)}
              hint="Pedidos mayores a cero en esta corrida."
              tone={ordersWithCapture > 0 ? "positive" : "default"}
            />
            <SummaryTile
              label="Grados base"
              value={formatInteger(availability.length)}
              hint="Semillas iniciales para disponibilidad."
            />
            <SummaryTile
              label="Desperdicio"
              value={formatPercent(settings.desperdicio)}
              hint="Parametro global usado por el solver."
            />
            <SummaryTile
              label="Resolucion"
              value="3"
              hint="Matrices: GV, Apertura y Preclasificacion."
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                Origen maestro: <strong>{bootData.metadata.masterSource}</strong>
              </span>
              {bootData.metadata.workbookPath ? (
                <span>
                  Workbook semilla: <strong>{bootData.metadata.workbookPath}</strong>
                </span>
              ) : null}
              {bootData.metadata.usedFallbackDefaults ? (
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Semillas locales de respaldo
                </Badge>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void reloadBase()}
              disabled={isReloading}
            >
              {isReloading ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
              Recargar base
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="starter-panel border-border/70 bg-card/84">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <CardTitle className="text-lg">Pedidos por SKU</CardTitle>
                <CardDescription>
                  Captura manual de bunches por prioridad de orden. La base siempre nace desde el
                  maestro activo de SKU.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={addOrderSlot}>
                  <Plus className="size-4" />
                </Button>
                <Button type="button" variant="outline" onClick={resetOrders}>
                  <RotateCcw className="size-4" />
                  Limpiar pedidos
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-border/70 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span>Resolucion: <strong>GV / APERTURA / PRECLASIFICACION</strong></span>
                <span>Ordenes activas: <strong>{orderSlots.length}</strong></span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {orderSlotMeta.map((slot) => (
                  <Badge key={slot.key} variant="outline" className="rounded-full px-3 py-1">
                    {slot.orderLabel}{slot.restriction ? ` | restr. ${slot.restriction} ${slot.restrictionMode === "STRICT" ? "estricta" : "suave"}` : ""}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>{formatInteger(orderSlots.length)} ordenes configuradas.</span>
              <span>{formatInteger(ordersWithCapture)} SKU con pedido activo.</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {orderSlotMeta.map((slot) => (
                <div key={slot.key} className="rounded-[24px] border border-border/70 bg-background/80 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{slot.orderLabel}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {slot.restriction
                          ? `Restriccion ${slot.restriction.toLowerCase()} ${slot.restrictionMode === "STRICT" ? "estricta" : "suave"}`
                          : "Sin restriccion de origen"}
                      </p>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setEditingOrderSlotKey(slot.key)}>
                      Modificar
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <SummaryTile
                      label="Bunches"
                      value={formatInteger(slot.totalBunches)}
                      hint="Total cargado para esta orden."
                    />
                    <SummaryTile
                      label="SKU activos"
                      value={formatInteger(slot.activeSkus)}
                      hint="SKU con pedido mayor a cero."
                      tone={slot.activeSkus > 0 ? "positive" : "default"}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="starter-panel border-border/70 bg-card/84">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <CardTitle className="text-lg">Disponibilidad por grado</CardTitle>
                <CardDescription>
                  Captura manual de mallas por prioridad. El peso tallo seed se edita de forma global por grado.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setIsWeightEditorOpen(true)}>
                  <SlidersHorizontal className="size-4" />
                </Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={addLotSlot}>
                  <Plus className="size-4" />
                </Button>
                <Button type="button" variant="outline" onClick={resetAvailability}>
                  <RotateCcw className="size-4" />
                  Restaurar base
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
              <div className="space-y-2">
                <Label htmlFor="solver-desperdicio">Desperdicio</Label>
                <Input
                  id="solver-desperdicio"
                  type="number"
                  min={0}
                  max={0.95}
                  step={0.01}
                  value={settings.desperdicio}
                  onChange={(event) => {
                    setSettings((current) => ({
                      ...current,
                      desperdicio: Math.min(Math.max(toFloat(event.target.value), 0), 0.95),
                    }));
                    markResultStale();
                  }}
                />
              </div>
              <SummaryTile
                label="Grados con captura"
                value={formatInteger(gradesWithCapture)}
                hint="Filas con mallas mayores a cero."
                tone={gradesWithCapture > 0 ? "positive" : "default"}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {lotSlotMeta.map((slot) => (
                <div key={slot.key} className="rounded-[24px] border border-border/70 bg-background/80 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{slot.lotOrderLabel}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{slot.lotLabel}</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setEditingLotSlotKey(slot.key)}>
                      Modificar
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <SummaryTile
                      label="Mallas"
                      value={formatInteger(slot.totalMallas)}
                      hint="Total cargado en el lote."
                    />
                    <SummaryTile
                      label="Tallos netos"
                      value={formatInteger(slot.totalNetStems)}
                      hint="Estimado con desperdicio actual."
                      tone={slot.totalNetStems > 0 ? "positive" : "default"}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="starter-panel border-border/70 bg-card/84">
        <CardHeader className="space-y-2">
          <CardTitle className="text-lg">Validacion previa</CardTitle>
          <CardDescription>
            La holgura cruza pedidos por orden con disponibilidad administrada por lote, pero ambas capturas son independientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <SummaryTile
              label="Holgura flexible"
              value={formatInteger(flexiblePrecheck.diferencia)}
              hint={`${formatInteger(flexiblePrecheck.tallosPedidos)} pedidos flexibles vs ${formatInteger(flexiblePrecheck.tallosDisponibles)} disponibles`}
              tone={flexiblePrecheck.isValid ? "positive" : "warning"}
            />
            {precheckModes.map(({ mode, precheck }) => (
              <SummaryTile
                key={mode}
                label={`Holgura ${mode}`}
                value={formatInteger(precheck.diferencia)}
                hint={`${formatInteger(precheck.tallosPedidos)} pedidos vs ${formatInteger(precheck.tallosDisponibles)} disponibles`}
                tone={precheck.isValid ? "positive" : "warning"}
              />
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              label="Peso tallo disponible"
              value={`${formatNumber(estimatedWeightKpis.availableAvgStemWeight, 2)} g`}
              hint="Promedio ponderado segun disponibilidad actual."
            />
            <SummaryTile
              label="Peso tallo requerido"
              value={`${formatNumber(estimatedWeightKpis.requiredAvgStemWeight, 2)} g`}
              hint="Referencia teorica segun peso ideal y tallos min."
            />
            <SummaryTile
              label="Sobrepeso esperado"
              value={formatPercent(estimatedWeightKpis.expectedOverweightPct)}
              hint="Escenario macro sin optimizacion fina del solver."
              tone={(estimatedWeightKpis.expectedOverweightPct ?? 0) > 0 ? "warning" : "positive"}
            />
            <SummaryTile
              label="Eficiencia estimada"
              value={formatPercent(estimatedWeightKpis.expectedEfficiencyPct)}
              hint="Ajuste ideal/requerido frente al tallo disponible."
              tone={(estimatedWeightKpis.expectedEfficiencyPct ?? 0) >= 1 ? "positive" : "default"}
            />
          </div>
          <div className="space-y-2">
            <div
              className={cn(
                "rounded-[24px] border px-4 py-4 text-sm",
                flexiblePrecheck.isValid
                  ? "border-chart-success-bold/40 bg-chart-success-bold/10"
                  : "border-slate-400/40 bg-slate-400/10",
              )}
            >
              <strong>Flexible:</strong> {flexiblePrecheck.message}
            </div>
            {precheckModes.map(({ mode, precheck }) => (
              <div
                key={mode}
                className={cn(
                  "rounded-[24px] border px-4 py-4 text-sm",
                  precheck.isValid
                    ? "border-chart-success-bold/40 bg-chart-success-bold/10"
                    : "border-slate-400/40 bg-slate-400/10",
                )}
              >
                <strong>{mode}:</strong> {precheck.message}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              El solver prioriza Orden 1, luego Orden 2 y asi sucesivamente. Dentro de cada orden,
              respeta la restriccion de origen contra la disponibilidad capturada por lote.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={clearResults} disabled={!resultBundle}>
                <TableProperties className="size-4" />
                Limpiar resultados
              </Button>
              <Button type="button" variant="outline" onClick={() => void handleExportPdf()} disabled={!result || isExportingPdf}>
                {isExportingPdf ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
                Exportar PDF
              </Button>
              <Button
                type="button"
                onClick={() => void handleRunSolver()}
                disabled={!precheckModes.some((item) => item.precheck.isValid) || isRunning}
              >
                {isRunning ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}
                Resolver modelo unificado
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeEditingOrderSlot ? (
        <FloatingPanel
          title={`Capturar ${activeEditingOrderSlot.orderLabel}`}
          description="Aqui puedes ajustar la configuracion de la orden y cargar los SKU correspondientes."
          onClose={() => setEditingOrderSlotKey(null)}
        >
          <div className="space-y-4">
            <div className="rounded-[24px] border border-border/70 bg-background/70 px-4 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Restriccion de optimizacion</Label>
                  <div className="grid gap-2 md:grid-cols-2">
                    {ORDER_RESTRICTION_OPTIONS.map((option) => (
                      <button
                        key={`edit-order-restriction-${activeEditingOrderSlot.key}-${option.value ?? "none"}`}
                        type="button"
                        className={cn(
                          "rounded-[18px] border px-4 py-3 text-left transition",
                          draftOrderSlot?.restriction === option.value
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-border/70 bg-card/80 hover:border-slate-400",
                        )}
                        onClick={() => updateDraftOrderRestriction(option.value)}
                      >
                        <span className="block text-sm font-semibold">{option.label}</span>
                        <span className={cn("mt-1 block text-xs", draftOrderSlot?.restriction === option.value ? "text-white/80" : "text-muted-foreground")}>
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                {draftOrderSlot?.restriction ? (
                  <div className="space-y-2">
                    <Label>Tipo de restriccion</Label>
                    <div className="grid gap-2 md:grid-cols-2">
                      {[
                        {
                          value: "SOFT" as const,
                          label: "Suave",
                          description: "Permite completar la orden con otros origenes si hace falta.",
                        },
                        {
                          value: "STRICT" as const,
                          label: "Estricta",
                          description: "La orden solo puede resolverse con el origen seleccionado.",
                        },
                      ].map((option) => (
                        <button
                          key={`edit-order-mode-${activeEditingOrderSlot.key}-${option.value}`}
                          type="button"
                          className={cn(
                            "rounded-[18px] border px-4 py-3 text-left transition",
                            draftOrderSlot?.restrictionMode === option.value
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-border/70 bg-card/80 hover:border-slate-400",
                          )}
                          onClick={() => updateDraftOrderRestrictionMode(option.value)}
                        >
                          <span className="block text-sm font-semibold">{option.label}</span>
                          <span className={cn("mt-1 block text-xs", draftOrderSlot?.restrictionMode === option.value ? "text-white/80" : "text-muted-foreground")}>
                            {option.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="solver-sku-search">Buscar SKU</Label>
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="solver-sku-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Filtra por nombre de SKU"
                  className="pl-9"
                />
              </div>
            </div>
            <OrderSlotCaptureTable
              rows={draftOrderRows.filter((row) => {
                const normalized = deferredSearch.trim().toLowerCase();
                return !normalized || row.sku.toLowerCase().includes(normalized);
              })}
              slotKey={activeEditingOrderSlot.key}
              slotLabel={activeEditingOrderSlot.orderLabel}
              idealBySkuId={skuIdealById}
              onChange={updateDraftOrderValue}
              onOpenSku={openSkuInfo}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingOrderSlotKey(null)}>
                Cerrar
              </Button>
              <Button type="button" onClick={saveOrderDraft}>
                Guardar
              </Button>
            </div>
          </div>
        </FloatingPanel>
      ) : null}

      {activeEditingLotSlot ? (
        <FloatingPanel
          title={`Capturar ${activeEditingLotSlot.lotOrderLabel}`}
          description="Aqui puedes ajustar la configuracion del lote y cargar sus mallas."
          onClose={() => setEditingLotSlotKey(null)}
        >
          <div className="space-y-4">
            <div className="rounded-[24px] border border-border/70 bg-background/70 px-4 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`editing-lot-date-${activeEditingLotSlot.key}`}>Fecha del lote</Label>
                  <Input
                    id={`editing-lot-date-${activeEditingLotSlot.key}`}
                    type="date"
                    value={draftLotSlot?.lotDate ?? ""}
                    onChange={(event) => updateDraftLotDate(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Origen del lote</Label>
                  <div className="grid gap-2 md:grid-cols-3">
                    {ORDER_ORIGIN_OPTIONS.map((option) => (
                      <button
                        key={`edit-lot-origin-${activeEditingLotSlot.key}-${option.value}`}
                        type="button"
                        className={cn(
                          "rounded-[18px] border px-4 py-3 text-left transition",
                          draftLotSlot?.origin === option.value
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-border/70 bg-card/80 hover:border-slate-400",
                        )}
                        onClick={() => updateDraftLotOrigin(option.value)}
                      >
                        <span className="block text-sm font-semibold">{option.label}</span>
                        <span className={cn("mt-1 block text-xs", draftLotSlot?.origin === option.value ? "text-white/80" : "text-muted-foreground")}>
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <LotSlotCaptureTable
              rows={draftLotRows}
              slotKey={activeEditingLotSlot.key}
              slotLabel={draftLotSlot ? getAvailabilityLabel(draftLotSlot.origin, draftLotSlot.lotDate ?? "") : activeEditingLotSlot.lotLabel}
              onDateChange={updateDraftAvailabilityDate}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingLotSlotKey(null)}>
                Cerrar
              </Button>
              <Button type="button" onClick={saveLotDraft}>
                Guardar
              </Button>
            </div>
          </div>
        </FloatingPanel>
      ) : null}

      {isWeightEditorOpen ? (
        <FloatingPanel
          title="Editar peso tallo seed"
          description="Aqui ajustas el peso tallo seed global por grado. Este cambio aplica a todos los lotes."
          onClose={() => setIsWeightEditorOpen(false)}
        >
          <div className="space-y-4">
            <AvailabilityWeightEditor
              rows={draftWeightRows}
              onWeightChange={updateDraftAvailabilityWeight}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsWeightEditorOpen(false)}>
                Cerrar
              </Button>
              <Button type="button" onClick={saveWeightDraft}>
                Guardar
              </Button>
            </div>
          </div>
        </FloatingPanel>
      ) : null}

      {result ? (
        <>
          {resultBundle ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {resultBundle.runs.map((run) => (
                <button
                  key={run.mode}
                  type="button"
                  className={cn(
                    "rounded-[24px] border px-4 py-4 text-left transition",
                    activeRun?.mode === run.mode
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-border/70 bg-card/80 hover:border-slate-400",
                  )}
                  onClick={() => setActiveMode(run.mode)}
                >
                  <p className="text-xs uppercase tracking-[0.24em]">{run.label}</p>
                  <p className="mt-2 text-lg font-semibold">
                    {run.result ? formatPercent(run.result.stage2Summary.sobrepeso_pct_macro ?? 0) : "Sin corrida"}
                  </p>
                  <p className={cn("mt-2 text-xs", activeRun?.mode === run.mode ? "text-white/80" : "text-muted-foreground")}>
                    {run.originScope}
                  </p>
                </button>
              ))}
            </div>
          ) : null}

          {activeRun ? (
            <div className="rounded-[24px] border border-border/70 bg-background/60 px-4 py-4 text-sm text-muted-foreground">
              <strong className="text-foreground">Corrida activa:</strong> {activeRun.label}. {activeRun.originScope}.{" "}
              {activeRun.precheck.isValid
                ? "La holgura de esta corrida permitio ejecutar el solver."
                : "Esta corrida no fue ejecutable por su holgura actual."}
            </div>
          ) : null}

          {resultBundle && isResultStale ? (
            <div className="rounded-[24px] border border-amber-300/70 bg-amber-50/80 px-4 py-4 text-sm text-amber-950">
              Estas viendo la ultima corrida disponible. La configuracion cambio despues de resolver, asi que los
              resultados quedan como referencia hasta que vuelvas a ejecutar `Resolver modelo unificado`.
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              label="Peso disponible"
              value={formatNumber(result.stage2Summary.peso_disponible_total ?? 0)}
              hint="Gestionable segun tallos netos y peso seed."
            />
            <SummaryTile
              label="Peso ideal pedido"
              value={formatNumber(result.stage2Summary.peso_ideal_pedido_total ?? 0)}
              hint="Referencia total del pedido capturado."
            />
            <SummaryTile
              label="Peso ideal resuelto"
              value={formatNumber(result.stage2Summary.peso_ideal_resuelto_total ?? 0)}
              hint="Solo sobre bunches finalmente resueltos."
            />
            <SummaryTile
              label="Peso real final"
              value={formatNumber(result.stage2Summary.peso_real_total ?? 0)}
              hint={`Delta vs ideal: ${formatNumber(result.stage2Summary.sobrepeso_real_vs_ideal ?? 0)}`}
              tone="positive"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              label="Bunches pedidos"
              value={formatInteger(result.stage1Summary.pedido_bunches_total ?? 0)}
              hint="Demanda total capturada."
            />
            <SummaryTile
              label="Bunches resueltos"
              value={formatInteger(result.stage1Summary.pedido_bunches_resuelto ?? 0)}
              hint="Salida efectiva del solver."
              tone="positive"
            />
            <SummaryTile
              label="No realizados"
              value={formatInteger(result.stage1Summary.ajuste_bunches_total ?? 0)}
              hint="Pedido que no pudo resolverse."
            />
            <SummaryTile
              label="Sobrepeso macro"
              value={formatPercent(result.stage2Summary.sobrepeso_pct_macro ?? 0)}
              hint={`Status: ${String(result.solverMeta.status ?? "n/a")}`}
            />
          </div>

          <SimpleTableCard
            title="Prioridad de cumplimiento por orden"
            description={`Secuencia de la etapa interna de resolucion de pedidos para la corrida ${activeRun?.label ?? "-"}.`}
            table={(
              <div className="overflow-x-auto rounded-[24px] border border-border/70">
                <table className="min-w-[720px] w-full text-sm">
                  <thead className="bg-background/95">
                    <tr className="border-b border-border/70 text-left">
                      <th className="px-4 py-3 font-medium">Prioridad</th>
                      <th className="px-4 py-3 font-medium">Orden</th>
                      <th className="px-4 py-3 text-right font-medium">Pedido</th>
                      <th className="px-4 py-3 text-right font-medium">Resuelto</th>
                      <th className="px-4 py-3 text-right font-medium">No realizado</th>
                      <th className="px-4 py-3 text-right font-medium">Cumplimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.priorityRows.map((row) => (
                      <tr key={row.prioridad} className="border-b border-border/50 last:border-b-0">
                        <td className="px-4 py-3">{row.prioridad}</td>
                        <td className="px-4 py-3 font-medium">{getOrderLabel(Math.max(row.prioridad - 1, 0))}</td>
                        <td className="px-4 py-3 text-right">{formatInteger(row.pedido)}</td>
                        <td className="px-4 py-3 text-right">{formatInteger(row.resuelto)}</td>
                        <td className="px-4 py-3 text-right">{formatInteger(row.noRealizado)}</td>
                        <td className="px-4 py-3 text-right">{formatPercent(row.cumplimiento)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          />

          <SimpleTableCard
            title="Resumen por pedido"
            description={`Lectura por SKU del resultado final para ${activeRun?.label ?? "-"}. Haz click en un SKU resuelto para ver su receta.`}
            table={(
              <div className="overflow-x-auto rounded-[24px] border border-border/70">
                <table className="min-w-[1620px] w-full text-sm">
                  <thead className="bg-background/95">
                    <tr className="border-b border-border/70 text-left">
                      <th className="px-4 py-3 font-medium">SKU</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 text-right font-medium">Pedido</th>
                      <th className="px-4 py-3 text-right font-medium">Resuelto</th>
                      <th className="px-4 py-3 text-right font-medium">Ajuste</th>
                      <th className="px-4 py-3 text-right font-medium">Cumplimiento</th>
                      <th className="px-4 py-3 text-right font-medium">Peso ideal pedido</th>
                      <th className="px-4 py-3 text-right font-medium">Peso ideal resuelto</th>
                      <th className="px-4 py-3 text-right font-medium">Peso real total</th>
                      <th className="px-4 py-3 text-right font-medium">Peso real bunch</th>
                      <th className="px-4 py-3 text-right font-medium">Rango objetivo</th>
                      <th className="px-4 py-3 text-right font-medium">Sobrepeso %</th>
                      <th className="px-4 py-3 text-right font-medium">Mallas</th>
                      <th className="px-4 py-3 text-right font-medium">Grados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.orderRows.map((row) => {
                      const canOpenRecipe = row.pedidoResuelto > 0 && netStemValuesBySku.has(row.sku);

                      return (
                        <tr key={row.sku} className="border-b border-border/50 last:border-b-0">
                          <td className="px-4 py-3 font-medium">
                            {canOpenRecipe ? (
                              <button
                                type="button"
                                className="text-left text-foreground transition hover:text-slate-700 hover:underline"
                                onClick={() => void handleOpenRecipe(row.sku)}
                              >
                                <span className="block">{row.sku}</span>
                                <span className="block text-xs font-normal text-muted-foreground">
                                  Ver receta
                                </span>
                              </button>
                            ) : (
                              row.sku
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <ResultStatusBadge status={row.estadoPeso} />
                          </td>
                          <td className="px-4 py-3 text-right">{formatInteger(row.pedidoTotal)}</td>
                          <td className="px-4 py-3 text-right">{formatInteger(row.pedidoResuelto)}</td>
                          <td className="px-4 py-3 text-right">{formatInteger(row.ajusteBunches)}</td>
                          <td className="px-4 py-3 text-right">{formatPercent(row.cumplimientoBunches)}</td>
                          <td className="px-4 py-3 text-right">{formatNumber(row.pesoIdealPedido)}</td>
                          <td className="px-4 py-3 text-right">{formatNumber(row.pesoIdealResuelto)}</td>
                          <td className="px-4 py-3 text-right">{formatNumber(row.pesoRealTotal)}</td>
                          <td className="px-4 py-3 text-right">{formatNumber(row.pesoRealBunch)}</td>
                          <td className="px-4 py-3 text-right">
                            {formatNumber(row.pesoMinObjetivo)} / {formatNumber(row.pesoMaxObjetivo)}
                          </td>
                          <td className="px-4 py-3 text-right">{formatPercent(row.sobrepesoPct)}</td>
                          <td className="px-4 py-3 text-right">{formatNumber(row.mallasTotales)}</td>
                          <td className="px-4 py-3 text-right">{formatInteger(row.gradosUsados)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          />

          <SimpleTableCard
            title="Tabla final en mallas"
            description={`Matriz SKU por grado de la corrida ${activeRun?.label ?? "-"}. Tambien puedes abrir la receta desde cada SKU.`}
            table={(
              <div className="overflow-x-auto rounded-[24px] border border-border/70">
                <table className="min-w-[960px] w-full text-sm">
                  <thead className="bg-background/95">
                    <tr className="border-b border-border/70 text-left">
                      <th className="px-4 py-3 font-medium">SKU</th>
                      {result.matrix.gradeLabels.map((gradeLabel) => (
                        <th key={gradeLabel} className="px-4 py-3 text-right font-medium">
                          {gradeLabel}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.matrix.rows.map((row) => {
                      const canOpenRecipe = (resultOrderRowsBySku.get(row.sku)?.pedidoResuelto ?? 0) > 0
                        && netStemValuesBySku.has(row.sku);

                      return (
                        <tr key={row.sku} className="border-b border-border/50 last:border-b-0">
                          <td className="px-4 py-3 font-medium">
                            {canOpenRecipe ? (
                              <button
                                type="button"
                                className="text-left text-foreground transition hover:text-slate-700 hover:underline"
                                onClick={() => void handleOpenRecipe(row.sku)}
                              >
                                <span className="block">{row.sku}</span>
                                <span className="block text-xs font-normal text-muted-foreground">
                                  Ver receta
                                </span>
                              </button>
                            ) : (
                              row.sku
                            )}
                          </td>
                          {result.matrix.gradeLabels.map((gradeLabel) => (
                            <td key={`${row.sku}-${gradeLabel}`} className="px-4 py-3 text-right">
                              {formatInteger(row.values[String(gradeLabel)] ?? 0)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right font-semibold">{formatInteger(row.total)}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-background/70 font-semibold">
                      <td className="px-4 py-3">TOTAL</td>
                      {result.matrix.gradeLabels.map((gradeLabel) => (
                        <td key={`total-${gradeLabel}`} className="px-4 py-3 text-right">
                          {formatInteger(result.matrix.totals[String(gradeLabel)] ?? 0)}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">{formatInteger(result.matrix.grandTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          />

          <SimpleTableCard
            title="Disponibilidad final por grado"
            description={`Lectura de consumo, remanente y peso gestionable despues de la corrida ${activeRun?.label ?? "-"}.`}
            table={(
              <div className="overflow-x-auto rounded-[24px] border border-border/70">
                <table className="min-w-[1240px] w-full text-sm">
                  <thead className="bg-background/95">
                    <tr className="border-b border-border/70 text-left">
                      <th className="px-4 py-3 font-medium">Grado</th>
                      <th className="px-4 py-3 text-right font-medium">Peso seed</th>
                      <th className="px-4 py-3 text-right font-medium">Tallos brutos</th>
                      <th className="px-4 py-3 text-right font-medium">Tallos netos</th>
                      <th className="px-4 py-3 text-right font-medium">Usados netos</th>
                      <th className="px-4 py-3 text-right font-medium">Restantes netos</th>
                      <th className="px-4 py-3 text-right font-medium">Peso disponible</th>
                      <th className="px-4 py-3 text-right font-medium">Peso usado</th>
                      <th className="px-4 py-3 text-right font-medium">Peso restante</th>
                      <th className="px-4 py-3 text-right font-medium">Mallas usadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.availabilityRows.map((row) => (
                      <tr key={row.grado} className="border-b border-border/50 last:border-b-0">
                        <td className="px-4 py-3 font-medium">{row.grado}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(row.pesoTalloSeed)}</td>
                        <td className="px-4 py-3 text-right">{formatInteger(row.tallosBrutos)}</td>
                        <td className="px-4 py-3 text-right">{formatInteger(row.tallosNetos)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(row.tallosUsadosNetos)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(row.tallosRestantesNetos)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(row.pesoTotalGestionable)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(row.pesoUsado)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(row.pesoRestante)}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(row.mallasUsadas)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          />
        </>
      ) : null}

      {selectedRecipeSku ? (
        <PoscosechaClasificacionRecipeOverlay
          sku={selectedRecipeSku}
          data={recipeData}
          isLoading={isRecipeLoading}
          error={recipeError}
          onClose={closeRecipeOverlay}
        />
      ) : null}

      <SkuInfoOverlay
        row={selectedSkuInfo}
        isEditing={isSkuEditing}
        isSaving={isSkuSaving}
        formValues={skuFormValues}
        formErrors={skuFormErrors}
        onEdit={openSkuEditMode}
        onCancelEdit={cancelSkuEditMode}
        onFieldChange={updateSkuField}
        onSubmit={handleSkuSave}
        onClose={closeSkuInfoOverlay}
      />
    </div>
  );
}
