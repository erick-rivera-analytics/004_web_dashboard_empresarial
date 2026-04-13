import { TalentoDemografiaExplorer } from "@/components/dashboard/talento-demografia-explorer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageAccess } from "@/lib/api-auth";
import { defaultTalentoSnapshotFilters, getActivosPersonas } from "@/lib/talento-humano";

export const dynamic = "force-dynamic";

async function loadPageData() {
  try {
    return {
      data: await getActivosPersonas(defaultTalentoSnapshotFilters),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Error inesperado al consultar PostgreSQL.",
    };
  }
}

export default async function DemografiaPersonalPage() {
  await requirePageAccess("/dashboard/talento-humano/demografia-personal");
  const { data, error } = await loadPageData();

  if (!data) {
    return (
      <Card className="starter-panel border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>No se pudo cargar demografia personal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return <TalentoDemografiaExplorer initialData={data} />;
}
