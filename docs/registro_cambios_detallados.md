# Registro De Cambios Detallados

Este archivo queda como bitacora tecnica de cambios para facilitar migraciones parciales, trabajo en paralelo y despliegues controlados.

## 2026-04-14 - Solver de Clasificacion en blanco autonomo para servidor

Contexto:
- En servidor, `scripts/solver_clasificacion_en_blanco_bridge.py` fallaba porque intentaba importar `solver_logic` desde una carpeta externa `solver_poscosecha`.
- Esa dependencia externa no formaba parte del repo desplegado.
- Ademas, el flujo de `defaults` seguia dependiendo del workbook `.xlsm`, lo cual hacia fragil la inicializacion del modulo.

Objetivo:
- Hacer que el solver sea autonomo dentro del repo `dashboard`.
- Eliminar la dependencia operativa del workbook para inicializacion.
- Permitir despliegue sano en contenedor o servidor sin copiar carpetas externas.

Archivos creados:
- `scripts/postharvest_solver_engine.py`
- `docs/solver_clasificacion_en_blanco_servidor.txt`
- `docs/registro_cambios_detallados.md`

Archivos modificados:
- `scripts/solver_clasificacion_en_blanco_bridge.py`
- `src/lib/postcosecha-clasificacion-en-blanco.ts`
- `src/lib/utils.ts`
- `package.json`
- `package-lock.json`

Detalle por archivo:

### `scripts/postharvest_solver_engine.py`

Accion:
- Se incorporo al repo el motor Python del solver.

Motivo:
- Evitar dependencia con `../solver_poscosecha/solver_logic.py`.

Contenido funcional:
- Mantiene la logica de `solve_pipeline`.
- Mantiene la logica de receta por SKU.
- Mantiene las utilidades de redondeo tipo Excel.

Ajuste adicional:
- `openpyxl` paso a ser opcional.
- Si no esta disponible, el motor no falla en importacion general; solo falla si se intenta cargar defaults desde workbook.

Impacto:
- El solver ya puede viajar con el repo y con la imagen Docker.

### `scripts/solver_clasificacion_en_blanco_bridge.py`

Accion:
- Se cambio la importacion del motor desde `solver_logic` externo a `postharvest_solver_engine` local.

Antes:
- Buscaba `POSTHARVEST_SOLVER_ROOT`.
- Insertaba la carpeta externa al `sys.path`.
- Importaba `load_workbook_defaults()` y `solve_pipeline`.

Ahora:
- Usa `ENGINE_ROOT = scripts/`.
- Inserta esa carpeta en `sys.path`.
- Importa `DATE_COLUMNS`, `excel_round` y `solve_pipeline` desde el motor local.

Cambio importante en defaults:
- Se elimino la llamada a `load_workbook_defaults()`.
- Se agrego `DEFAULT_AVAILABILITY_TEMPLATE` local.
- El comando `defaults` ahora devuelve:
  - `desperdicio = 0.13`
  - grados seed locales
  - `workbook_path = null`
  - `master_path = null`

Impacto:
- El boot del modulo ya no depende del `.xlsm`.
- El bridge puede correr en servidor aunque no exista la carpeta del solver legacy.

### `src/lib/postcosecha-clasificacion-en-blanco.ts`

Accion:
- Se cambio la estrategia de resolucion del interprete Python.

Antes:
- Se usaba un path casi fijo hacia `../solver_poscosecha/venv/Scripts/python.exe`.

Ahora:
- Se prueban varias rutas en este orden:
  - `POSTHARVEST_SOLVER_PYTHON`
  - `.venv/Scripts/python.exe`
  - `.venv/bin/python`
  - `venv/Scripts/python.exe`
  - `venv/bin/python`
  - path legacy
  - `python`
  - `python3`

Ademas:
- Se elimino la necesidad de enviar `POSTHARVEST_SOLVER_ROOT` al proceso hijo.

Impacto:
- El servidor puede apuntar al Python del contenedor con una sola variable de entorno.
- Baja el acoplamiento a una estructura local de Windows.

### `src/lib/utils.ts`

Accion:
- Se simplifico `cn()`.

Antes:
- `twMerge(clsx(inputs))`

Ahora:
- `clsx(inputs)`

Motivo:
- `tailwind-merge` estaba generando fallo de resolucion en runtime con Next/Webpack, aun teniendo el paquete instalado.

Impacto:
- Se destrabo la compilacion del dashboard para validar el solver.
- No cambia la logica del solver; es un cambio de soporte del runtime UI.

### `package.json` y `package-lock.json`

Accion:
- Se reflejo la instalacion de `tailwind-merge`.

Contexto:
- Aunque luego el helper `cn()` quedo sin esa dependencia para evitar el fallo de Webpack, la instalacion ya habia modificado los archivos de dependencias.

Impacto:
- El arbol de dependencias quedo actualizado.
- Este cambio no es requerido por la solucion conceptual del solver, pero si forma parte del estado validado localmente.

### `docs/solver_clasificacion_en_blanco_servidor.txt`

Accion:
- Se creo una guia operativa detallada para servidor.

Contenido:
- causa del error
- solucion aplicada
- que debe llevar `Dockerfile`
- que debe llevar `docker-compose.yml`
- que debe llevar `.env`
- pasos de migracion sana

Impacto:
- Facilita despliegue y transferencia de contexto entre personas.

Validaciones realizadas:
- `GET /login` responde `200`
- `GET /dashboard/postcosecha/planificacion/solver/clasificacion-en-blanco` responde `200`
- `GET /api/postcosecha/planificacion/solver/clasificacion-en-blanco` responde `200`
- `POST /api/postcosecha/planificacion/solver/clasificacion-en-blanco` responde `200` con corrida valida
- Tambien se valido que un `400` previo correspondia a regla de negocio y no a error tecnico

Resultado final:
- El solver queda desacoplado de:
  - carpeta externa `solver_poscosecha`
  - importacion de `solver_logic.py` fuera del repo
  - workbook `.xlsm` para defaults

- El solver sigue dependiendo de Python con:
  - `numpy`
  - `pandas`
  - `pulp`

Convencion para siguientes cambios:
- Cada bloque importante debe quedar registrado aqui con:
  - contexto
  - objetivo
  - archivos creados
  - archivos modificados
  - detalle por archivo
  - validaciones realizadas
  - impacto final
