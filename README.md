# Atlas Empresarial

Base de dashboard en `Next.js 16` orientada a operacion agricola, analitica productiva y construccion incremental de modulos internos.

El proyecto ya no funciona como una plantilla generica. Hoy tiene una estructura visual estable, conexion real a PostgreSQL y un modulo `Fenograma` conectado a datos productivos. `Comparacion` sigue disponible como vista base para evolucionarla con datos reales mas adelante.

## 1. Estado actual

### Funciona hoy

- shell visual del dashboard con sidebar jerarquico y colapsable
- login placeholder limpio
- branding base `Atlas Empresarial`
- conexion PostgreSQL centralizada
- health check de base
- modulo `Fenograma` con datos reales
- filtros por estado, area, variedad y SP
- tabla pivoteada por semana ISO
- ventana inicial limitada a maximo `24` semanas visibles
- grafico de barras de acumulado semanal
- modal flotante por bloque
- detalle de `cycle profile` por `parent_block`
- detalle de `beds profile` por `cycle_key`
- detalle de `valve profile` por `cycle_key + valve_id`
- mortandad y metricas de plantas incorporadas en la presentacion
- cache corta en memoria para pivot y drilldowns

### Sigue pendiente

- autenticacion real
- permisos por rol
- exportacion a Excel
- cache distribuida o externa para produccion
- `Comparacion` con datos reales
- carga parcial por rango de semanas

## 2. Stack tecnico

- `Next.js 16.1.1`
- `React 19`
- `TypeScript`
- `Tailwind CSS v4`
- `pg` para PostgreSQL
- `Recharts` para graficos
- `lucide-react` para iconografia

## 3. Rutas disponibles

### Rutas visuales

- `/login`
- `/dashboard`
- `/dashboard/campo`
- `/dashboard/fenograma`
- `/dashboard/comparacion`

### Rutas API

- `/api/health/db`
- `/api/fenograma/pivot`
- `/api/fenograma/block/[parentBlock]`
- `/api/fenograma/cycle/[cycleKey]/beds`
- `/api/fenograma/cycle/[cycleKey]/valves`
- `/api/fenograma/cycle/[cycleKey]/valves/[valveId]`

## 4. Inicio rapido

### 4.1. Instalar dependencias

```bash
npm install
```

### 4.2. Crear variables de entorno

Usa `.env.example` como base para crear `.env.local`.

### 4.3. Levantar en desarrollo

```bash
npm run dev
```

### 4.4. Abrir en el navegador

- `http://localhost:3000/login`
- `http://localhost:3000/dashboard`
- `http://localhost:3000/dashboard/fenograma`

## 5. Variables de entorno

El proyecto soporta dos formas de conexion a PostgreSQL.

### Opcion A: `DATABASE_URL`

```env
DATABASE_URL=postgresql://usuario:clave@host:5432/base
DATABASE_SSL=false
```

### Opcion B: variables separadas

```env
DATABASE_HOST=remote-postgres-host
DATABASE_PORT=5432
DATABASE_NAME=datalakehouse
DATABASE_USER=dashboard_user
DATABASE_PASSWORD=replace_me
DATABASE_SSL=false
```

### Notas operativas

- `.env.local` esta ignorado por git.
- no pongas credenciales reales en el repo
- hoy la base operativa usada por el modulo real es `datalakehouse`
- si `DATABASE_URL` existe, tiene prioridad sobre la configuracion separada

## 6. Fuentes de datos actuales

### Fenograma

- `gld.mv_prod_fenograma_cur`
- `slv.camp_dim_cycle_profile_scd2`
- `slv.camp_dim_bed_profile_scd2`
- `gld.mv_camp_kardex_cycle_plants_cur`
- `gld.mv_camp_kardex_bed_plants_cur`
- `gld.mv_camp_kardex_valve_plants_cur`

### Campo

- shape transformado a `src/data/campo-blocks-map.json`
- historial espacial de bloques usando match por `parent_block`

### Comparacion

- usa data seed local en `src/lib/dashboard-seed.ts`
- no consulta PostgreSQL todavia

## 7. Estructura principal del proyecto

```text
src/
  app/
    (dashboard)/
      dashboard/
        comparacion/
        fenograma/
      layout.tsx
    api/
      fenograma/
      health/
    login/
  components/
    dashboard/
    ui/
  config/
  contexts/
  hooks/
  lib/
  proxy.ts

docs/
  arquitectura.md
  fenograma.md
  despliegue.md
  apis.md
  estructura-codigo.md
  extender-modulos.md
```

## 8. Archivos mas importantes

### Shell y navegacion

- `src/config/dashboard.ts`
- `src/components/app-sidebar.tsx`
- `src/components/site-header.tsx`
- `src/app/(dashboard)/layout.tsx`

### Conexion y dominio

- `src/lib/db.ts`
- `src/lib/fenograma.ts`
- `src/lib/campo.ts`
- `src/lib/dashboard-seed.ts`

### UI de negocio

- `src/components/dashboard/fenograma-explorer.tsx`
- `src/components/dashboard/campo-explorer.tsx`
- `src/components/dashboard/fenograma-pivot-table.tsx`
- `src/components/dashboard/fenograma-weekly-bars-panel.tsx`
- `src/components/dashboard/comparison-radar-panel.tsx`

### APIs

- `src/app/api/health/db/route.ts`
- `src/app/api/fenograma/pivot/route.ts`
- `src/app/api/fenograma/block/[parentBlock]/route.ts`
- `src/app/api/fenograma/cycle/[cycleKey]/beds/route.ts`
- `src/app/api/fenograma/cycle/[cycleKey]/valves/route.ts`
- `sql/materialized_views_dashboard.sql`

## 9. Validacion

Comandos base:

```bash
npm run lint
npm run typecheck
npm run build
```

El proyecto debe seguir pasando estos tres comandos despues de cualquier cambio estructural.

Nota practica:

- `tsconfig.json` incluye `.next/types/**`
- en un workspace completamente limpio puede hacer falta correr `npm run build` o `npm run dev` una vez antes de ejecutar `npm run typecheck`

## 10. Documentacion interna

La documentacion detallada del repo vive en `docs/`:

- `docs/arquitectura.md`: arquitectura, principios, capas y flujo de datos
- `docs/fenograma.md`: dominio completo del modulo Fenograma
- `docs/despliegue.md`: despliegue, entorno, rendimiento y operacion
- `docs/apis.md`: contrato de rutas API y ejemplos de consumo
- `docs/estructura-codigo.md`: inventario del codigo activo y responsabilidad por archivo
- `docs/extender-modulos.md`: guia para crear dashboards nuevos sobre esta base

## 11. Codigo archivado

Todo lo que no hace parte del proyecto activo quedo en `borrar/`.

Objetivo:

- conservar referencias visuales antiguas
- evitar que demos viejos contaminen la base activa
- mantener `src/` pequeno y entendible

`borrar/` no debe reutilizarse sin criterio. Primero se revisa si la necesidad se resuelve mejor sobre la arquitectura activa.

## 12. Ruta recomendada de evolucion

1. terminar `Comparacion` con datos reales
2. agregar exportacion a Excel para `Fenograma`
3. limitar semanas visibles por default
4. introducir cache corta
5. agregar autenticacion y permisos

## 13. Produccion con Docker

La app ya queda preparada para `self-hosting` en Linux con Docker y `Next.js standalone`.

Archivos de despliegue:

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `.env.production.example`

### 13.1. Variables requeridas

En produccion no se debe usar `.env.local`.

Crear el archivo real de runtime desde el ejemplo:

```bash
cp .env.production.example .env.production
```

Variables obligatorias:

- usar `DATABASE_URL`
- o dejar `DATABASE_URL` vacio y completar `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`

Variable opcional:

- `DATABASE_SSL=true|false`

### 13.2. Build-time vs runtime

Hoy la app no usa variables `NEXT_PUBLIC_*` ni depende de secretos en build time.

Eso significa:

- la imagen se puede construir sin credenciales reales
- las credenciales de PostgreSQL se inyectan solo en runtime con `env_file`

Si en el futuro agregas variables `NEXT_PUBLIC_*`, cualquier cambio en esas variables exigira reconstruir la imagen.

### 13.3. Build local con Docker

```bash
docker compose build
```

### 13.4. Levantar con docker compose

```bash
docker compose up -d
```

La app escucha internamente en `3000` y queda lista para ponerse detras de `Nginx` reverse proxy.

### 13.5. Logs

```bash
docker compose logs -f web_dashboard
```

### 13.6. Reiniciar

```bash
docker compose restart web_dashboard
```

### 13.7. Actualizar despues de git pull

```bash
git pull
docker compose build
docker compose up -d
```

### 13.8. Comandos operativos utiles

Ver contenedores:

```bash
docker ps
```

Apagar:

```bash
docker compose down
```

### 13.9. Decision tecnica

Se usa `output: "standalone"` para reducir el runtime final y copiar solo lo necesario a la imagen de produccion.
