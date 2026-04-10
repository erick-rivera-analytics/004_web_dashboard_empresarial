"use client";

import { startTransition, type ReactNode, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  BrainCircuit,
  LoaderCircle,
  Play,
  RefreshCcw,
  RotateCcw,
  Search,
  TableProperties,
} from "lucide-react";
import { toast } from "sonner";

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
  getDateLabel,
} from "@/lib/postcosecha-clasificacion-en-blanco-client";
import type {
  PoscosechaClasificacionAvailabilityRow,
  PoscosechaClasificacionBootData,
  PoscosechaClasificacionOrderRow,
  PoscosechaClasificacionResult,
  PoscosechaClasificacionRunPayload,
  SolverDateKey,
} from "@/lib/postcosecha-clasificacion-en-blanco-types";
import { SOLVER_DATE_KEYS } from "@/lib/postcosecha-clasificacion-en-blanco-types";
import { cn } from "@/lib/utils";

type PoscosechaClasificacionEnBlancoExplorerProps = {
  initialData: PoscosechaClasificacionBootData;
  initialError?: string | null;
};

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
            : "border-border/70 bg-background/76",
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

function OrdersInputTable({
  rows,
  onChange,
}: {
  rows: PoscosechaClasificacionOrderRow[];
  onChange: (skuId: string, dateKey: SolverDateKey, value: string) => void;
}) {
  return (
    <div className="max-h-[600px] overflow-auto rounded-[24px] border border-border/70">
      <table className="min-w-[720px] w-full text-sm">
        <thead className="sticky top-0 bg-background/95 backdrop-blur">
          <tr className="border-b border-border/70 text-left">
            <th className="px-4 py-3 font-medium">SKU</th>
            {SOLVER_DATE_KEYS.map((key) => (
              <th key={key} className="px-3 py-3 text-center font-medium">
                {getDateLabel(key)}
              </th>
            ))}
            <th className="px-4 py-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.skuId} className="border-b border-border/50 last:border-b-0">
              <td className="px-4 py-3 align-middle font-medium">{row.sku}</td>
              {SOLVER_DATE_KEYS.map((key) => (
                <td key={key} className="px-3 py-2 text-center">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={row[key]}
                    onChange={(event) => onChange(row.skuId, key, event.target.value)}
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
}: {
  rows: PoscosechaClasificacionAvailabilityRow[];
  desperdicio: number;
  onDateChange: (grado: number, dateKey: SolverDateKey, value: string) => void;
  onWeightChange: (grado: number, value: string) => void;
}) {
  const derivedRows = buildClasificacionAvailabilityDerived(rows, desperdicio);
  const derivedByGrade = new Map(derivedRows.map((row) => [row.grado, row]));

  return (
    <div className="max-h-[600px] overflow-auto rounded-[24px] border border-border/70">
      <table className="min-w-[860px] w-full text-sm">
        <thead className="sticky top-0 bg-background/95 backdrop-blur">
          <tr className="border-b border-border/70 text-left">
            <th className="px-4 py-3 font-medium">Grado</th>
            {SOLVER_DATE_KEYS.map((key) => (
              <th key={key} className="px-3 py-3 text-center font-medium">
                {getDateLabel(key)}
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
                {SOLVER_DATE_KEYS.map((key) => (
                  <td key={key} className="px-3 py-2 text-center">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={row[key]}
                      onChange={(event) => onDateChange(row.grado, key, event.target.value)}
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

export function PoscosechaClasificacionEnBlancoExplorer({
  initialData,
  initialError,
}: PoscosechaClasificacionEnBlancoExplorerProps) {
  const [bootData, setBootData] = useState(initialData);
  const [orders, setOrders] = useState(initialData.ordersTemplate);
  const [availability, setAvailability] = useState(initialData.availabilityTemplate);
  const [settings, setSettings] = useState(initialData.settings);
  const [result, setResult] = useState<PoscosechaClasificacionResult | null>(null);
  const [search, setSearch] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
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

  useEffect(() => {
    if (initialError) {
      toast.error(initialError);
    }
  }, [initialError]);

  function applyBootData(nextData: PoscosechaClasificacionBootData) {
    setBootData(nextData);
    setOrders(nextData.ordersTemplate);
    setAvailability(nextData.availabilityTemplate);
    setSettings(nextData.settings);
    setResult(null);
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
                  ejecuta el solver real para resolver bunches por fecha, mezcla de grados y tabla
                  final en mallas.
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
                  Captura manual de bunches por fecha. La base siempre nace desde el maestro activo
                  de SKU.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
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
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>Mostrando {filteredOrders.length} de {orders.length} SKU.</span>
              <span>{formatInteger(ordersWithCapture)} SKU con pedido activo.</span>
            </div>
            <OrdersInputTable rows={filteredOrders} onChange={updateOrderValue} />
          </CardContent>
        </Card>

        <Card className="starter-panel border-border/70 bg-card/84">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <CardTitle className="text-lg">Disponibilidad por grado</CardTitle>
                <CardDescription>
                  Captura manual de mallas por fecha y peso tallo seed en gramos para cada grado.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
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
              El solver prioriza Fecha 1, luego Fecha 2 y asi sucesivamente antes de optimizar peso y
              uso de grados.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setResult(null)} disabled={!result}>
                <TableProperties className="size-4" />
                Limpiar resultados
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
            title="Prioridad de cumplimiento por fecha"
            description="Secuencia de la etapa interna de resolucion de pedidos."
            table={(
              <div className="overflow-x-auto rounded-[24px] border border-border/70">
                <table className="min-w-[720px] w-full text-sm">
                  <thead className="bg-background/95">
                    <tr className="border-b border-border/70 text-left">
                      <th className="px-4 py-3 font-medium">Prioridad</th>
                      <th className="px-4 py-3 font-medium">Fecha</th>
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
                        <td className="px-4 py-3 font-medium">{row.fecha}</td>
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
            description="Lectura por SKU del resultado final y del estado de peso."
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
                    {result.orderRows.map((row) => (
                      <tr key={row.sku} className="border-b border-border/50 last:border-b-0">
                        <td className="px-4 py-3 font-medium">{row.sku}</td>
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          />

          <SimpleTableCard
            title="Tabla final en mallas"
            description="Matriz SKU por grado que sale del solver redondeada a la vista operativa."
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
                    {result.matrix.rows.map((row) => (
                      <tr key={row.sku} className="border-b border-border/50 last:border-b-0">
                        <td className="px-4 py-3 font-medium">{row.sku}</td>
                        {result.matrix.gradeLabels.map((gradeLabel) => (
                          <td key={`${row.sku}-${gradeLabel}`} className="px-4 py-3 text-right">
                            {formatInteger(row.values[String(gradeLabel)] ?? 0)}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right font-semibold">{formatInteger(row.total)}</td>
                      </tr>
                    ))}
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
    </div>
  );
}
