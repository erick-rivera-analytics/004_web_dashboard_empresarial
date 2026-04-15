"use client";

import { startTransition, type ReactNode, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  BrainCircuit,
  CalendarDays,
  Download,
  LoaderCircle,
  Play,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  Settings2,
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
  PoscosechaClasificacionOrderRow,
  PoscosechaClasificacionRecipeInput,
  PoscosechaClasificacionRecipePayload,
  PoscosechaClasificacionRecipeResult,
  PoscosechaClasificacionResult,
  PoscosechaClasificacionResultOrderRow,
  PoscosechaClasificacionRunPayload,
  SolverDateKey,
} from "@/lib/postcosecha-clasificacion-en-blanco-types";
import { SOLVER_DATE_KEYS } from "@/lib/postcosecha-clasificacion-en-blanco-types";
import { cn } from "@/lib/utils";

type PoscosechaClasificacionEnBlancoExplorerProps = {
  initialData: PoscosechaClasificacionBootData;
  initialError?: string | null;
};

type SolverProcess = "GV" | "PRECLASIFICACION" | "APERTURA";

type SolverDateSlot = {
  key: SolverDateKey;
  origin: SolverProcess;
};

type SolverLotDates = Partial<Record<SolverDateKey, string>>;

const PROCESS_OPTIONS: Array<{
  value: SolverProcess;
  label: string;
  description: string;
}> = [
  {
    value: "GV",
    label: "GV",
    description: "Resolver clasificacion en blanco para gestion de valor.",
  },
  {
    value: "PRECLASIFICACION",
    label: "PRECLASIFICACION",
    description: "Resolver para una corrida de preclasificacion.",
  },
  {
    value: "APERTURA",
    label: "APERTURA",
    description: "Resolver para una corrida de apertura.",
  },
];

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
    return "Sin fecha de lote";
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

function buildInitialDateSlots(
  ordersTemplate: PoscosechaClasificacionOrderRow[],
  availabilityTemplate: PoscosechaClasificacionAvailabilityRow[],
): SolverDateSlot[] {
  const activeKeys = SOLVER_DATE_KEYS.filter((key) => {
    const hasOrders = ordersTemplate.some((row) => toInteger(row[key]) > 0);
    const hasAvailability = availabilityTemplate.some((row) => toInteger(row[key]) > 0);
    return hasOrders || hasAvailability;
  });

  const keys = activeKeys.length > 0 ? activeKeys : [SOLVER_DATE_KEYS[0]];
  return keys.map((key) => ({ key, origin: "GV" }));
}

function getOrderLabel(index: number) {
  return `Orden ${index + 1}`;
}

function getAvailabilityLabel(index: number, loteFecha: string) {
  return `${getOrderLabel(index)}${loteFecha ? ` · lote ${formatShortDate(loteFecha)}` : " · sin fecha de lote"}`;
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
          <Button type="button" variant="ghost" className="rounded-full" onClick={onClose}>
            Cerrar
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
  dateSlots,
}: {
  rows: PoscosechaClasificacionOrderRow[];
  onChange: (skuId: string, dateKey: SolverDateKey, value: string) => void;
  onOpenSku: (skuId: string) => void;
  dateSlots: SolverDateSlot[];
}) {
  return (
    <div className="max-h-[600px] overflow-auto rounded-[24px] border border-border/70">
      <table className="min-w-[720px] w-full text-sm">
        <thead className="sticky top-0 bg-background/95 backdrop-blur">
          <tr className="border-b border-border/70 text-left">
            <th className="px-4 py-3 font-medium">SKU</th>
            {dateSlots.map((slot, index) => (
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
              {dateSlots.map((slot) => (
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
  dateSlots,
  lotDates,
}: {
  rows: PoscosechaClasificacionAvailabilityRow[];
  desperdicio: number;
  onDateChange: (grado: number, dateKey: SolverDateKey, value: string) => void;
  onWeightChange: (grado: number, value: string) => void;
  dateSlots: SolverDateSlot[];
  lotDates: SolverLotDates;
}) {
  const derivedRows = buildClasificacionAvailabilityDerived(rows, desperdicio);
  const derivedByGrade = new Map(derivedRows.map((row) => [row.grado, row]));

  return (
    <div className="max-h-[600px] overflow-auto rounded-[24px] border border-border/70">
      <table className="min-w-[860px] w-full text-sm">
        <thead className="sticky top-0 bg-background/95 backdrop-blur">
          <tr className="border-b border-border/70 text-left">
            <th className="px-4 py-3 font-medium">Grado</th>
            {dateSlots.map((slot, index) => (
              <th key={slot.key} className="px-3 py-3 text-center font-medium">
                {getAvailabilityLabel(index, lotDates[slot.key] ?? "")}
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
                {dateSlots.map((slot) => (
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
  const initialDateSlots = useMemo(
    () => buildInitialDateSlots(initialData.ordersTemplate, initialData.availabilityTemplate),
    [initialData.availabilityTemplate, initialData.ordersTemplate],
  );
  const [bootData, setBootData] = useState(initialData);
  const [orders, setOrders] = useState(initialData.ordersTemplate);
  const [availability, setAvailability] = useState(initialData.availabilityTemplate);
  const [settings, setSettings] = useState(initialData.settings);
  const [dateSlots, setDateSlots] = useState<SolverDateSlot[]>(initialDateSlots);
  const [lotDates, setLotDates] = useState<SolverLotDates>({});
  const [result, setResult] = useState<PoscosechaClasificacionResult | null>(null);
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
  const [isOrdersManagerOpen, setIsOrdersManagerOpen] = useState(false);
  const [isLotDatesOpen, setIsLotDatesOpen] = useState(false);
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

  const precheck = useMemo(
    () => buildClasificacionPrecheck(orders, availability, bootData.skuMaster, settings.desperdicio),
    [availability, bootData.skuMaster, orders, settings.desperdicio],
  );

  const ordersWithCapture = useMemo(
    () => orders.filter((row) => orderTotal(row) > 0).length,
    [orders],
  );

  const gradesWithCapture = useMemo(
    () => availabilityDerived.filter((row) => row.mallasTotales > 0).length,
    [availabilityDerived],
  );

  const resultOrderRowsBySku = useMemo(
    () => new Map((result?.orderRows ?? []).map((row) => [row.sku, row])),
    [result],
  );

  const dateSlotMeta = useMemo(
    () =>
      dateSlots.map((slot, index) => ({
        ...slot,
        orderLabel: getOrderLabel(index),
        availabilityLabel: getAvailabilityLabel(index, lotDates[slot.key] ?? ""),
      })),
    [dateSlots, lotDates],
  );

  const skuMasterById = useMemo(
    () => new Map(bootData.skuMaster.map((row) => [row.skuId, row])),
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

  function applyBootData(nextData: PoscosechaClasificacionBootData) {
    setBootData(nextData);
    setOrders(nextData.ordersTemplate);
    setAvailability(nextData.availabilityTemplate);
    setSettings(nextData.settings);
    setDateSlots((current) => (current.length ? current : buildInitialDateSlots(nextData.ordersTemplate, nextData.availabilityTemplate)));
    setResult(null);
  }

  function addDateSlot() {
    setDateSlots((current) => {
      const usedKeys = new Set(current.map((slot) => slot.key));
      const nextKey = SOLVER_DATE_KEYS.find((key) => !usedKeys.has(key));

      if (!nextKey) {
        toast.error("Ya alcanzaste el maximo de 5 prioridades para este solver.");
        return current;
      }

      return [...current, { key: nextKey, origin: "GV" }];
    });
  }

  function removeDateSlot(dateKey: SolverDateKey) {
    setDateSlots((current) => {
      if (current.length <= 1) {
        toast.error("Debe existir al menos una prioridad activa.");
        return current;
      }

      return current.filter((slot) => slot.key !== dateKey);
    });
    setLotDates((current) => {
      const next = { ...current };
      delete next[dateKey];
      return next;
    });

    startTransition(() => {
      setOrders((current) => current.map((row) => ({ ...row, [dateKey]: 0 })));
      setAvailability((current) => current.map((row) => ({ ...row, [dateKey]: 0 })));
      setResult(null);
    });
  }

  function updateLotDate(dateKey: SolverDateKey, value: string) {
    setLotDates((current) => ({
      ...current,
      [dateKey]: value,
    }));
  }

  function updateDateSlotOrigin(dateKey: SolverDateKey, origin: SolverProcess) {
    setDateSlots((current) =>
      current.map((slot) => (slot.key === dateKey ? { ...slot, origin } : slot)),
    );
    setResult(null);
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
      setResult(null);
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
      setResult(null);
    });
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
      setResult(null);
    });
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
      setResult(null);
    });
  }

  function resetOrders() {
    setOrders(bootData.ordersTemplate);
    setResult(null);
  }

  function resetAvailability() {
    setAvailability(bootData.availabilityTemplate);
    setSettings(bootData.settings);
    setResult(null);
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
            settings,
          }),
        },
      );

      setResult(payload.data);
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
    if (!result) {
      return;
    }

    setIsExportingPdf(true);

    try {
      const resolvedRows = result.orderRows.filter((row) => row.pedidoResuelto > 0);
      const recipeResponses = await Promise.all(
        resolvedRows.map(async (row) => {
          const netStemValues = netStemValuesBySku.get(row.sku);
          if (!netStemValues) {
            return null;
          }

          const recipeInput = buildRecipeInput(row, netStemValues, availability);
          if (!recipeInput) {
            return null;
          }

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
          };
        }),
      );

      const recipes = recipeResponses.filter((item): item is { sku: string; data: PoscosechaClasificacionRecipeResult } => Boolean(item));
      const popup = window.open("", "_blank", "width=1200,height=900");

      if (!popup) {
        throw new Error("No se pudo abrir la vista de impresion para exportar el PDF.");
      }

      const summaryRowsHtml = result.orderRows
        .map(
          (row) => `
            <tr>
              <td>${row.sku}</td>
              <td>${row.estadoPeso}</td>
              <td class="num">${formatInteger(row.pedidoTotal)}</td>
              <td class="num">${formatInteger(row.pedidoResuelto)}</td>
              <td class="num">${formatNumber(row.pesoIdealPedido)}</td>
              <td class="num">${formatNumber(row.pesoRealTotal)}</td>
              <td class="num">${formatPercent(row.sobrepesoPct)}</td>
            </tr>`,
        )
        .join("");

      const recipeSectionsHtml = recipes
        .map(
          ({ sku, data }) => `
            <section class="recipe-block">
              <h3>${sku}</h3>
              <p class="muted">
                Bunches resueltos: ${formatInteger(data.summary.bunchesResueltos)} |
                Peso promedio real: ${formatNumber(data.summary.pesoPromedioReal)} g |
                Estado: ${data.summary.status}
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Receta</th>
                    <th class="num">Cantidad</th>
                    <th class="num">Tallos/bunch</th>
                    <th class="num">Peso/bunch</th>
                    <th class="num">Dif. ideal</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.rows
                    .map(
                      (recipe) => `
                        <tr>
                          <td>${recipe.composicion.map((item) => `${item.grado}x${item.tallos}`).join(" + ")}</td>
                          <td class="num">${formatInteger(recipe.cantidad)}</td>
                          <td class="num">${formatInteger(recipe.tallosPorBunch)}</td>
                          <td class="num">${formatNumber(recipe.pesoPorBunch)}</td>
                          <td class="num">${formatNumber(recipe.difIdeal)}</td>
                          <td>${recipe.estadoPeso}</td>
                        </tr>`,
                    )
                    .join("")}
                </tbody>
              </table>
            </section>`,
        )
        .join("");

      popup.document.write(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <title>Clasificacion en blanco</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
              h1, h2, h3 { margin: 0 0 12px; }
              .muted { color: #6b7280; margin-bottom: 16px; }
              .pill { display: inline-block; border: 1px solid #d1d5db; border-radius: 999px; padding: 6px 12px; margin-right: 8px; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              th, td { border: 1px solid #e5e7eb; padding: 8px 10px; font-size: 12px; vertical-align: top; }
              th { background: #f8fafc; text-align: left; }
              .num { text-align: right; }
              .recipe-block { margin-top: 24px; page-break-inside: avoid; }
            </style>
          </head>
          <body>
            <h1>Clasificacion en blanco</h1>
            <p class="muted">Proceso: ${settings.proceso ?? "GV"}</p>
            <div>
              ${dateSlotMeta.map((slot) => `<span class="pill">${slot.orderLabel}: ${lotDates[slot.key] ? formatShortDate(lotDates[slot.key] ?? "") : "Sin fecha de lote"}</span>`).join("")}
            </div>
            <h2 style="margin-top: 24px;">Resumen macro</h2>
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Estado</th>
                  <th class="num">Pedido</th>
                  <th class="num">Resuelto</th>
                  <th class="num">Peso ideal pedido</th>
                  <th class="num">Peso real total</th>
                  <th class="num">Sobrepeso %</th>
                </tr>
              </thead>
              <tbody>${summaryRowsHtml}</tbody>
            </table>
            <h2 style="margin-top: 24px;">Recetas por orden</h2>
            ${recipeSectionsHtml || "<p class='muted'>No hubo recetas disponibles para exportar.</p>"}
          </body>
        </html>
      `);
      popup.document.close();
      popup.focus();
      popup.print();
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
              label="Proceso"
              value={settings.proceso ?? "GV"}
              hint="Modo operativo seleccionado para esta corrida."
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
                <Button type="button" variant="outline" onClick={() => setIsOrdersManagerOpen(true)}>
                  <Settings2 className="size-4" />
                  Administrar ordenes
                </Button>
                <Button type="button" variant="outline" onClick={resetOrders}>
                  <RotateCcw className="size-4" />
                  Limpiar pedidos
                </Button>
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
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-border/70 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span>Proceso activo: <strong>{settings.proceso ?? "GV"}</strong></span>
                <span>Ordenes activas: <strong>{dateSlots.length}</strong></span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {dateSlotMeta.map((slot) => (
                  <Badge key={slot.key} variant="outline" className="rounded-full px-3 py-1">
                    {slot.orderLabel} · {slot.origin}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>Mostrando {filteredOrders.length} de {orders.length} SKU.</span>
              <span>{formatInteger(ordersWithCapture)} SKU con pedido activo.</span>
            </div>
            <OrdersInputTable rows={filteredOrders} onChange={updateOrderValue} onOpenSku={openSkuInfo} dateSlots={dateSlots} />
          </CardContent>
        </Card>

        <Card className="starter-panel border-border/70 bg-card/84">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <CardTitle className="text-lg">Disponibilidad por grado</CardTitle>
                <CardDescription>
                  Captura manual de mallas por prioridad y peso tallo seed en gramos para cada grado.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setIsLotDatesOpen(true)}>
                  <CalendarDays className="size-4" />
                  Fechas de lote
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
                    setResult(null);
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
            <AvailabilityInputTable
              rows={availability}
              desperdicio={settings.desperdicio}
              onDateChange={updateAvailabilityDate}
              onWeightChange={updateAvailabilityWeight}
              dateSlots={dateSlots}
              lotDates={lotDates}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="starter-panel border-border/70 bg-card/84">
        <CardHeader className="space-y-2">
          <CardTitle className="text-lg">Validacion previa</CardTitle>
          <CardDescription>
            La corrida solo se habilita cuando los tallos pedidos minimos son al menos iguales a los
            tallos disponibles netos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              label="Tallos pedidos"
              value={formatInteger(precheck.tallosPedidos)}
              hint="Minimos requeridos por el maestro SKU."
            />
            <SummaryTile
              label="Tallos disponibles"
              value={formatInteger(precheck.tallosDisponibles)}
              hint="Netos, despues del desperdicio."
            />
            <SummaryTile
              label="Holgura captura"
              value={formatInteger(precheck.diferencia)}
              hint="Pedidos menos disponibilidad."
              tone={precheck.isValid ? "positive" : "warning"}
            />
            <SummaryTile
              label="Corrida"
              value={precheck.isValid ? "Lista" : "Bloqueada"}
              hint={precheck.isValid ? "Ya puedes ejecutar el solver." : "Ajusta primero pedidos o disponibilidad."}
              tone={precheck.isValid ? "positive" : "warning"}
            />
          </div>
          <div
            className={cn(
              "rounded-[24px] border px-4 py-4 text-sm",
              precheck.isValid
                ? "border-chart-success-bold/40 bg-chart-success-bold/10"
                : "border-slate-400/40 bg-slate-400/10",
            )}
          >
            {precheck.message}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              El solver prioriza Orden 1, luego Orden 2 y asi sucesivamente antes de optimizar peso y
              uso de grados, respetando el proceso seleccionado.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setResult(null)} disabled={!result}>
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
                disabled={!precheck.isValid || isRunning}
              >
                {isRunning ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}
                Resolver modelo unificado
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isOrdersManagerOpen ? (
        <FloatingPanel
          title="Administrar ordenes"
          description="Aqui defines las prioridades activas y el origen de cada orden para la captura inicial de pedidos."
          onClose={() => setIsOrdersManagerOpen(false)}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Ordenes activas</Label>
              <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={addDateSlot}>
                <Plus className="size-4" />
                Agregar orden
              </Button>
            </div>
            <div className="space-y-2">
              {dateSlotMeta.map((slot) => (
                <div key={slot.key} className="rounded-[18px] border border-border/70 bg-card/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{slot.orderLabel}</p>
                      <p className="text-xs text-muted-foreground">Se refleja como columna de captura en pedidos.</p>
                    </div>
                    <Button type="button" size="icon" variant="ghost" className="size-8 rounded-full" onClick={() => removeDateSlot(slot.key)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`origin-${slot.key}`}>Origen</Label>
                    <div className="grid gap-2 md:grid-cols-3">
                      {PROCESS_OPTIONS.map((option) => (
                        <button
                          key={`${slot.key}-${option.value}`}
                          id={`origin-${slot.key}`}
                          type="button"
                          className={cn(
                            "rounded-[18px] border px-4 py-3 text-left transition",
                            slot.origin === option.value
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-border/70 bg-card/80 hover:border-slate-400",
                          )}
                          onClick={() => updateDateSlotOrigin(slot.key, option.value)}
                        >
                          <span className="block text-sm font-semibold">{option.label}</span>
                          <span className={cn("mt-1 block text-xs", slot.origin === option.value ? "text-white/80" : "text-muted-foreground")}>
                            {option.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FloatingPanel>
      ) : null}

      {isLotDatesOpen ? (
        <FloatingPanel
          title="Fechas de lote"
          description="Aqui asignas la fecha real del lote para cada orden activa y defines el proceso global del solver."
          onClose={() => setIsLotDatesOpen(false)}
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Proceso del solver</Label>
              <div className="grid gap-2 md:grid-cols-3">
                {PROCESS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "rounded-[20px] border px-4 py-3 text-left transition",
                      settings.proceso === option.value
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-border/70 bg-card/80 hover:border-slate-400",
                    )}
                    onClick={() => {
                      setSettings((current) => ({ ...current, proceso: option.value }));
                      setResult(null);
                    }}
                  >
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className={cn("mt-1 block text-xs", settings.proceso === option.value ? "text-white/80" : "text-muted-foreground")}>
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
            {dateSlotMeta.map((slot) => (
              <div key={slot.key} className="rounded-[18px] border border-border/70 bg-card/70 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{slot.orderLabel}</p>
                    <p className="text-xs text-muted-foreground">Se muestra en Disponibilidad por grado como referencia del lote.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`lote-${slot.key}`}>Fecha del lote</Label>
                  <Input
                    id={`lote-${slot.key}`}
                    type="date"
                    value={lotDates[slot.key] ?? ""}
                    onChange={(event) => updateLotDate(slot.key, event.target.value)}
                  />
                </div>
              </div>
            ))}
            </div>
          </div>
        </FloatingPanel>
      ) : null}

      {result ? (
        <>
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
            description="Secuencia de la etapa interna de resolucion de pedidos segun el orden activo."
            table={(
              <div className="overflow-x-auto rounded-[24px] border border-border/70">
                <table className="min-w-[720px] w-full text-sm">
                  <thead className="bg-background/95">
                    <tr className="border-b border-border/70 text-left">
                      <th className="px-4 py-3 font-medium">Prioridad</th>
                      <th className="px-4 py-3 font-medium">Orden</th>
                      <th className="px-4 py-3 font-medium">Fecha lote</th>
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
                        <td className="px-4 py-3">{lotDates[dateSlotMeta[row.prioridad - 1]?.key ?? "fecha_1"] ? formatShortDate(lotDates[dateSlotMeta[row.prioridad - 1]?.key ?? "fecha_1"] ?? "") : "-"}</td>
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
            description="Lectura por SKU del resultado final y del estado de peso. Haz click en un SKU resuelto para ver su receta."
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
            description="Matriz SKU por grado que sale del solver redondeada a la vista operativa. Tambien puedes abrir la receta desde cada SKU."
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
            description="Lectura de consumo, remanente y peso gestionable despues de la corrida."
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
