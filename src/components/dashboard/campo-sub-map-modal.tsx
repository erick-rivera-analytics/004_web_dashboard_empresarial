"use client";

import "leaflet/dist/leaflet.css";

import type { Feature, FeatureCollection, GeoJsonObject } from "geojson";
import L from "leaflet";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoJSON, MapContainer, Popup, useMap } from "react-leaflet";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type SubMapMode = "valves" | "beds";

type ValveClickState = {
  latlng: L.LatLng;
  valveId: string;
  valvula: string;
  bloquePad: string;
};

type BedClickState = {
  latlng: L.LatLng;
  bedId: string;
  cama: number;
  valvula: string;
  bloquePad: string;
};

type Props = {
  /** Which block to show (parent block) */
  bloquePad: string;
  /** "valves" = colour by valve; "beds" = colour individual beds */
  mode: SubMapMode;
  /** Required when mode = "beds": which valve to show */
  valveId?: string;
  /** Called when user clicks "Ver detalle" on a valve */
  onValveDetail: (valveId: string, bloquePad: string) => void;
  /** Called when user clicks "Mapa camas" on a valve */
  onBedMap: (valveId: string, bloquePad: string) => void;
  /** Called when user wants to close the modal */
  onClose: () => void;
};

// ── Palette for valves / beds ─────────────────────────────────────────────────

const VALVE_COLORS = [
  "hsl(210,72%,56%)", "hsl(36,90%,55%)",  "hsl(150,60%,48%)",
  "hsl(280,60%,60%)", "hsl(0,72%,56%)",   "hsl(190,72%,48%)",
  "hsl(60,80%,48%)",  "hsl(320,60%,58%)", "hsl(170,60%,44%)",
  "hsl(15,80%,56%)",
];

const BED_COLORS = [
  "hsl(210,72%,56%)", "hsl(150,60%,48%)", "hsl(36,90%,55%)",  "hsl(280,60%,60%)",
  "hsl(0,72%,56%)",   "hsl(190,72%,48%)", "hsl(60,80%,48%)",  "hsl(320,60%,58%)",
  "hsl(170,60%,44%)", "hsl(15,80%,56%)",  "hsl(240,60%,58%)", "hsl(100,52%,50%)",
  "hsl(345,72%,58%)", "hsl(55,80%,50%)",  "hsl(195,68%,50%)", "hsl(30,72%,52%)",
  "hsl(160,56%,46%)", "hsl(300,52%,58%)", "hsl(80,56%,48%)",  "hsl(220,60%,56%)",
  "hsl(10,72%,54%)",  "hsl(140,56%,48%)", "hsl(260,56%,58%)", "hsl(45,80%,52%)",
  "hsl(185,64%,48%)", "hsl(25,76%,54%)",  "hsl(155,56%,46%)", "hsl(310,52%,56%)",
];

// ── Fit bounds helper ─────────────────────────────────────────────────────────

function FitBounds({ data }: { data: FeatureCollection }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || !data.features.length) return;
    try {
      const layer = L.geoJSON(data as GeoJsonObject);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [32, 32] });
        fitted.current = true;
      }
    } catch { /* empty */ }
  }, [data, map]);

  return null;
}

// ── Valve-level map ───────────────────────────────────────────────────────────

function ValveMap({
  features,
  onValveDetail,
  onBedMap,
}: {
  features: Feature[];
  onValveDetail: (valveId: string, bloquePad: string) => void;
  onBedMap: (valveId: string, bloquePad: string) => void;
}) {
  const [click, setClick] = useState<ValveClickState | null>(null);

  // build color map: valveId → color
  const valveIndex = useMemo(() => {
    const ids = [...new Set(features.map((f) => f.properties?.valveId as string))].sort();
    return new Map(ids.map((id, i) => [id, VALVE_COLORS[i % VALVE_COLORS.length]]));
  }, [features]);

  const fc = useMemo<FeatureCollection>(
    () => ({ type: "FeatureCollection", features }),
    [features],
  );

  const styleFeature = useCallback(
    (feature: Feature | undefined) => {
      const vid = feature?.properties?.valveId as string | undefined;
      return {
        fillColor:   vid ? (valveIndex.get(vid) ?? "hsl(210,18%,84%)") : "hsl(210,18%,84%)",
        color:       "rgba(15,23,42,0.30)",
        weight:      1,
        fillOpacity: 0.82,
      };
    },
    [valveIndex],
  );

  const onEachFeature = useCallback(
    (feature: Feature, layer: L.Layer) => {
      layer.on({
        click(e: L.LeafletMouseEvent) {
          const p = feature.properties;
          if (!p) return;
          setClick({
            latlng:    e.latlng,
            valveId:   p.valveId as string,
            valvula:   p.valvula as string,
            bloquePad: p.bloquePad as string,
          });
        },
        mouseover(e: L.LeafletMouseEvent) {
          (e.target as L.Path).setStyle({ weight: 2.4, fillOpacity: 1 });
        },
        mouseout(e: L.LeafletMouseEvent) {
          (e.target as L.Path).setStyle({ weight: 1, fillOpacity: 0.82 });
        },
      });
    },
    [],
  );

  return (
    <>
      <GeoJSON
        key={fc.features.length}
        data={fc as GeoJsonObject}
        style={styleFeature}
        onEachFeature={onEachFeature}
      />

      {click && (
        <Popup position={click.latlng} eventHandlers={{ remove: () => setClick(null) }}>
          <div className="flex min-w-[180px] flex-col gap-2 p-1">
            <p className="text-sm font-semibold">Válvula {click.valvula}</p>
            <p className="text-xs text-muted-foreground">{click.valveId}</p>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start text-xs"
              onClick={() => {
                onValveDetail(click.valveId, click.bloquePad);
                setClick(null);
              }}
            >
              Ver detalle válvula
            </Button>
            <Button
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => {
                onBedMap(click.valveId, click.bloquePad);
                setClick(null);
              }}
            >
              Mapa camas
            </Button>
          </div>
        </Popup>
      )}

      <FitBounds data={fc} />
    </>
  );
}

// ── Bed-level map ─────────────────────────────────────────────────────────────

function BedMap({ features, valvula }: { features: Feature[]; valvula: string }) {
  const [click, setClick] = useState<BedClickState | null>(null);

  const fc = useMemo<FeatureCollection>(
    () => ({ type: "FeatureCollection", features }),
    [features],
  );

  const styleFeature = useCallback(
    (feature: Feature | undefined) => {
      const cama = (feature?.properties?.cama as number | undefined) ?? 0;
      return {
        fillColor:   BED_COLORS[(cama - 1) % BED_COLORS.length] ?? "hsl(210,18%,84%)",
        color:       "rgba(15,23,42,0.30)",
        weight:      1,
        fillOpacity: 0.82,
      };
    },
    [],
  );

  const onEachFeature = useCallback(
    (feature: Feature, layer: L.Layer) => {
      layer.on({
        click(e: L.LeafletMouseEvent) {
          const p = feature.properties;
          if (!p) return;
          setClick({
            latlng:    e.latlng,
            bedId:     p.bedId as string,
            cama:      p.cama as number,
            valvula:   p.valvula as string,
            bloquePad: p.bloquePad as string,
          });
        },
        mouseover(e: L.LeafletMouseEvent) {
          (e.target as L.Path).setStyle({ weight: 2.8, fillOpacity: 1 });
        },
        mouseout(e: L.LeafletMouseEvent) {
          (e.target as L.Path).setStyle({ weight: 1, fillOpacity: 0.82 });
        },
      });
    },
    [],
  );

  return (
    <>
      <GeoJSON
        key={fc.features.length}
        data={fc as GeoJsonObject}
        style={styleFeature}
        onEachFeature={onEachFeature}
      />

      {click && (
        <Popup position={click.latlng} eventHandlers={{ remove: () => setClick(null) }}>
          <div className="flex min-w-[160px] flex-col gap-1.5 p-1">
            <p className="text-sm font-semibold">
              Cama {click.cama}
            </p>
            <p className="text-xs text-muted-foreground">
              Válvula {click.valvula} · Bloque {click.bloquePad}
            </p>
            <p className="text-xs text-muted-foreground">
              ID: {click.bedId}
            </p>
          </div>
        </Popup>
      )}

      <FitBounds data={fc} />
    </>
  );
}

// ── Legend for valve mode ─────────────────────────────────────────────────────

function ValveLegend({ valveIds }: { valveIds: string[] }) {
  const sorted = useMemo(() => [...valveIds].sort(), [valveIds]);
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-[800] flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-background/92 px-3 py-2 shadow-sm backdrop-blur-sm">
      {sorted.map((vid, i) => (
        <div key={vid} className="flex items-center gap-1.5">
          <span
            className="size-3 rounded-sm"
            style={{ background: VALVE_COLORS[i % VALVE_COLORS.length] }}
          />
          <span className="text-xs font-medium">{vid.split("-").pop()}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function CampoSubMapModal({
  bloquePad,
  mode,
  valveId,
  onValveDetail,
  onBedMap,
  onClose,
}: Props) {
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch GeoJSON
  useEffect(() => {
    fetch("/data/campo-geo.json")
      .then((r) => r.json())
      .then((data: FeatureCollection) => {
        setAllFeatures(data.features);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filter features by bloquePad, then optionally by valveId
  const features = useMemo(() => {
    const byBlock = allFeatures.filter(
      (f) => (f.properties?.bloquePad as string) === bloquePad,
    );
    if (mode === "beds" && valveId) {
      return byBlock.filter((f) => (f.properties?.valveId as string) === valveId);
    }
    return byBlock;
  }, [allFeatures, bloquePad, mode, valveId]);

  const valveIds = useMemo(
    () => [...new Set(features.map((f) => f.properties?.valveId as string))],
    [features],
  );

  const fc = useMemo<FeatureCollection>(
    () => ({ type: "FeatureCollection", features }),
    [features],
  );

  const title =
    mode === "valves"
      ? `Válvulas — Bloque ${bloquePad}`
      : `Camas — Válvula ${valveId?.split("-").pop() ?? ""} · Bloque ${bloquePad}`;

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sub-map-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/48 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {mode === "valves" ? "Mapa de válvulas" : "Mapa de camas"}
            </p>
            <h2 id="sub-map-title" className="mt-0.5 text-lg font-semibold">
              {title}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Map area */}
        <div className="relative flex-1 overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <p className="animate-pulse text-sm text-muted-foreground">Cargando geometría…</p>
            </div>
          ) : (
            <>
              <MapContainer
                zoom={17}
                center={[-2.859, -78.796]}
                zoomControl
                className="h-full w-full"
                style={{ background: "hsl(210 18% 96%)" }}
              >
                {mode === "valves" ? (
                  <ValveMap
                    features={features}
                    onValveDetail={onValveDetail}
                    onBedMap={onBedMap}
                  />
                ) : (
                  <BedMap
                    features={features}
                    valvula={valveId?.split("-").pop() ?? ""}
                  />
                )}
              </MapContainer>

              {mode === "valves" && valveIds.length > 0 && (
                <ValveLegend valveIds={valveIds} />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/70 px-6 py-3">
          <p className="text-xs text-muted-foreground">
            {features.length} {mode === "valves" ? "camas" : "camas"} · {mode === "valves" ? valveIds.length + " válvulas" : "1 válvula"}
          </p>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
