"use client";

import { memo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FenogramaDashboardData, FenogramaPivotRow } from "@/lib/fenograma";

const fixedColumns = [
  { key: "block", label: "Bloque", width: 92 },
  { key: "area", label: "Area", width: 96 },
  { key: "variety", label: "Variedad", width: 132 },
  { key: "spType", label: "SP", width: 84 },
  { key: "spDate", label: "Fecha SP", width: 112 },
  { key: "harvestStartDate", label: "Fecha Ini Cos", width: 126 },
  { key: "harvestEndDate", label: "Fecha Fin Cos", width: 126 },
] as const;

const fixedColumnsWithOffset = (() => {
  let offset = 0;

  return fixedColumns.map((column) => {
    const currentOffset = offset;
    offset += column.width;

    return {
      ...column,
      offset: currentOffset,
    };
  });
})();

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

function getStickyStyle(offset: number, width: number) {
  return {
    left: `${offset}px`,
    minWidth: `${width}px`,
    width: `${width}px`,
  };
}

function isLastFixedColumn(key: (typeof fixedColumns)[number]["key"]) {
  return key === fixedColumns[fixedColumns.length - 1].key;
}

function getFixedCellValue(row: FenogramaPivotRow, key: (typeof fixedColumns)[number]["key"]) {
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

function getTotalLabel(key: (typeof fixedColumns)[number]["key"]) {
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

export const FenogramaPivotTable = memo(function FenogramaPivotTable({
  data,
  onRowSelect,
}: {
  data: FenogramaDashboardData;
  onRowSelect?: (row: FenogramaPivotRow) => void;
}) {
  function handleRowSelect(row: FenogramaPivotRow) {
    if (!onRowSelect) {
      return;
    }

    onRowSelect(row);
  }

  return (
    <Card className="starter-panel overflow-hidden border-border/70 bg-card/82">
      <CardContent className="p-0">
        <div className="max-h-[min(70vh,760px)] w-full overflow-auto">
          <table className="min-w-full w-max border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-30 bg-card/95 backdrop-blur">
              <tr>
                {fixedColumnsWithOffset.map((column) => (
                  <th
                    key={column.key}
                    style={getStickyStyle(column.offset, column.width)}
                    className={cn(
                      "sticky top-0 z-40 border-b border-r border-border/70 bg-card px-3 py-3 text-left font-semibold text-foreground",
                      isLastFixedColumn(column.key) && "shadow-[14px_0_20px_-16px_rgba(15,23,42,0.28)]",
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
              {data.rows.map((row, rowIndex) => (
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
                  {fixedColumnsWithOffset.map((column) => (
                    <td
                      key={`${row.id}-${column.key}`}
                      style={getStickyStyle(column.offset, column.width)}
                      className={cn(
                        "sticky z-20 border-b border-r border-border/60 bg-card px-3 py-2.5 align-middle text-left text-foreground",
                        isLastFixedColumn(column.key) && "shadow-[14px_0_20px_-16px_rgba(15,23,42,0.22)]",
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
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 z-30 bg-card/96 backdrop-blur">
              <tr>
                {fixedColumnsWithOffset.map((column) => (
                  <td
                    key={`total-${column.key}`}
                    style={getStickyStyle(column.offset, column.width)}
                    className={cn(
                      "sticky bottom-0 z-40 border-t border-r border-border/70 bg-card px-3 py-3 text-left font-semibold text-foreground",
                      isLastFixedColumn(column.key) && "shadow-[14px_0_20px_-16px_rgba(15,23,42,0.28)]",
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
