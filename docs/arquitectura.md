# Arquitectura del proyecto

## 1. Objetivo

`Atlas Empresarial` es una base de dashboard enfocada en operacion agricola. No busca ser un template generico sino un punto de partida estable para construir dashboards internos sobre datos reales.

La arquitectura se diseno con estas prioridades:

- separar shell visual y dominio
- mantener acceso a datos fuera de la UI
- facilitar crecimiento por modulos
- dejar claro que partes son reales y cuales son seed o placeholder
- reducir el ruido del legado archivandolo fuera del `src/` activo

## 2. Principios de la base

### 2.1. Shell primero

El layout principal, el sidebar, el header y el footer se resuelven una sola vez. Los modulos se enchufan a esa estructura en lugar de reconstruir navegacion y marco visual en cada pagina.

### 2.2. Dominio antes que componente

La parte importante vive en `src/lib/`. La UI idealmente consume payloads ya transformados, con nombres y formatos adecuados para presentacion.

### 2.3. UI contenida

Se mantienen pocos componentes base y pocos patrones visuales. La complejidad se deja en el dominio y en la interpretacion de datos, no en una libreria enorme de componentes innecesarios.

### 2.4. Evolucion incremental

La base convive con codigo legado en `borrar/`, pero el proyecto activo se mantiene pequeno. Esto permite avanzar sin arrastrar toda la plantilla original.

## 3. Capas de la aplicacion

## 3.1. Capa de enrutamiento

Responsabilidad:

- definir paginas y endpoints
- montar layouts
- decidir que datos iniciales se cargan en server

Ubicacion:

- `src/app/`

Ejemplos:

- `src/app/(dashboard)/dashboard/fenograma/page.tsx`
- `src/app/api/fenograma/pivot/route.ts`

## 3.2. Capa de shell visual

Responsabilidad:

- sidebar
- header
- footer
- nombre del producto
- contexto de pagina

Ubicacion:

- `src/components/app-sidebar.tsx`
- `src/components/site-header.tsx`
- `src/components/site-footer.tsx`
- `src/config/dashboard.ts`

## 3.3. Capa de dominio

Responsabilidad:

- consultas SQL
- filtros
- pivotes
- agregaciones
- transformacion de nombres y payloads

Ubicacion:

- `src/lib/fenograma.ts`
- `src/lib/dashboard-seed.ts`

## 3.4. Capa de infraestructura

Responsabilidad:

- conexion a PostgreSQL
- resumen de configuracion
- health check
- pool reutilizable

Ubicacion:

- `src/lib/db.ts`

## 3.5. Capa de presentacion

Responsabilidad:

- filtros interactivos
- tablas
- tarjetas
- modales
- graficos

Ubicacion:

- `src/components/dashboard/*`
- `src/components/ui/*`

## 4. Mapa del codigo activo

```text
src/
  app/
    layout.tsx                    -> layout raiz
    page.tsx                      -> redireccion raiz
    loading.tsx                   -> estado global de carga
    not-found.tsx                 -> 404
    globals.css                   -> tokens visuales y estilos base
    login/page.tsx                -> login placeholder
    (dashboard)/layout.tsx        -> shell del dashboard
    (dashboard)/dashboard/page.tsx
    (dashboard)/dashboard/fenograma/page.tsx
    (dashboard)/dashboard/comparacion/page.tsx
    api/health/db/route.ts
    api/fenograma/pivot/route.ts
    api/fenograma/block/[parentBlock]/route.ts
    api/fenograma/cycle/[cycleKey]/beds/route.ts
  components/
    app-sidebar.tsx
    site-header.tsx
    site-footer.tsx
    logo.tsx
    mode-toggle.tsx
    theme-provider.tsx
    dashboard/*
    ui/*
  config/dashboard.ts
  contexts/theme-context.ts
  hooks/use-theme.ts
  lib/db.ts
  lib/fenograma.ts
  lib/dashboard-seed.ts
  lib/fonts.ts
  lib/utils.ts
  proxy.ts
```

## 5. Flujo de datos de extremo a extremo

## 5.1. Flujo del modulo Fenograma

1. el usuario abre `/dashboard/fenograma`
2. la pagina server llama `getFenogramaDashboardData(defaultFenogramaFilters)`
3. `src/lib/fenograma.ts` consulta PostgreSQL usando `query()`
4. el resultado se transforma a un payload amigable para UI
5. `FenogramaExplorer` recibe ese payload inicial
6. cuando el usuario cambia filtros, el cliente llama `/api/fenograma/pivot`
7. al hacer click en una fila, el cliente llama `/api/fenograma/block/[parentBlock]`
8. al hacer click en `Camas`, el cliente llama `/api/fenograma/cycle/[cycleKey]/beds`
9. la UI renderiza tabla, grafico y modal con informacion ya normalizada

## 5.2. Flujo del modulo Comparacion

1. el usuario abre `/dashboard/comparacion`
2. la pagina carga seed desde `src/lib/dashboard-seed.ts`
3. los componentes de comparacion renderizan tarjetas y radar
4. no hay llamadas a PostgreSQL en este modulo por ahora

## 6. Layout y navegacion

## 6.1. Configuracion central

Archivo:

- `src/config/dashboard.ts`

Desde aqui se define:

- nombre del producto
- vistas del dashboard
- arbol del sidebar
- navegacion movil
- contexto de pagina por ruta

Esto evita hardcodear rutas y titulos en varios componentes al mismo tiempo.

## 6.2. Sidebar

Archivo:

- `src/components/app-sidebar.tsx`

Capacidades:

- colapso total del sidebar
- colapso por ramas
- ramas jerarquicas
- modo compacto con iconos
- atajos a `Estado DB` y `Salir`

El sidebar consume `sidebarTree`, no define su propio arbol. Esa separacion es importante para escalar modulos sin reescribir el componente.

## 6.3. Header

Archivo:

- `src/components/site-header.tsx`

Responsabilidades:

- mostrar el contexto de pagina
- exponer navegacion movil si aplica
- mantener el control de tema

## 6.4. Layout del dashboard

Archivo:

- `src/app/(dashboard)/layout.tsx`

Responsabilidad:

- montar shell visual una sola vez
- administrar el estado de colapso del sidebar
- proyectar el contenido de cada modulo dentro del shell

## 7. Acceso a PostgreSQL

Archivo:

- `src/lib/db.ts`

## 7.1. Estrategia de configuracion

Soporta dos modos:

- `DATABASE_URL`
- variables separadas `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`

Si existen ambas, `DATABASE_URL` tiene prioridad.

## 7.2. Estrategia de conexion

- crea un `Pool` de `pg`
- lo reutiliza en `globalThis` para no abrir pools nuevos en cada refresh de desarrollo
- centraliza `query()` para que el resto del dominio no tenga que repetir logica de conexion

## 7.3. Health check

`getDatabaseHealth()` devuelve:

- si hay configuracion
- de donde viene la configuracion
- host, puerto y base
- si la conexion responde
- mensaje diagnostico
- momento de verificacion

## 8. Server Components y Client Components

## 8.1. Server Components

Se usan cuando conviene:

- bootstrap inicial
- obtener datos sin obligar al cliente a empezar vacio
- dejar consultas iniciales cerca de la ruta

Ejemplos:

- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/dashboard/fenograma/page.tsx`
- `src/app/(dashboard)/dashboard/comparacion/page.tsx`

## 8.2. Client Components

Se usan para:

- filtros interactivos
- cambios de estado local
- modales
- fetch incremental
- graficos con `Recharts`

Ejemplos:

- `src/components/dashboard/fenograma-explorer.tsx`
- `src/components/dashboard/fenograma-pivot-table.tsx`
- `src/components/dashboard/comparison-radar-chart.tsx`

## 9. Convenciones de dominio y presentacion

### 9.1. No exponer nombres crudos de base en la UI

Ejemplos:

- `cycle profile` se presenta como `Ficha del bloque`
- `beds profile` se presenta como `Detalle de camas`
- `mortality` se presenta como `Mortandad actual`
- `cumulative_mortality` se presenta como `Mortandad acumulada`

### 9.2. Transformacion cerca del dominio

La data se transforma lo mas cerca posible de `src/lib/`, para que la UI no tenga que saber como se llaman las columnas en SQL.

### 9.3. Filtros normalizados

Los endpoints no confian en los query params sin procesarlos. Se normalizan antes de usarlos para evitar valores inesperados.

## 10. Codigo activo vs codigo archivado

`borrar/` no pertenece a la arquitectura activa. Se conserva como referencia historica, pero no debe marcar el rumbo de nuevas implementaciones.

Regla practica:

- primero se extiende `src/`
- solo si hay una pieza concreta util en `borrar/`, se revisa y se reescribe con criterio

## 11. Como crecer sin romper la base

Cuando se cree un modulo nuevo, el orden recomendado es:

1. definir el dominio en `src/lib`
2. agregar una pagina server si necesita bootstrap inicial
3. agregar una API si la UI va a filtrar o abrir detalle por demanda
4. agregar componentes cliente para interaccion
5. registrar el modulo en `src/config/dashboard.ts`
6. documentar el modulo en `docs/`

## 12. Riesgos conocidos

- `Fenograma` puede crecer mucho en columnas y filas
- `Comparacion` aun no usa datos reales
- no hay auth real ni control de permisos
- no hay cache aplicada a endpoints pesados

Estos riesgos no bloquean la base, pero si marcan el orden natural de mejora.
