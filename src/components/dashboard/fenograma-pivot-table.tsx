"use client";

import { memo, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FenogramaDashboardData, FenogramaPivotRow } from "@/lib/fenograma";

const SUMMARY_COLUMN_WIDTH = 220;

const fixedColumns = [
  { key: "block", label: "Bloque", width: 96, hideable: true },
  { key: "area", label: "Area", width: 110, hideable: true },
  { key: "variety", label: "Variedad", width: 156, hideable: true },
  { key: "spType", label: "SP", width: 92, hideable: true },
  { key: "spDate", label: "Fecha SP", width: 112, hideable: true },
  { key: "harvestStartDate", label: "Fecha Ini Cos", width: 126, hideable: true },
  { key: "harvestEndDate", label: "Fecha Fin Cos", width: 126, hideable: true },
] as const;

const groupOptions = [
  { key: "none", label: "Sin grupo" },
  { key: "area", label: "Area" },
  { key: "variety", label: "Variedad" },
  { key: "spType", label: "SP" },
] as const;

type FixedColumnKey = (typeof fixedColumns)[number]["key"];
type GroupKey = (typeof groupOptions)[number]["key"];
type VisibleFixedColumn = (typeof fixedColumns)[number] & { offset: number };

type TableEntry =
  | { kind: "detail"; key: string; row: FenogramaPivotRow }
  | { kind: "groupHeader"; key: string; label: string }
  | { kind: "subtotal"; key: string; label: string; weekValues: Record<string, number | null> };

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatCellValue(value: number | null | undefined) {
  if (value === null || value === undefined || value === 0) {
    return "";
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
}

function buildVisibleFixedColumns(visibleKeys: Set<FixedColumnKey>) {
  let offset = 0;

  return fixedColumns
    .filter((column) => visibleKeys.has(column.key))
    .map((column) => {
      const nextColumn = {
        ...column,
        offset,
      } satisfies VisibleFixedColumn;

      offset += column.width;
      return nextColumn;
    });
}

function getStickyStyle(offset: number, width: number) {
  return {
    left: `${offset}px`,
    minWidth: `${width}px`,
    width: `${width}px`,
  };
}

function isLastFixedColumn(key: FixedColumnKey, visibleColumns: VisibleFixedColumn[]) {
  return key === visibleColumns[visibleColumns.length - 1]?.key;
}

function getFixedCellValue(row: FenogramaPivotRow, key: FixedColumnKey) {
  if (key === "spDate") {
    return formatDate(row.spDate);
  }

  if (key === "harvestStartDate") {
    return formatDate(row.harvestStartDate);
  }

  if (key === "harvestEndDate") {
    return formatDate(row.harvestEndDate);
  }

  return row[key] ?? "";
}

function lifecycleTone(status: FenogramaPivotRow["lifecycleStatus"]) {
  if (status === "active") {
    return "bg-primary/6";
  }

  if (status === "planned") {
    return "bg-accent/14";
  }

  return "bg-background/68";
}

function getGroupValue(row: FenogramaPivotRow, groupBy: GroupKey) {
  if (groupBy === "none") {
    return "";
  }

  if (groupBy === "area") {
    return row.area || "Sin area";
  }

  if (groupBy === "variety") {
    return row.variety || "Sin variedad";
  }

  return row.spType || "Sin SP";
}

function sortRows(left: FenogramaPivotRow, right: FenogramaPivotRow) {
  const byArea = left.area.localeCompare(right.area, "en-US", { sensitivity: "base" });

  if (byArea !== 0) {
    return byArea;
  }

  const byBlock = left.block.localeCompare(right.block, "en-US", { numeric: true });

  if (byBlock !== 0) {
    return byBlock;
  }

  return left.cycleKey.localeCompare(right.cycleKey, "en-US", { numeric: true });
}

function summarizeRowsByWeeks(rows: FenogramaPivotRow[], weeks: string[]) {
  return Object.fromEntries(
    weeks.map((week) => [
      week,
      rows.reduce<number>((sum, row) => sum + (row.weekValues[week] ?? 0), 0),
    ]),
  ) as Record<string, number>;
}

function buildTableEntries(
  rows: FenogramaPivotRow[],
  groupBy: GroupKey,
  showDetailRows: boolean,
  weeks: string[],
) {
  const sortedRows = [...rows].sort(sortRows);

  if (groupBy === "none") {
    if (!showDetailRows) {
      return [] as TableEntry[];
    }

    return sortedRows.map((row) => ({
      kind: "detail" as const,
      key: row.id,
      row,
    }));
  }

  const groupedRows = new Map<string, FenogramaPivotRow[]>();

  for (const row of sortedRows) {
    const groupValue = getGroupValue(row, groupBy);
    const currentRows = groupedRows.get(groupValue) ?? [];
    currentRows.push(row);
    groupedRows.set(groupValue, currentRows);
  }

  const entries: TableEntry[] = [];

  for (const [groupValue, currentRows] of groupedRows.entries()) {
    if (showDetailRows) {
      entries.push({
        kind: "groupHeader",
        key: `group-${groupValue}`,
        label: groupValue,
      });

      for (const row of currentRows) {
        entries.push({
          kind: "detail",
          key: row.id,
          row,
        });
      }
    }

    entries.push({
      kind: "subtotal",
      key: `subtotal-${groupValue}`,
      label: `Subtotal ${groupOptions.find((option) => option.key === groupBy)?.label}: ${groupValue}`,
      weekValues: summarizeRowsByWeeks(currentRows, weeks),
    });
  }

  return entries;
}

export const FenogramaPivotTable = memo(function FenogramaPivotTable({
  data,
  onRowSelect,
}: {
  data: FenogramaDashboardData;
  onRowSelect?: (row: FenogramaPivotRow) => void;
}) {
  const [groupBy, setGroupBy] = useState<GroupKey>("none");
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<FixedColumnKey[]>(
    fixedColumns.map((column) => column.key),
  );

  const visibleColumns = useMemo(
    () => buildVisibleFixedColumns(new Set(visibleColumnKeys)),
    [visibleColumnKeys],
  );
  const showDetailRows = visibleColumns.length > 0;
  const needsSummaryColumn = visibleColumns.length === 0;
  const tableEntries = useMemo(
    () => buildTableEntries(data.rows, groupBy, showDetailRows, data.weeks),
    [data.rows, data.weeks, groupBy, showDetailRows],
  );

  function handleRowSelect(row: FenogramaPivotRow) {
    if (!onRowSelect) {
      return;
    }

    onRowSelect(row);
  }

  function toggleFixedColumn(columnKey: FixedColumnKey) {
    setVisibleColumnKeys((current) => {
      if (current.includes(columnKey)) {
        return current.filter((key) => key !== columnKey);
      }

      return fixedColumns
        .map((column) => column.key)
        .filter((key) => current.includes(key) || key === columnKey);
    });
  }

  return (
    <Card className="starter-panel overflow-hidden border-border/70 bg-card/82">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Vista operativa
            </p>
            <div className="flex flex-wrap gap-2">
              {groupOptions.map((option) => (
                <Button
                  key={option.key}
                  variant={groupBy === option.key ? "secondary" : "outline"}
                  className="rounded-full"
                  onClick={() => setGroupBy(option.key)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Columnas fijas
            </p>
            <div className="flex flex-wrap gap-2">
              {fixedColumns.map((column) => {
                const isVisible = visibleColumnKeys.includes(column.key);

                return (
                  <Button
                    key={column.key}
                    variant={isVisible ? "secondary" : "outline"}
                    className="rounded-full"
                    onClick={() => toggleFixedColumn(column.key)}
                  >
                    {column.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-full px-3 py-1">
            {data.rows.length} filas base
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1">
            {visibleColumns.length} columnas fijas activas
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1">
            Agrupacion: {groupOptions.find((option) => option.key === groupBy)?.label}
          </Badge>
        </div>

        <div className="max-h-[min(72vh,780px)] w-full overflow-auto rounded-[24px] border border-border/70">
          <table className="min-w-full w-max border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-30 bg-card/95 backdrop-blur">
              <tr>
                {needsSummaryColumn ? (
                  <th
                    className="sticky top-0 border-b border-r border-border/70 bg-card px-3 py-3 text-left font-semibold text-foreground"
                    style={{ minWidth: `${SUMMARY_COLUMN_WIDTH}px`, width: `${SUMMARY_COLUMN_WIDTH}px` }}
                  >
                    Resumen
                  </th>
                ) : null}
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    style={getStickyStyle(column.offset, column.width)}
                    className={cn(
                      "sticky top-0 z-40 border-b border-r border-border/70 bg-card px-3 py-3 text-left font-semibold text-foreground",
                      isLastFixedColumn(column.key, visibleColumns) && "shadow-[14px_0_20px_-16px_rgba(15,23,42,0.28)]",
                    )}
                  >
                    {column.label}
                  </th>
                ))}
                {data.weeks.map((week) => (
                  <th
                    key={week}
                    className="sticky top-0 border-b border-r border-border/70 bg-card px-3 py-3 text-right font-semibold text-foreground"
                  >
                    <div className="min-w-[92px]">{week}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableEntries.map((entry, rowIndex) => {
                if (entry.kind === "groupHeader") {
                  return (
                    <tr key={entry.key}>
                      <td
                        colSpan={visibleColumns.length + data.weeks.length}
                        className="sticky top-[49px] z-20 border-b border-t border-border/60 bg-primary/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary backdrop-blur"
                      >
                        {entry.label}
                      </td>
                    </tr>
                  );
                }

                if (entry.kind === "subtotal") {
                  return (
                    <tr key={entry.key} className="bg-primary/7">
                      {needsSummaryColumn ? (
                        <td
                          className="border-b border-r border-border/60 px-3 py-2.5 font-semibold text-foreground"
                          style={{ minWidth: `${SUMMARY_COLUMN_WIDTH}px`, width: `${SUMMARY_COLUMN_WIDTH}px` }}
                        >
                          {entry.label}
                        </td>
                      ) : (
                        <td
                          colSpan={visibleColumns.length}
                          className="border-b border-r border-border/60 px-3 py-2.5 font-semibold text-foreground"
                        >
                          {entry.label}
                        </td>
                      )}
                      {data.weeks.map((week) => (
                        <td
                          key={`${entry.key}-${week}`}
                          className="border-b border-r border-border/60 px-3 py-2.5 text-right font-semibold tabular-nums text-foreground"
                        >
                          <div className="min-w-[92px]">{formatCellValue(entry.weekValues[week])}</div>
                        </td>
                      ))}
                    </tr>
                  );
                }

                const row = entry.row;

                return (
                  <tr
                    key={entry.key}
                    className={cn(
                      rowIndex % 2 === 0 ? "bg-background/84" : "bg-background/70",
                      lifecycleTone(row.lifecycleStatus),
                      onRowSelect && "cursor-pointer transition-colors hover:bg-primary/6",
                    )}
                    onClick={onRowSelect ? () => handleRowSelect(row) : undefined}
                    onKeyDown={onRowSelect ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleRowSelect(row);
                      }
                    } : undefined}
                    role={onRowSelect ? "button" : undefined}
                    tabIndex={onRowSelect ? 0 : undefined}
                  >
                    {visibleColumns.map((column) => (
                      <td
                        key={`${row.id}-${column.key}`}
                        style={getStickyStyle(column.offset, column.width)}
                        className={cn(
                          "sticky z-20 border-b border-r border-border/60 bg-card px-3 py-2.5 align-middle text-left text-foreground",
                          isLastFixedColumn(column.key, visibleColumns) && "shadow-[14px_0_20px_-16px_rgba(15,23,42,0.22)]",
                        )}
                      >
                        {column.key === "block" && onRowSelect && row.block ? (
                          <button
                            type="button"
                            className="w-full text-left font-semibold underline-offset-4 hover:underline"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRowSelect(row);
                            }}
                          >
                            {getFixedCellValue(row, column.key)}
                          </button>
                        ) : (
                          getFixedCellValue(row, column.key)
                        )}
                      </td>
                    ))}
                    {data.weeks.map((week) => (
                      <td
                        key={`${row.id}-${week}`}
                        className="border-b border-r border-border/50 px-3 py-2.5 text-right tabular-nums text-foreground/92"
                      >
                        <div className="min-w-[92px]">{formatCellValue(row.weekValues[week])}</div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 z-30 bg-card/96 backdrop-blur">
              <tr>
                {needsSummaryColumn ? (
                  <td
                    className="sticky bottom-0 border-t border-r border-border/70 bg-card px-3 py-3 text-left font-semibold text-foreground"
                    style={{ minWidth: `${SUMMARY_COLUMN_WIDTH}px`, width: `${SUMMARY_COLUMN_WIDTH}px` }}
                  >
                    Total general
                  </td>
                ) : null}
                {visibleColumns.map((column, index) => (
                  <td
                    key={`total-${column.key}`}
                    style={getStickyStyle(column.offset, column.width)}
                    className={cn(
                      "sticky bottom-0 z-40 border-t border-r border-border/70 bg-card px-3 py-3 text-left font-semibold text-foreground",
                      isLastFixedColumn(column.key, visibleColumns) && "shadow-[14px_0_20px_-16px_rgba(15,23,42,0.28)]",
                    )}
                  >
                    {index === 0 ? "Total general" : ""}
                  </td>
                ))}
                {data.weeklyTotals.map((entry) => (
                  <td
                    key={`total-${entry.week}`}
                    className="sticky bottom-0 border-t border-r border-border/70 bg-card px-3 py-3 text-right font-semibold tabular-nums text-foreground"
                  >
                    <div className="min-w-[92px]">{formatCellValue(entry.stems)}</div>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
});
