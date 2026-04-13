import { TalentoRotacionExplorer } from "@/components/dashboard/talento-rotacion-explorer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageAccess } from "@/lib/api-auth";
import { defaultTalentoFilters, getRotacionData } from "@/lib/talento-humano";

export const dynamic = "force-dynamic";

async function loadPageData() {
  try {
    return {
      data: await getRotacionData(defaultTalentoFilters),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Error inesperado al consultar PostgreSQL.",
    };
  }
}

export default async function RotacionLaboralPage() {
  await requirePageAccess("/dashboard/talento-humano/rotacion-laboral");
  const { data, error } = await loadPageData();

  if (!data) {
    return (
      <Card className="starter-panel border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>No se pudo cargar rotacion laboral</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return <TalentoRotacionExplorer initialData={data} />;
}
