import { MortalityExplorer } from "@/components/dashboard/mortality-explorer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { defaultMortalityFilters, getMortalityDashboardData } from "@/lib/mortality";

export const dynamic = "force-dynamic";

async function loadMortalityPageData() {
  try {
    return {
      data: await getMortalityDashboardData(defaultMortalityFilters),
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

export default async function MortalityPage() {
  const { data, error } = await loadMortalityPageData();

  if (!data) {
    return (
      <Card className="starter-panel border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>No se pudo cargar el dashboard de mortandades</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return <MortalityExplorer initialData={data} />;
}
