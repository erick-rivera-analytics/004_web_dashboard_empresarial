"use client";

import { memo, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FenogramaDashboardData, FenogramaPivotRow } from "@/lib/fenograma";

const fixedColumns = [
  { key: "block", label: "Bloque", width: 92, hideable: false },
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

type VisibleFixedColumn = (typeof fixedColumns)[number] & {
  offset: number;
};

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

function isLastFixedColumn(
  key: FixedColumnKey,
  visibleColumns: VisibleFixedColumn[],
) {
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

function getTotalLabel(key: FixedColumnKey) {
  if (key === "block") {
    return "Total";
  }

  if (key === "area") {
    return "Semanal";
  }

  return "";
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

function buildGroupedRows(rows: FenogramaPivotRow[], groupBy: GroupKey) {
  if (groupBy === "none") {
    return rows.map((row) => ({ type: "row" as const, row }));
  }

  const sortedRows = [...rows].sort((left, right) => {
    const leftGroup = getGroupValue(left, groupBy);
    const rightGroup = getGroupValue(right, groupBy);

    if (leftGroup !== rightGroup) {
      return leftGroup.localeCompare(rightGroup, "en-US", { sensitivity: "base" });
    }

    return left.block.localeCompare(right.block, "en-US", { numeric: true });
  });

  const result: Array<
    | { type: "group"; value: string }
    | { type: "row"; row: FenogramaPivotRow }
  > = [];
  let currentGroup = "";

  for (const row of sortedRows) {
    const groupValue = getGroupValue(row, groupBy);

    if (groupValue !== currentGroup) {
      currentGroup = groupValue;
      result.push({ type: "group", value: currentGroup });
    }

    result.push({ type: "row", row });
  }

  return result;
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
  const groupedRows = useMemo(
    () => buildGroupedRows(data.rows, groupBy),
    [data.rows, groupBy],
  );

  function handleRowSelect(row: FenogramaPivotRow) {
    if (!onRowSelect) {
      return;
    }

    onRowSelect(row);
  }

  function toggleFixedColumn(columnKey: FixedColumnKey) {
    const column = fixedColumns.find((item) => item.key === columnKey);

    if (!column?.hideable) {
      return;
    }

    setVisibleColumnKeys((current) => {
      const nextKeys = current.includes(columnKey)
        ? current.filter((key) => key !== columnKey)
        : fixedColumns
          .map((item) => item.key)
          .filter((key) => key === "block" || current.includes(key) || key === columnKey);

      return fixedColumns
        .map((item) => item.key)
        .filter((key) => nextKeys.includes(key));
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
                    disabled={!column.hideable}
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
            {data.rows.length} filas visibles
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
              {groupedRows.map((entry, rowIndex) => {
                if (entry.type === "group") {
                  return (
                    <tr key={`group-${entry.value}`}>
                      <td
                        colSpan={visibleColumns.length + data.weeks.length}
                        className="sticky top-[49px] z-20 border-b border-t border-border/60 bg-primary/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary backdrop-blur"
                      >
                        {entry.value}
                      </td>
                    </tr>
                  );
                }

                const row = entry.row;

                return (
                  <tr
                    key={row.id}
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
                {visibleColumns.map((column) => (
                  <td
                    key={`total-${column.key}`}
                    style={getStickyStyle(column.offset, column.width)}
                    className={cn(
                      "sticky bottom-0 z-40 border-t border-r border-border/70 bg-card px-3 py-3 text-left font-semibold text-foreground",
                      isLastFixedColumn(column.key, visibleColumns) && "shadow-[14px_0_20px_-16px_rgba(15,23,42,0.28)]",
                    )}
                  >
                    {getTotalLabel(column.key)}
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
