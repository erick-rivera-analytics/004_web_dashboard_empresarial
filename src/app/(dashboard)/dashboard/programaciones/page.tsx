import { ProgramacionesExplorer } from "@/components/dashboard/programaciones-explorer";

/**
 * /dashboard/programaciones
 *
 * Vista de calendarios por tipo de tarea de campo:
 *   - Plantas Muertas
 *   - Iluminación
 *   - Riego
 *
 * Por ahora renderiza el shell completo listo para conectar
 * con la API de PostgreSQL cuando se cree la tabla de programaciones.
 */
export default function ProgramacionesPage() {
  return (
    <ProgramacionesExplorer
      // initialData={[]} // reemplazar con fetch a /api/programaciones cuando esté lista la BD
    />
  );
}
