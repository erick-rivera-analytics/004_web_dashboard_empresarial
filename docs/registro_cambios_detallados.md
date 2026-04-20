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

## 2026-04-17 - Persistencia local y balance de sobrepeso en Clasificacion en blanco

Contexto:
- El usuario necesitaba conservar la configuracion cargada en el visualizador para repetir pruebas sin recapturar pedidos, lotes y seeds.
- Ademas, se detectaron dos inconsistencias:
  - algunos SKU resueltos no lograban cerrar receta final en la exportacion,
  - el sobrepeso podia concentrarse de forma excesiva en un SKU puntual, en vez de repartirse mejor.

Objetivo:
- Guardar automaticamente el caso de prueba en el navegador local.
- Reducir la probabilidad de recetas no exportables.
- Castigar la concentracion extrema de sobrepeso por SKU dentro del solver.

Archivos modificados:
- `src/components/dashboard/postcosecha-clasificacion-en-blanco-explorer.tsx`
- `src/components/dashboard/postcosecha-clasificacion-en-blanco-recipe-overlay.tsx`
- `src/lib/postcosecha-clasificacion-en-blanco-types.ts`
- `scripts/solver_clasificacion_en_blanco_bridge.py`
- `scripts/postharvest_solver_engine.py`

Detalle por archivo:

### `src/components/dashboard/postcosecha-clasificacion-en-blanco-explorer.tsx`

Accion:
- Se agrego persistencia automatica en `localStorage`.

Implementacion:
- Se creo la llave `postcosecha_clasificacion_en_blanco_draft_v1`.
- Se guarda automaticamente:
  - pedidos por SKU,
  - disponibilidad por grado,
  - `desperdicio`,
  - restricciones por orden,
  - configuracion de lotes.
- Al abrir el modulo, si existe un draft local valido, se hidrata sobre la plantilla base.
- Al recargar la base del solver, se vuelve a aplicar el draft guardado sobre la nueva estructura para no perder el caso de prueba.

Impacto:
- Desde esta version el usuario no deberia volver a capturar todo cada vez que refresca o reabre el modulo en el mismo navegador.

### `scripts/postharvest_solver_engine.py`

Accion:
- Se agrego una nueva capa de optimizacion para balancear el sobrepeso maximo por SKU.

Implementacion:
- Se introdujo la variable `stage2_max_overweight_ratio`.
- Por cada orden activa se restringe `over_ideal <= ratio_maximo * ideal_total_resuelto`.
- Despues de fijar la desviacion macro, el solver ahora minimiza primero ese ratio maximo antes de seguir con el sobrepeso total.

Impacto:
- Baja la probabilidad de que un SKU aislado quede extremadamente inflado mientras otros quedan mas limpios.
- El sobrepeso tiende a repartirse de forma mas pareja entre ordenes resueltas.

### `scripts/solver_clasificacion_en_blanco_bridge.py`

Accion:
- Se suavizo el armado de receta final por SKU.

Implementacion:
- Antes la receta exigia particion exacta de tallos por grado.
- Ahora permite un residuo minimo por grado mediante variables `unassigned_*`.
- El orden objetivo queda asi:
  - minimizar tallos sin receta,
  - minimizar penalidad de rango,
  - minimizar desviacion absoluta al ideal,
  - minimizar numero de recetas activas.
- Se agrega en el resumen `tallosSinReceta`.
- Si queda residuo, el estado de receta pasa a `Parcial`.

Impacto:
- Disminuyen los casos en que el PDF omitia por completo un SKU solo porque la particion exacta por grado era imposible.
- La receta sigue priorizando bunches cerrables y cercania al peso objetivo.

### `src/components/dashboard/postcosecha-clasificacion-en-blanco-recipe-overlay.tsx`

Accion:
- Se agrego visibilidad al residuo de receta.

Implementacion:
- Si `tallosSinReceta > 0`, el overlay muestra una alerta explicando que el solver priorizo cerrar bunches y peso antes que forzar una particion exacta por grado.

Impacto:
- El usuario puede distinguir entre una receta limpia y una receta parcial sin revisar logs.

### `src/lib/postcosecha-clasificacion-en-blanco-types.ts`

Accion:
- Se extendio el contrato de `RecipeSummary`.

Implementacion:
- Se agrego el campo opcional `tallosSinReceta`.

Impacto:
- El frontend puede renderizar la alerta de receta parcial sin romper compatibilidad con respuestas previas.
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

## 2026-04-14 - Compatibilidad de CBC en servidor para solver de postcosecha

Contexto:
- En servidor aparecio el error:
  - `Pulp: Error while trying to execute .../solverdir/cbc/linux/i64/cbc`
- Eso indica que PuLP estaba intentando usar su binario embebido de CBC.
- En contenedor, el proyecto venia usando `node:20-alpine`, y ese binario embebido suele fallar por compatibilidad de runtime.

Objetivo:
- Hacer que el solver use un `cbc` nativo del sistema en servidor.
- Evitar depender del ejecutable embebido de PuLP dentro del wheel.

Archivos modificados:
- `scripts/postharvest_solver_engine.py`
- `Dockerfile`
- `docker-compose.yml`

Detalle por archivo:

### `scripts/postharvest_solver_engine.py`

Accion:
- Se agrego una fabrica `build_cbc_solver()`.

Comportamiento:
- primero intenta `POSTHARVEST_CBC_PATH`
- luego intenta `shutil.which("cbc")`
- si encuentra un binario del sistema, usa:
  - `pulp.COIN_CMD(path=solver_path, ...)`
- si no encuentra un binario del sistema, recien ahi cae al:
  - `pulp.PULP_CBC_CMD(...)`

Variables nuevas soportadas:
- `POSTHARVEST_CBC_PATH`
- `POSTHARVEST_SOLVER_MSG`

Impacto:
- en servidor podemos obligar al solver a usar `/usr/bin/cbc`
- evitamos el fallo del binario embebido de PuLP

### `Dockerfile`

Accion:
- Se cambio la imagen base de:
  - `node:20-alpine`
  a:
  - `node:20-bookworm-slim`

Motivo:
- Alpine era una base fragil para el binario embebido de CBC y para el stack Python del solver.
- Debian slim es mas estable para `coinor-cbc`, `python3` y `pip`.

Cambios:
- instalacion de:
  - `python3`
  - `python3-pip`
  - `coinor-cbc`
- copia de:
  - `scripts/`
- instalacion de paquetes Python:
  - `numpy`
  - `pandas`
  - `pulp`

Impacto:
- el runtime productivo ya tiene Python y CBC del sistema
- el solver puede ejecutar sin depender del binario embebido de PuLP

### `docker-compose.yml`

Accion:
- Se agregaron variables explicitas:
  - `POSTHARVEST_SOLVER_PYTHON=/usr/bin/python3`
  - `POSTHARVEST_CBC_PATH=/usr/bin/cbc`

Impacto:
- la resolucion del solver queda deterministica en contenedor

Resultado esperado:
- el servidor ya no deberia intentar usar:
  - `.../site-packages/pulp/.../solverdir/cbc/linux/i64/cbc`
- y deberia usar:
  - `/usr/bin/cbc`

## 2026-04-14 - Ajuste de prioridades del solver para preservar fechas y acercar peso

Contexto:
- Se comparo una corrida reconstruida desde el Excel fuente contra el solver ya migrado a CoreX.
- La prioridad de negocio aclarada por usuario es:
  - primero respetar prioridad de ordenes por fecha
  - despues minimizar sobrepeso
- En el modelo previo habia dos sintomas:
  - la etapa 2 congelaba exactamente la combinacion binaria de grados despues de minimizar `total_grades`
  - la etapa 1 seguia distribuyendo bunches entre SKU usando como criterio final `fulfilled_ideal_opt`, sin mirar peso estimado por grado

Objetivo:
- Mantener intacta la prioridad lexicografica por fechas.
- Darle mas peso real a la minimizacion de sobrepeso dentro del espacio ya fijado por fechas.
- Evitar que una combinacion arbitraria de grados quede congelada antes del desempate por peso.

Archivos modificados:
- `scripts/postharvest_solver_engine.py`

Detalle por archivo:

### `scripts/postharvest_solver_engine.py`

Cambio 1:
- Se elimino el congelamiento exacto de `stage2_u` por pedido/grado luego de minimizar `total_grades`.

Antes:
- el solver resolvia `total_grades_opt`
- luego fijaba cada binaria `stage2_u[o,g] == valor_optimo_encontrado`
- despues minimizaba `actual_weight_expr`

Problema:
- si habia varias soluciones con el mismo `total_grades_opt`, CBC podia dejar una combinacion arbitraria de grados
- esa combinacion quedaba congelada
- el solver perdia libertad para bajar peso dentro de ese mismo optimo de forma

Ahora:
- se conserva solo la restriccion agregada sobre `total_grades_expr`
- no se fija la combinacion exacta de binarios

Impacto:
- el solver mantiene libertad de bajar peso sin romper el optimo ya alcanzado en cantidad total de grados.

Cambio 2:
- Se movio la minimizacion de `actual_weight_expr` por delante de las penalizaciones de forma (`extra_grades_expr` y `total_grades_expr`).

Nueva secuencia de etapa 2:
- minimizar `preferred_violation_expr`
- minimizar `overweight_expr`
- minimizar `ideal_deviation_expr`
- minimizar `actual_weight_expr`
- minimizar `extra_grades_expr`
- minimizar `total_grades_expr`

Motivo:
- el costo real del proceso esta mas asociado al sobrepeso que a usar una combinacion ligeramente mas rica de grados

Impacto:
- la mezcla fina pasa a priorizar peso antes que simplicidad estetica de la solucion

Cambio 3:
- Se agrego una capa nueva en etapa 1 para aproximar peso antes de fijar bunches por SKU.

Variables nuevas:
- `stage1_weights`
- `stage1_over_ideal`
- `stage1_under_ideal`

Restricciones nuevas:
- balance de peso estimado por pedido desde `stage1_x * peso_tallo_seed`
- sobrepeso estimado respecto al ideal
- desviacion por debajo del ideal

Nueva secuencia de etapa 1 despues de fijar prioridad por fechas:
- minimizar `stage1_overweight_expr`
- minimizar `stage1_ideal_deviation_expr`
- maximizar `fulfilled_ideal_expr`

Motivo:
- la etapa 1 si tiene informacion suficiente para aproximar peso, porque ya distribuye tallos por grado
- eso permite que la asignacion de bunches por SKU se haga mirando fechas primero y peso despues

Metricas nuevas en `solver_meta`:
- `stage1_overweight_opt`
- `stage1_ideal_deviation_opt`
- `stage1_status_overweight`
- `stage1_status_ideal`

Validacion puntual realizada:
- se reconstruyo un caso inspirado en el screenshot del Excel con disponibilidad y pedidos visibles
- se mantuvo la prioridad total en `fecha_1`
- se comparo el macro sobrepeso antes y despues del ajuste

Resultado comparativo del caso reconstruido:
- antes del ajuste:
  - `sobrepeso_pct_macro = 0.0916495030`
  - `peso_ideal_resuelto_total = 206250.0`
  - `peso_real_total = 225152.71`
- despues del ajuste:
  - `sobrepeso_pct_macro = 0.0914718252`
  - `peso_ideal_resuelto_total = 206000.0`
  - `peso_real_total = 224843.196`

Lectura tecnica del resultado:
- hubo mejora real, pero marginal
- el modelo ahora respeta mejor el criterio de peso dentro de la misma prioridad por fechas
- la brecha grande contra el Excel sigue indicando una restriccion estructural pendiente

Hipotesis principal abierta:
- `tallos_min` sigue condicionando demasiado temprano la cantidad de bunches resueltos
- eso puede dejar a la etapa 2 optimizando un espacio ya demasiado estrecho

Impacto final:
- el modelo queda mejor alineado con la prioridad de negocio:
  - fechas primero
  - peso despues
- ya no se congela una mezcla arbitraria de grados antes del desempate por peso
- aun falta una segunda iteracion para acercarnos mas al comportamiento del Excel

## 2026-04-15 - Variante de rangos de tallos suaves con flexibilidad acotada por bunch

Contexto:
- Se definio como criterio de negocio que el modelo debe minimizar sobrepeso de la forma mas eficiente posible.
- Se aclaro que:
  - el Excel no debe gobernar la solucion nueva
  - `tallos_min` y `tallos_max` pueden castigarse, pero no deben ser muros absolutos
  - usar 4 grados en vez de 3 es aceptable si mejora peso

Problema observado:
- con `tallos_min/max` como restricciones duras, el caso reconstruido quedaba con `sobrepeso_pct_macro = 9.147%`
- al relajar completamente los tallos, el solver cumplia demasiados bunches pero se iba masivamente por debajo del peso objetivo

Objetivo:
- permitir una relajacion controlada de tallos
- mantener prioridad por fechas
- bajar sobrepeso sin abrir una puerta a soluciones inviables por subpeso extremo

Archivos modificados:
- `scripts/postharvest_solver_engine.py`

Detalle por archivo:

### `scripts/postharvest_solver_engine.py`

Cambio 1:
- Se convirtieron `tallos_min` y `tallos_max` en restricciones suaves tanto en etapa 1 como en etapa 2.

Variables nuevas en etapa 1:
- `stage1_stem_shortfall`
- `stage1_stem_overrun`

Variables nuevas en etapa 2:
- `stage2_stem_shortfall`
- `stage2_stem_overrun`

Nueva logica:
- en vez de exigir:
  - `stems >= tallos_min * bunches`
  - `stems <= tallos_max * bunches`
- ahora se permite violacion con variables de holgura penalizadas

Cambio 2:
- Se agrego un limite de flexibilidad por bunch:
  - `SOFT_STEM_FLEX_PER_BUNCH = 1.0`

Interpretacion:
- por cada bunch resuelto, el solver puede apartarse hasta 1 tallo del rango objetivo
- eso evita la relajacion total que llevaba a subpesos extremos

Cambio 3:
- Se agrego una nueva fase de minimizacion de desviacion de tallos en ambas etapas.

Orden relevante despues del ajuste:
- prioridad por fechas
- sobrepeso
- desviacion respecto al ideal
- desviacion de tallos
- luego forma de mezcla y total de grados

Cambio 4:
- Se agregaron campos de trazabilidad al resultado por SKU:
  - `desviacion_tallos_bajo`
  - `desviacion_tallos_sobre`

Metricas nuevas en `solver_meta`:
- `stem_violation_opt`
- `stage1_status_stems`
- `stage1_stem_violation_opt`
- `stage2_status_stems`

Validacion puntual realizada:
- se corrio el mismo caso reconstruido de la orden de referencia
- se compararon tres escenarios:
  - rigido
  - relajacion total
  - relajacion acotada a 1 tallo por bunch

Resultados:

Escenario rigido:
- `fecha_1 resuelta = 271`
- `sobrepeso_pct_macro = 9.147%`

Escenario relajacion total:
- `fecha_1 resuelta = 1352`
- `sobrepeso_pct_macro = -78.416%`
- conclusion:
  - el solver cumplia todo, pero a costa de quedar muy por debajo del peso ideal

Escenario relajacion acotada:
- `fecha_1 resuelta = 284`
- `sobrepeso_pct_macro = 3.820%`
- `pedidos_en_objetivo = 3`
- `pedidos_fuera_objetivo = 0`
- `pedidos_sin_resolver = 3`

Resultado por SKU en la variante acotada:
- `1000x22`
  - `pedido_resuelto = 11`
  - `peso_real_bunch = 1029.57`
  - `sobrepeso_pct = 2.96%`
  - `desviacion_tallos_bajo = 11`
  - `grados_usados = 4`
- `750x20`
  - `pedido_resuelto = 152`
  - `peso_real_bunch = 793.22`
  - `sobrepeso_pct = 5.76%`
  - `desviacion_tallos_bajo = 152`
  - `grados_usados = 4`
- `750x22`
  - `pedido_resuelto = 121`
  - `peso_real_bunch = 761.14`
  - `sobrepeso_pct = 1.48%`
  - `desviacion_tallos_bajo = 121`
  - `grados_usados = 3`

Lectura tecnica:
- la flexibilidad acotada mejora mucho el sobrepeso macro frente al modelo rigido
- el patron emergente es consistente:
  - el solver usa 1 tallo menos por bunch en los SKU que logra resolver
  - cuando conviene, usa 4 grados aunque el objetivo fuera 3
- esto esta alineado con la regla funcional definida por negocio

Impacto final:
- ya existe una variante mas eficiente para minimizar sobrepeso
- la mejora del caso reconstruido fue de `9.147%` a `3.820%`
- el siguiente frente de trabajo ya no es soltar mas los tallos, sino decidir si:
  - esa flexibilidad de 1 tallo por bunch queda fija
  - se parametriza por SKU
  - o se conecta a la receta para que el armado fino empuje antes la seleccion de bunches

## 2026-04-15 - Regla de europeos y bandas dinamicas de peso

Contexto:
- Se definio una regla operativa nueva:
  - la relajacion de 1 tallo no aplica a todos los SKU
  - solo aplica a SKU tipo `750x...` y `1000x...`
  - no aplica a SKU con `5x5`
  - no aplica a SKU que contengan `EX`
- Tambien se definio que los rangos de peso no deben depender del Excel y que deben evaluarse con dos escalas:
  - una estabilidad macro objetivo en torno a `97%-101%`
  - una banda micro por SKU que depende del peso ideal del propio SKU

Objetivo:
- convertir la relajacion de tallos en una regla explicita por familia de SKU
- introducir bandas dinamicas de peso que se parezcan a los ejemplos funcionales:
  - `1000x22`: alrededor de `970-1030`
  - `90`: alrededor de `82-95`

Archivos modificados:
- `scripts/postharvest_solver_engine.py`

Detalle por archivo:

### `scripts/postharvest_solver_engine.py`

Cambio 1:
- Se agrego la deteccion `sku_allows_euro_stem_flex()`.

Regla aplicada:
- devuelve `true` solo si el nombre del SKU contiene `750x` o `1000x`
- devuelve `false` si contiene `5x5`
- devuelve `false` si contiene `EX`

Impacto:
- la flexibilidad de tallos ya no se aplica a `750 de 5x5`, `1000 de 5x5` ni SKU especiales con `EX`

Cambio 2:
- Se reemplazo la flexibilidad fija por `stem_flex_per_bunch(sku)`.

Resultado:
- SKU europeos permitidos:
  - hasta `1` tallo de desviacion por bunch
- demas SKU:
  - `0` tallos de desviacion

Cambio 3:
- Se agrego `dynamic_weight_bounds(ideal_bunch_weight)`.

Formula:
- limite inferior:
  - `ideal - max(ideal * 0.03, 8)`
- limite superior:
  - `ideal + max(ideal * 0.03, 5)`

Ejemplos:
- ideal `1000`:
  - `970 - 1030`
- ideal `90`:
  - `82 - 95`

Impacto:
- la banda micro ya no depende de una proporcion fija universal
- ahora se mueve por magnitud del SKU

Cambio 4:
- Se actualizo el calculo de `estado_peso` y de las columnas de salida para usar:
  - `peso_min_dinamico`
  - `peso_max_dinamico`

Cambio 5:
- Se agrego castigo macro de peso en etapa 1 y etapa 2 usando:
  - `MACRO_WEIGHT_MIN_RATIO = 0.97`
  - `MACRO_WEIGHT_MAX_RATIO = 1.01`

Variables nuevas:
- `stage1_macro_low`
- `stage1_macro_high`
- `stage2_macro_low`
- `stage2_macro_high`

Metricas nuevas:
- `stage1_macro_violation_opt`
- `macro_violation_opt`
- `stage1_status_macro`
- `stage2_status_macro`

Validacion puntual:
- se corrio nuevamente el caso reconstruido de referencia

Resultado:
- el modelo mantuvo:
  - `fecha_1 resuelta = 284`
  - `sobrepeso_pct_macro = 3.820%`
- o sea:
  - la nueva banda macro ya quedo incorporada al modelo
  - pero en este caso no logra empujar la solucion a `<= 1%`

Lectura tecnica:
- esto indica que el problema ya no era ausencia de castigo
- el cuello de botella actual parece estar en la factibilidad combinada de:
  - prioridad por fecha
  - disponibilidad por grado
  - solo `1` tallo de flexibilidad en SKU europeos

Impacto final:
- la logica ya refleja mejor las reglas reales del negocio
- la estabilidad macro deseada esta modelada, pero no siempre es alcanzable con la flexibilidad actual
- el siguiente frente no es agregar mas castigo, sino ampliar capacidad de maniobra donde haga sentido:
  - flexibilidad por SKU
  - mas grados permitidos en ciertos SKU
  - o empujar la receta mas temprano en la optimizacion

## 2026-04-15 - Pruebas de matriz por SKU y experimento de receta temprana

Contexto:
- Se pidio probar una matriz de flexibilidad distinta por SKU.
- Tambien se pidio probar la hipotesis de empujar la receta antes para ver si eso ayuda a optimizar mejor el sobrepeso.

Objetivo:
- medir si una flexibilidad no uniforme mejora el caso de referencia
- medir si existe una brecha real entre:
  - el mejor peso recetable posible por SKU
  - y el peso que termina construyendo el solver actual

Archivos modificados:
- no se agregaron archivos nuevos
- se mantuvo la instrumentacion ya creada en:
  - `scripts/postharvest_solver_engine.py`
  - `docs/registro_cambios_detallados.md`

Prueba 1 - Matriz por SKU:

Escenarios probados:
- `actual_regla`
  - flex actual del motor
- `propuesta_usuario`
  - `1000x22 = 2`
  - `750x20 = 1`
  - `750x22 = 1`
  - `750x25 = 2`
- `agresiva_europeos`
  - `1000x22 = 2`
  - `750x20 = 2`
  - `750x22 = 2`
  - `750x25 = 2`
- `mixta_25_fuerte`
  - `1000x22 = 2`
  - `750x20 = 1`
  - `750x22 = 1`
  - `750x25 = 3`

Resultados macro:
- `actual_regla`
  - `fecha_1 resuelta = 284`
  - `sobrepeso_pct_macro = 3.820%`
- `propuesta_usuario`
  - `fecha_1 resuelta = 285`
  - `sobrepeso_pct_macro = 3.782%`
- `agresiva_europeos`
  - `fecha_1 resuelta = 299`
  - `sobrepeso_pct_macro ≈ 0.000%`
- `mixta_25_fuerte`
  - `fecha_1 resuelta = 285`
  - `sobrepeso_pct_macro = 3.782%`

Lectura:
- la propuesta moderada mejora muy poco frente a la regla actual
- el cambio fuerte aparece cuando los europeos reciben `2` tallos de flexibilidad
- en esa prueba agresiva el macro peso queda practicamente perfecto

Advertencia:
- la variante agresiva consigue ese ajuste a costa de:
  - mas desviacion de tallos
  - mas grados usados en algunos SKU
- por eso no debe tomarse como regla final sin validacion operativa

Prueba 2 - Receta temprana como diagnostico:

Metodo:
- se hizo una prueba de receta por SKU antes del reparto final
- no se reemplazo el solver principal
- se comparo:
  - `peso_real_bunch` del solver actual
  - mejor `peso_por_bunch` recetable teorico por SKU
- esta prueba ignora el acoplamiento total de stock entre SKU
- sirve como diagnostico, no como solucion final cerrada

Resultados:

`1000x22`
- actual:
  - `1082.09`
- mejor receta teorica:
  - `1000.00`
- composicion ejemplo:
  - `45x15`
  - `50x3`
  - `70x2`
- conclusion:
  - hay brecha real entre lo que se podria armar y lo que el solver esta dejando armado

`750x20`
- actual:
  - `779.15`
- mejor receta teorica:
  - `750.00`
- composicion ejemplo:
  - `25x1`
  - `40x16`
  - `75x1`
- conclusion:
  - tambien hay brecha real

`750x22`
- actual:
  - `774.04`
- mejor receta teorica:
  - `750.00`
- composicion ejemplo:
  - `25x1`
  - `30x7`
  - `35x4`
  - `40x9`
- conclusion:
  - una receta temprana podria ayudar especialmente aqui

`750x25`
- actual:
  - no resuelto
- mejor receta teorica:
  - `749.99`
- composicion ejemplo:
  - `25x14`
  - `35x7`
  - `50x2`
- conclusion:
  - este SKU no esta entrando hoy, pero teoricamente si tiene una receta micro muy buena

Lectura tecnica del experimento:
- la receta temprana si muestra potencial real
- el problema actual no parece ser falta de castigo en el final
- parece ser que la etapa de asignacion global no esta reservando una mezcla de grados compatible con buenas recetas micro

Impacto final:
- la matriz moderada por SKU no cambia mucho por si sola
- la matriz agresiva muestra que mas maniobra si puede bajar dramaticamente el sobrepeso
- la receta temprana si merece ser empujada antes en la optimizacion, porque existe brecha demostrable entre:
  - lo mejor recetable por SKU
  - y lo que sale del solver actual

## 2026-04-15 - Flexibilidad europea de 2 tallos hacia abajo y receta temprana integrada

Contexto:
- Se definio una nueva regla funcional:
  - para europeos, la flexibilidad no debe ser una matriz por SKU
  - debe ser una regla uniforme de `2` tallos hacia abajo
  - hacia arriba no se habilita flexibilidad adicional
- Tambien se decidio probar una integracion real de receta antes, para que el solver piense en tallos armables desde la etapa temprana y solo despues lo baje a mallas para ejecucion

Objetivo:
- reemplazar la flexibilidad europea de `1` tallo por `2` tallos hacia abajo
- empujar una senal de receta a etapa 1 y etapa 2
- medir si eso baja el sobrepeso macro sin depender del Excel como regla

Archivos modificados:
- `scripts/postharvest_solver_engine.py`

Detalle por archivo:

### `scripts/postharvest_solver_engine.py`

Cambio 1:
- Se reemplazo la funcion unica de flexibilidad por dos funciones:
  - `stem_shortfall_flex_per_bunch()`
  - `stem_overrun_flex_per_bunch()`

Nueva regla:
- SKU europeos (`750x...` y `1000x...`, excepto `5x5` y `EX`)
  - `2` tallos de flexibilidad hacia abajo
  - `0` tallos de flexibilidad hacia arriba
- resto de SKU
  - `0` tallos de flexibilidad

Impacto:
- el modelo deja de usar una matriz manual por SKU
- la regla queda compacta y consistente con negocio

Cambio 2:
- Se agrego un helper cacheado de receta temprana:
  - `_integer_compositions()`
  - `best_recipe_signature()`

Funcion:
- para cada SKU, con sus grados activos y pesos por tallo disponibles, busca una firma de receta temprana
- minimiza:
  - penalidad de rango
  - desviacion absoluta contra el ideal
  - tallos por bunch

Salida:
- devuelve `preferred_recipe_stems`
- esa senal luego se usa en el solver principal como objetivo temprano

Cambio 3:
- Se agrego una nueva variable de gap de receta en etapa 1:
  - `stage1_recipe_stem_gap`

Uso:
- penaliza la distancia entre los tallos resueltos del SKU y los tallos sugeridos por la firma de receta temprana

Nueva fase de objetivo en etapa 1:
- despues de prioridad por fechas
- despues de macro
- se minimiza `stage1_recipe_gap_expr`

Cambio 4:
- Se agrego una nueva variable de gap de receta en etapa 2:
  - `stage2_recipe_stem_gap`

Uso:
- empuja al reparto fino de tallos a quedarse cerca de la receta sugerida

Nueva fase de objetivo en etapa 2:
- despues de macro y desviacion contra ideal
- antes del resto de ajustes finales
- se minimiza `recipe_gap_expr`

Cambio 5:
- Se agrego trazabilidad nueva:
  - `desviacion_tallos_receta`

Metricas nuevas en `solver_meta`:
- `stage1_status_recipe`
- `stage1_recipe_gap_opt`
- `stage2_status_recipe`
- `recipe_gap_opt`

Validacion puntual:
- se corrio el mismo caso reconstruido de referencia con esta variante

Resultado macro:
- `fecha_1 resuelta = 299`
- `peso_real_total = 225384.85`
- `peso_ideal_resuelto_total = 225500.0`
- `sobrepeso_real_vs_ideal = -115.15`
- `sobrepeso_pct_macro = -0.051%`

Lectura:
- el macro peso quedo practicamente neutral
- se resolvieron mas bunches que en la regla anterior:
  - antes: `284`
  - ahora: `299`

Resultado por SKU:

`1000x22`
- `pedido_resuelto = 5`
- `peso_real_bunch = 988.276`
- `sobrepeso_pct = -1.17%`
- `desviacion_tallos_bajo = 10`
- `grados_usados = 2`
- `estado_peso = Dentro de objetivo`

`750x20`
- `pedido_resuelto = 152`
- `peso_real_bunch = 749.881`
- `sobrepeso_pct = -0.016%`
- `desviacion_tallos_bajo = 287.00058`
- `desviacion_tallos_receta = 135.00007`
- `grados_usados = 4`
- `estado_peso = Dentro de objetivo`

`750x22`
- `pedido_resuelto = 142`
- `peso_real_bunch = 749.729`
- `sobrepeso_pct = -0.036%`
- `desviacion_tallos_bajo = 284.0`
- `desviacion_tallos_receta ≈ 0`
- `grados_usados = 5`
- `estado_peso = Dentro de objetivo`

No resueltos:
- `1000 de 5x5`
- `750 de 5x5`
- `750x25`

Lectura tecnica final:
- esta es la mejor variante probada hasta ahora
- la receta temprana si movio el problema en la direccion correcta
- ya no se trata solo de castigar mejor, sino de reservar una estructura de tallos armable desde antes
- el costo de esta mejora es:
  - mas flexibilidad real en tallos hacia abajo
  - mayor uso de grados en algunos SKU

Impacto final:
- la combinacion ganadora del experimento fue:
  - europeos con `2` tallos hacia abajo
  - receta temprana integrada como objetivo del solver
- esta variante dejo el macro peso practicamente en equilibrio y aumento bunches resueltos

## 2026-04-16 - Clasificacion en blanco: restricciones estrictas/suaves por orden

Contexto:
- En el flujo de `Postcosecha > Planificacion > Solver > Clasificacion en blanco` se estaba refinando la captura por orden y origen.
- La regla requerida fue separar claramente:
  - el origen real del lote dentro de `Fechas de lote`
  - la restriccion de optimizacion dentro de `Administrar ordenes`
- La restriccion ahora puede ser `Suave` o `Estricta`.

Archivos modificados:
- `src/components/dashboard/postcosecha-clasificacion-en-blanco-explorer.tsx`
- `src/lib/postcosecha-clasificacion-en-blanco.ts`
- `src/lib/postcosecha-clasificacion-en-blanco-client.ts`
- `src/lib/postcosecha-clasificacion-en-blanco-types.ts`

Cambio 1:
- Se agrego `restrictionMode` al slot de orden:
  - `SOFT`
  - `STRICT`

Uso:
- `STRICT` significa que la orden solo puede resolverse con el origen seleccionado.
- `SOFT` significa que la orden prioriza el origen seleccionado, pero puede continuar con los siguientes origenes si queda saldo por resolver.

Jerarquia aplicada:
- `GV`
- `APERTURA`
- `PRECLASIFICACION`

Regla concreta:
- una orden sin restriccion entra desde `GV` y, si queda saldo, continua a `APERTURA` y luego `PRECLASIFICACION`
- una orden con restriccion suave `GV` sigue el mismo orden `GV > APERTURA > PRECLASIFICACION`
- una orden con restriccion suave `APERTURA` empieza en `APERTURA` y puede continuar a `PRECLASIFICACION`
- una orden con restriccion suave `PRECLASIFICACION` solo cae en `PRECLASIFICACION`
- una orden con restriccion estricta solo puede aparecer en la matriz del origen elegido

Cambio 2:
- Se centralizo la lista oficial de corridas en:
  - `POSCOSECHA_CLASIFICACION_RUN_MODES`

Motivo:
- evitar que UI, prevalidacion cliente y ejecucion servidor usen listas distintas
- mantener la secuencia unica `GV > APERTURA > PRECLASIFICACION`

Cambio 3:
- La ejecucion del solver ahora trabaja de forma secuencial.

Antes:
- cada origen podia intentar resolver la misma demanda completa de forma independiente.

Ahora:
- `GV` resuelve primero lo elegible
- se descuenta lo resuelto de los pedidos pendientes
- `APERTURA` recibe solo el saldo pendiente elegible
- se vuelve a descontar lo resuelto
- `PRECLASIFICACION` recibe el saldo final elegible

Impacto:
- evita duplicar demanda entre matrices
- respeta mejor la prioridad de `Orden 1`, `Orden 2`, etc.
- permite que la restriccion suave funcione como preferencia real de origen y no como bloqueo duro

Cambio 4:
- La validacion previa por modo se ajusto para mostrar holgura sin bloquear cuando existe mas disponibilidad que pedido minimo.

Motivo:
- en una corrida por origen puede existir mas tallo disponible que demanda pendiente
- eso no debe impedir que el solver resuelva lo necesario y deje saldo sin usar

Mensaje nuevo:
- si la diferencia es negativa, la UI indica que hay mas tallos disponibles que pedidos minimos y que el solver usara lo necesario

Cambio 5:
- Se limpio la etiqueta visual principal de las ordenes.

Antes:
- podia verse como `Orden 1 | lote GV`

Ahora:
- se muestra como `Orden 1 | GV`
- si hay restriccion, se agrega:
  - `restr. GV suave`
  - `restr. GV estricta`

Validaciones realizadas:
- sintaxis TypeScript focalizada con `typescript.transpileModule`
- archivos validados:
  - `postcosecha-clasificacion-en-blanco-explorer.tsx`
  - `postcosecha-clasificacion-en-blanco.ts`
  - `postcosecha-clasificacion-en-blanco-client.ts`
  - `postcosecha-clasificacion-en-blanco-types.ts`

Resultado:
- los cuatro archivos pasaron sintaxis TypeScript sin diagnosticos
- la ruta local respondio `200`:
  - `http://localhost:3000/dashboard/postcosecha/planificacion/solver/clasificacion-en-blanco`

Validacion no completada:
- `npm run typecheck` sigue bloqueado por un error externo ya existente en `node_modules/csstype/index.d.ts`
- `eslint` no pudo ejecutarse porque falta `node_modules/hermes-parser/dist/index.js`

Nota de migracion:
- si este cambio se lleva al servidor, asegurar que tambien viajen juntos los cuatro archivos listados arriba
- no requiere cambios de base de datos
- no requiere variables nuevas en `.env`

## 2026-04-16 - Correccion: ordenes de SKU independientes de fechas de lote

Contexto:
- Se detecto que la primera implementacion seguia usando una sola estructura para dos conceptos diferentes:
  - prioridades de pedidos por SKU
  - fechas de lote de disponibilidad por grado
- Eso hacia que `Orden 1` pareciera conectada a una fecha/origen de lote, cuando en realidad son capturas independientes.

Correccion aplicada:
- Se separo el modelo en dos listas:
  - `orderSlots`
  - `lotSlots`

`orderSlots`:
- controla las columnas de `Pedidos por SKU`
- representa `Orden 1`, `Orden 2`, etc.
- contiene solamente:
  - `key`
  - `restriction`
  - `restrictionMode`
- no contiene fecha de lote
- no contiene origen real del lote

`lotSlots`:
- controla las columnas de `Disponibilidad por grado`
- representa las fechas de lote disponibles que el usuario necesita capturar
- contiene solamente:
  - `key`
  - `lotDate`
  - `origin`
- no contiene restriccion de optimizacion de pedidos

Impacto funcional:
- ahora el usuario puede crear `n` ordenes de SKU para capturar demanda
- de forma independiente, puede crear `n` fechas de lote para capturar disponibilidad
- eliminar una orden solo limpia pedidos de esa columna
- eliminar una fecha de lote solo limpia disponibilidad de esa columna
- ya no se asume que `Orden 1` corresponde a la primera fecha de lote

Impacto en solver:
- el solver sigue usando las columnas tecnicas `fecha_1` a `fecha_5` por compatibilidad con el motor Python
- esas columnas ya no significan una relacion directa entre pedidos y disponibilidad
- para pedidos, las columnas significan prioridad de orden
- para disponibilidad, las columnas significan fecha de lote disponible

Prevalidacion:
- `buildClasificacionPrecheck` ahora recibe:
  - `orderSlots`
  - `lotSlots`
- los pedidos se filtran por restriccion de orden
- la disponibilidad se filtra por origen del lote

Ejecucion:
- `runClasificacionEnBlancoSolver` ahora sanitiza ambas listas por separado
- mantiene compatibilidad temporal con `dateSlots` si llega un payload antiguo
- la ejecucion secuencial por origen se conserva:
  - `GV`
  - `APERTURA`
  - `PRECLASIFICACION`

UI:
- `Administrar ordenes` ya no menciona origen ni fecha de lote
- `Fechas de lote` permite agregar/eliminar fechas de disponibilidad de manera independiente
- la tabla de cumplimiento por orden ya no muestra una columna de `Fecha lote`, porque esa relacion no existe

Validacion:
- `npm run typecheck` paso correctamente
- la ruta local respondio `200`:
  - `http://localhost:3000/dashboard/postcosecha/planificacion/solver/clasificacion-en-blanco`

## 2026-04-16 - Ajustes de UX y validacion para captura de pedidos/lotes

Contexto:
- Se detectaron cinco mejoras operativas en `Clasificacion en blanco`:
  - la cabecera de disponibilidad seguia mostrando `Orden n`
  - en captura de pedidos faltaba ver el peso ideal de referencia
  - la restriccion `suave` seguia quedando demasiado amarrada al origen elegido
  - la captura principal se estaba volviendo ancha e incomoda
  - faltaban indicadores previos de peso promedio y sobrepeso esperado

Cambio 1:
- La etiqueta visual de disponibilidad por lote ahora usa el `origen` configurado.

Antes:
- `Orden 1 - 10/04/2026`

Ahora:
- `GV - 10/04/2026`
- `APERTURA - sin fecha`

Motivo:
- en disponibilidad no estamos viendo ordenes
- estamos viendo lotes con un origen real

Cambio 2:
- En la captura por orden, debajo de cada SKU ahora se muestra:
  - `Peso ideal: X g`

Fuente:
- se toma del maestro activo de SKU

Cambio 3:
- La logica de restriccion `suave` se devolvio a flexible real.

Regla actual:
- si una orden tiene restriccion `STRICT`, solo entra al origen elegido
- si una orden tiene restriccion `SOFT`, puede completarse con cualquier origen disponible

Impacto:
- los sobrantes de `GV` o `APERTURA` ya pueden caer en ordenes suaves que todavia no se completaron
- esto evita perder tallos disponibles cuando el negocio espera reasignacion flexible

Cambio 4:
- Se agrego un nuevo validador macro:
  - `Holgura flexible`

Funcion:
- toma todas las ordenes no estrictas
- las compara contra toda la disponibilidad cargada
- entrega una lectura global de saldo o faltante antes de ejecutar

Uso:
- complementa las holguras por corrida (`GV`, `APERTURA`, `PRECLASIFICACION`)
- no reemplaza esas validaciones, pero da la lectura total del pool flexible

Cambio 5:
- Se agregaron KPIs previos de peso:
  - `Peso tallo disponible`
  - `Peso tallo requerido`
  - `Sobrepeso esperado`
  - `Eficiencia estimada`

Formula base:
- peso tallo disponible:
  - `peso_total_gestionable / tallos_netos`
- peso tallo requerido:
  - `peso_ideal_total / tallos_minimos_totales`
- sobrepeso esperado:
  - `(peso_tallo_disponible / peso_tallo_requerido) - 1`
- eficiencia estimada:
  - `peso_tallo_requerido / peso_tallo_disponible`

Lectura:
- sirven como señal previa del problema antes de correr el solver
- no sustituyen la optimizacion, pero ayudan a anticipar si el lote viene pesado o liviano

Cambio 6:
- La captura principal se paso a modo resumen + edicion en ventana.

Pedidos por SKU:
- en el principal solo se muestran tarjetas resumen por orden
- cada tarjeta tiene:
  - total de bunches
  - SKU activos
  - restriccion aplicada
  - boton `Modificar`

Disponibilidad por grado:
- en el principal solo se muestran tarjetas resumen por lote
- cada tarjeta tiene:
  - lote
  - origen y fecha
  - mallas totales
  - tallos netos estimados
  - boton `Modificar`

Captura fina:
- al abrir `Modificar`, la edicion se hace en una ventana flotante
- pedidos:
  - una sola columna para la orden activa
  - con filtro de SKU
- lotes:
  - una sola columna para el lote activo
  - pensada para tabular verticalmente

Validacion tecnica:
- `npm run typecheck` paso correctamente
- la ruta local siguio respondiendo `200`
