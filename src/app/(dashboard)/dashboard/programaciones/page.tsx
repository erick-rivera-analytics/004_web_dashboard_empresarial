import { getProgramaciones } from "@/lib/programaciones";
import { ProgramacionesExplorer } from "@/components/dashboard/programaciones-explorer";

/**
 * /dashboard/programaciones
 *
 * Carga el mes actual server-side y pasa los datos como initialData al
 * explorador. El explorador usa SWR para re-fetch al navegar entre meses.
 */
export default async function ProgramacionesPage() {
  const today   = new Date();
  const year    = today.getFullYear();
  const month   = today.getMonth();
  const padded  = String(month + 1).padStart(2, "0");
  const lastDay = new Date(year, month + 1, 0).getDate();

  const dateFrom = `${year}-${padded}-01`;
  const dateTo   = `${year}-${padded}-${lastDay}`;

  let initialData: Awaited<ReturnType<typeof getProgramaciones>> = [];

  try {
    initialData = await getProgramaciones(dateFrom, dateTo);
  } catch {
    // El explorador muestra estado vacío si falla el fetch inicial
  }

  return (
    <ProgramacionesExplorer
      initialData={initialData}
      initialDateFrom={dateFrom}
      initialDateTo={dateTo}
    />
  );
}
