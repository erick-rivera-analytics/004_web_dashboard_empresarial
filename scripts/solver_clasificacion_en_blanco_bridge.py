from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


DASHBOARD_ROOT = Path(__file__).resolve().parent.parent
SOLVER_ROOT = Path(
    os.environ.get(
        "POSTHARVEST_SOLVER_ROOT",
        str(DASHBOARD_ROOT.parent / "solver_poscosecha"),
    )
).resolve()

if str(SOLVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SOLVER_ROOT))

try:
    from solver_logic import DATE_COLUMNS, load_workbook_defaults, solve_pipeline
except Exception as exc:  # pragma: no cover - runtime bridge
    raise RuntimeError(
        f"No se pudo importar el motor de solver desde {SOLVER_ROOT}: {exc}"
    ) from exc


def read_payload() -> dict[str, Any]:
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    return json.loads(raw)


def clean_value(value: Any) -> Any:
    if pd.isna(value):
        return None
    if isinstance(value, (np.integer, int)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        return float(value)
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    if isinstance(value, Path):
        return str(value)
    return value


def dataframe_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for _, row in df.iterrows():
        record: dict[str, Any] = {}
        for column in df.columns:
            record[str(column)] = clean_value(row[column])
        records.append(record)
    return records


def build_defaults_payload() -> dict[str, Any]:
    defaults = load_workbook_defaults()
    availability_template = defaults.availability[["grado", "peso_tallo_seed"]].copy()

    return {
        "settings": {
            "desperdicio": float(defaults.settings.get("desperdicio", 0.13)),
        },
        "availability_template": [
            {
                "grado": int(row["grado"]),
                "peso_tallo_seed": float(row["peso_tallo_seed"]),
            }
            for _, row in availability_template.iterrows()
        ],
        "workbook_path": str(defaults.workbook_path),
        "master_path": str(defaults.master_path),
    }


def build_priority_rows(summary: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for position, date_key in enumerate(DATE_COLUMNS, start=1):
        rows.append(
            {
                "prioridad": position,
                "fecha": f"Fecha {position}",
                "pedido": float(summary.get(f"pedido_{date_key}", 0.0)),
                "resuelto": float(summary.get(f"resuelto_{date_key}", 0.0)),
                "noRealizado": float(summary.get(f"no_realizado_{date_key}", 0.0)),
                "cumplimiento": float(summary.get(f"cumplimiento_{date_key}", 1.0)),
            }
        )
    return rows


def build_order_rows(df: pd.DataFrame) -> list[dict[str, Any]]:
    selected = df[
        [
            "sku",
            "estado_peso",
            "pedido_total",
            "pedido_resuelto",
            "ajuste_bunches",
            "cumplimiento_bunches",
            "peso_ideal_pedido",
            "peso_ideal_resuelto",
            "peso_real_total",
            "peso_real_bunch",
            "peso_min_objetivo",
            "peso_max_objetivo",
            "sobrepeso_pct",
            "sobrepeso_bunch",
            "sobrepeso_total",
            "tallos_asignados_netos",
            "tallos_asignados_brutos",
            "mallas_totales",
            "grados_usados",
            "exceso_grados_objetivo",
        ]
    ].copy()

    renamed = selected.rename(
        columns={
            "estado_peso": "estadoPeso",
            "pedido_total": "pedidoTotal",
            "pedido_resuelto": "pedidoResuelto",
            "ajuste_bunches": "ajusteBunches",
            "cumplimiento_bunches": "cumplimientoBunches",
            "peso_ideal_pedido": "pesoIdealPedido",
            "peso_ideal_resuelto": "pesoIdealResuelto",
            "peso_real_total": "pesoRealTotal",
            "peso_real_bunch": "pesoRealBunch",
            "peso_min_objetivo": "pesoMinObjetivo",
            "peso_max_objetivo": "pesoMaxObjetivo",
            "sobrepeso_pct": "sobrepesoPct",
            "sobrepeso_bunch": "sobrepesoBunch",
            "sobrepeso_total": "sobrepesoTotal",
            "tallos_asignados_netos": "tallosAsignadosNetos",
            "tallos_asignados_brutos": "tallosAsignadosBrutos",
            "mallas_totales": "mallasTotales",
            "grados_usados": "gradosUsados",
            "exceso_grados_objetivo": "excesoGradosObjetivo",
        }
    )

    return dataframe_records(renamed)


def build_availability_rows(df: pd.DataFrame) -> list[dict[str, Any]]:
    selected = df[
        [
            "grado",
            "peso_tallo_seed",
            "tallos_brutos",
            "tallos_netos",
            "tallos_usados_netos",
            "tallos_restantes_netos",
            "peso_total_gestionable",
            "peso_usado",
            "peso_restante",
            "mallas_usadas",
        ]
    ].copy()

    renamed = selected.rename(
        columns={
            "peso_tallo_seed": "pesoTalloSeed",
            "tallos_brutos": "tallosBrutos",
            "tallos_netos": "tallosNetos",
            "tallos_usados_netos": "tallosUsadosNetos",
            "tallos_restantes_netos": "tallosRestantesNetos",
            "peso_total_gestionable": "pesoTotalGestionable",
            "peso_usado": "pesoUsado",
            "peso_restante": "pesoRestante",
            "mallas_usadas": "mallasUsadas",
        }
    )

    return dataframe_records(renamed)


def build_matrix_payload(matrix_df: pd.DataFrame) -> dict[str, Any]:
    grade_labels = [int(label) for label in matrix_df.columns.tolist()]
    rows: list[dict[str, Any]] = []

    for sku, series in matrix_df.iterrows():
        values = {str(column): int(series[column]) for column in matrix_df.columns}
        rows.append(
            {
                "sku": str(sku),
                "values": values,
                "total": int(sum(values.values())),
            }
        )

    totals = {
        str(column): int(pd.to_numeric(matrix_df[column], errors="coerce").fillna(0).sum())
        for column in matrix_df.columns
    }

    return {
        "gradeLabels": grade_labels,
        "rows": rows,
        "totals": totals,
        "grandTotal": int(sum(totals.values())),
    }


def build_result_payload(payload: dict[str, Any]) -> dict[str, Any]:
    result = solve_pipeline(
        orders_df=pd.DataFrame(payload.get("orders", [])),
        availability_df=pd.DataFrame(payload.get("availability", [])),
        settings=payload.get("settings", {}),
        master_df=pd.DataFrame(payload.get("master", [])),
    )

    return {
        "stage1Summary": {
            key: float(value) if isinstance(value, (int, float, np.integer, np.floating)) else clean_value(value)
            for key, value in dict(result.stage1.summary).items()
        },
        "stage2Summary": {
            key: float(value) if isinstance(value, (int, float, np.integer, np.floating)) else clean_value(value)
            for key, value in dict(result.stage2.summary).items()
        },
        "solverMeta": {
            key: float(value) if isinstance(value, (int, float, np.integer, np.floating)) else clean_value(value)
            for key, value in dict(result.stage2.solver_meta).items()
        },
        "priorityRows": build_priority_rows(dict(result.stage1.summary)),
        "orderRows": build_order_rows(result.stage2.orders),
        "availabilityRows": build_availability_rows(result.stage2.availability),
        "matrix": build_matrix_payload(result.stage2.mallas_display),
    }


def main() -> int:
    if len(sys.argv) < 2:
        raise RuntimeError("Debes indicar el comando del puente: defaults o solve.")

    command = sys.argv[1].strip().lower()

    if command == "defaults":
        payload = build_defaults_payload()
    elif command == "solve":
        payload = build_result_payload(read_payload())
    else:
        raise RuntimeError(f"Comando no soportado: {command}")

    json.dump(payload, sys.stdout, ensure_ascii=True)
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover - runtime bridge
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
