import { HorasExplorer } from "@/components/dashboard/horas-explorer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { defaultHorasFilters, getHorasDashboardData } from "@/lib/horas";

export const dynamic = "force-dynamic";

async function loadHorasPageData() {
  try {
    return {
      data: await getHorasDashboardData(defaultHorasFilters),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Error inesperado al consultar PostgreSQL.",
    };
  }
}

export default async function HorasPage() {
  const { data, error } = await loadHorasPageData();

  if (!data) {
    return (
      <Card className="starter-panel border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>No se pudo cargar el dashboard de horas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return <HorasExplorer initialData={data} />;
}
