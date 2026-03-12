import { CampoExplorer } from "@/components/dashboard/campo-explorer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCampoDashboardData } from "@/lib/campo";

export const dynamic = "force-dynamic";

async function loadCampoPageData() {
  try {
    return {
      data: await getCampoDashboardData(),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Error inesperado al consultar el mapa de bloques.",
    };
  }
}

export default async function CampoPage() {
  const { data, error } = await loadCampoPageData();

  if (!data) {
    return (
      <Card className="starter-panel border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>No se pudo cargar el mapa de bloques</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return <CampoExplorer initialData={data} />;
}
