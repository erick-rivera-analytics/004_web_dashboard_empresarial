"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  decodeMultiSelectValue,
  encodeMultiSelectValue,
  summarizeMultiSelectValue,
} from "@/lib/multi-select";

type MultiSelectFieldProps = {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  emptyLabel?: string;
};

export function MultiSelectField({
  id,
  label,
  value,
  options,
  onChange,
  emptyLabel = "Todos",
}: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const selectedValues = useMemo(() => decodeMultiSelectValue(value), [value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (
        !containerRef.current?.contains(target)
        && !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function updatePanelPosition() {
      if (!buttonRef.current) {
        return;
      }

      const rect = buttonRef.current.getBoundingClientRect();
      setPanelStyle({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open]);

  function toggleOption(option: string) {
    if (selectedValues.includes(option)) {
      onChange(encodeMultiSelectValue(selectedValues.filter((valueEntry) => valueEntry !== option)));
      return;
    }

    onChange(encodeMultiSelectValue([...selectedValues, option]));
  }

  return (
    <div ref={containerRef} className="relative min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <button
        id={id}
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-input bg-background px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="truncate">{summarizeMultiSelectValue(value, emptyLabel)}</span>
        <Badge variant="outline" className="shrink-0 rounded-full px-2 py-0.5 text-[10px]">
          {selectedValues.length || "Todo"}
        </Badge>
      </button>

      {selectedValues.length ? (
        <div className="flex flex-wrap gap-1">
          {selectedValues.slice(0, 3).map((entry) => (
            <Badge key={entry} variant="secondary" className="rounded-full px-2 py-0.5">
              {entry}
            </Badge>
          ))}
          {selectedValues.length > 3 ? (
            <Badge variant="outline" className="rounded-full px-2 py-0.5">
              +{selectedValues.length - 3}
            </Badge>
          ) : null}
        </div>
      ) : null}

      {open && panelStyle ? createPortal(
        <div
          ref={panelRef}
          className="fixed z-[250] rounded-2xl border border-border/70 bg-card/98 p-3 shadow-2xl shadow-slate-950/12"
          style={{
            top: panelStyle.top,
            left: panelStyle.left,
            width: panelStyle.width,
          }}
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                onChange(encodeMultiSelectValue(options));
                setOpen(false);
              }}
            >
              Marcar todo
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                onChange("all");
                setOpen(false);
              }}
            >
              Limpiar
            </Button>
          </div>
          <div className="max-h-60 space-y-2 overflow-auto pr-1" role="listbox" aria-multiselectable="true">
            {options.length ? options.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-background/75 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="size-4 rounded border-border"
                />
                <span className="min-w-0 flex-1 truncate">{option}</span>
              </label>
            )) : (
              <div className="rounded-xl border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
                No hay opciones disponibles.
              </div>
            )}
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
