import { BalanzasExplorer } from "@/components/dashboard/balanzas-explorer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createEmptyBalanzasDashboardData,
  defaultBalanzasFilters,
  getBalanzasDashboardData,
} from "@/lib/poscosecha-balanzas";

export const dynamic = "force-dynamic";

async function loadBalanzasPageData() {
  try {
    return {
      data: await getBalanzasDashboardData(defaultBalanzasFilters),
      error: null,
    };
  } catch (error) {
    return {
      data: createEmptyBalanzasDashboardData(
        defaultBalanzasFilters,
        "No se pudo cargar Indicadores Balanzas.",
      ),
      error:
        error instanceof Error
          ? error.message
          : "Error inesperado al consultar los indicadores de balanzas.",
    };
  }
}

export default async function BalanzasPage() {
  const { data, error } = await loadBalanzasPageData();

  if (!data) {
    return (
      <Card className="starter-panel border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>No se pudo cargar Indicadores Balanzas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return <BalanzasExplorer initialData={data} initialError={error} />;
}
