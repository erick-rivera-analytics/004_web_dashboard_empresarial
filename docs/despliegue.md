# Despliegue y rendimiento

## 1. Objetivo operativo

La meta de despliegue es correr la app en modo produccion, idealmente en la misma maquina o en la misma red privada donde vive PostgreSQL.

El objetivo no es solo levantar `Next.js`, sino minimizar latencia y hacer que `Fenograma` siga siendo usable aun con una tabla ancha y consultas reales.

## 2. Que mejora el rendimiento de verdad

`Docker` no acelera por si solo.

Lo que si suele mejorar:

- pasar de `next dev` a `next build` + `next start`
- mover la app cerca de PostgreSQL
- reducir latencia de red
- aplicar cache en endpoints pesados
- limitar semanas visibles por default

## 3. Escenario actual vs ideal

### Escenario actual

- desarrollo local
- `npm run dev`
- base remota
- tabla grande
- render cliente con muchas columnas sticky

Este es el peor escenario de rendimiento.

### Escenario recomendado

- `npm run build`
- `npm run start`
- despliegue en servidor
- app en la misma red o maquina que PostgreSQL
- variables de entorno cargadas en runtime

## 4. Variables de entorno

### Opcion A

```env
DATABASE_URL=postgresql://usuario:clave@host:5432/datalakehouse
DATABASE_SSL=false
```

### Opcion B

```env
DATABASE_HOST=10.0.2.70
DATABASE_PORT=5432
DATABASE_NAME=datalakehouse
DATABASE_USER=db_admin
DATABASE_PASSWORD=replace_me
DATABASE_SSL=false
```

Notas:

- no documentar credenciales reales en el repo
- en servidor conviene cargar variables desde secretos o configuracion de entorno, no hardcodearlas

## 5. Validacion previa al despliegue

Ejecutar siempre:

```bash
npm run lint
npm run typecheck
npm run build
```

Si alguno falla, no desplegar.

Nota:

- este repo incluye `.next/types/**` en `tsconfig.json`
- en un entorno completamente limpio, `typecheck` puede requerir una corrida previa de `npm run build` o `npm run dev`

## 6. Simular produccion localmente

```bash
npm run build
npm run start
```

Esto permite separar problemas de `dev` de problemas reales de produccion.

## 7. Despliegue con Docker

## 7.1. Dockerfile de referencia

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "run", "start"]
```

## 7.2. Consideraciones del Dockerfile

- usa una etapa para dependencias
- usa una etapa para build
- arranca en modo produccion
- necesita variables de entorno reales al ejecutar el contenedor

## 7.3. Ejemplo basico de ejecucion

```bash
docker build -t atlas-empresarial .
docker run -p 3000:3000 --env-file .env.production atlas-empresarial
```

## 8. Despliegue con compose

Ejemplo minimo:

```yaml
services:
  dashboard:
    build: .
    container_name: atlas-empresarial
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    restart: unless-stopped
```

## 9. Recomendaciones de red

Prioridad ideal:

1. misma maquina que PostgreSQL
2. mismo segmento de red privada
3. misma VPN o red interna
4. evitar rutas largas o NAT innecesario

La mejora por cercania a la base puede ser mucho mayor que cualquier ajuste superficial en frontend.

## 10. Observabilidad minima recomendada

Aunque el proyecto aun no tenga monitoreo formal, conviene revisar:

- tiempo de respuesta de `/api/health/db`
- tiempo de respuesta de `/api/fenograma/pivot`
- cantidad de semanas visibles
- cantidad de filas del pivot
- errores 500 en endpoints

## 11. Troubleshooting operativo

## 11.1. La app levanta pero la base falla

Revisar:

1. `.env.local` o variables de entorno del servidor
2. conectividad al host PostgreSQL
3. puerto `5432`
4. nombre de base correcto
5. permisos del usuario de consulta

Ruta util:

- `/api/health/db`

## 11.2. Fenograma responde lento

Revisar:

1. si se esta probando en `dev`
2. si la app esta lejos de PostgreSQL
3. cuantas semanas devuelve el pivot
4. si `Historia` esta activa
5. si la fuente SQL esta lenta por si misma

## 11.3. El modal de bloque tarda en abrir

Revisar:

- latencia a `slv.camp_dim_cycle_profile_scd2`
- latencia a `gld.vw_camp_kardex_cycle_plants_cur`
- tamano del bloque consultado

## 11.4. El detalle de camas tarda en abrir

Revisar:

- latencia a `slv.camp_dim_bed_profile_scd2`
- latencia a `gld.vw_camp_kardex_bed_plants_cur`
- cantidad de camas por ciclo

## 12. Mejoras de rendimiento recomendadas por prioridad

## Nivel 1

- cache `30` a `60` segundos en `/api/fenograma/pivot`
- ultimas `16` o `24` semanas por default
- filtro por bloque

## Nivel 2

- exportacion a Excel
- selector de rango de semanas
- medicion simple de tiempos por endpoint

## Nivel 3

- virtualizacion de filas en la tabla
- vista materializada o tabla preagregada para el pivot
- cola o job de precalculo si el volumen crece mucho

## 13. Regla practica

Si el modulo va medio lento en desarrollo, eso no significa automaticamente que ira lento en produccion.

La mejora mas fuerte suele venir de combinar:

- `build + start`
- despliegue cerca de PostgreSQL
- filtros razonables por default

Lo que seguira costando aun en produccion es el render de una tabla muy ancha con muchas semanas. Ese costo vive del lado del navegador y no se resuelve solo moviendo la app a Docker.
