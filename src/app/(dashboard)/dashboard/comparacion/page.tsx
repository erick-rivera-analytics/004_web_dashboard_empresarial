import { ComparisonExplorer } from "@/components/dashboard/comparison-explorer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageAccess } from "@/lib/api-auth";
import { getComparisonDashboardData } from "@/lib/comparacion";

export const dynamic = "force-dynamic";

async function loadComparisonPageData() {
  try {
    return {
      data: await getComparisonDashboardData(),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Error inesperado al consultar la comparacion de ciclos.",
    };
  }
}

export default async function ComparacionPage() {
  await requirePageAccess("/dashboard/comparacion");
  const { data, error } = await loadComparisonPageData();

  if (!data) {
    return (
      <Card className="starter-panel border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>No se pudo cargar la comparacion</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return <ComparisonExplorer initialData={data} />;
}
