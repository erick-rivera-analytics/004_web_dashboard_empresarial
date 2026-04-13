import { FenogramaExplorer } from "@/components/dashboard/fenograma-explorer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePageAccess } from "@/lib/api-auth";
import { defaultFenogramaFilters, getFenogramaDashboardData } from "@/lib/fenograma";

export const dynamic = "force-dynamic";

async function loadFenogramaPageData() {
  try {
    return {
      data: await getFenogramaDashboardData(defaultFenogramaFilters),
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

export default async function FenogramaPage() {
  await requirePageAccess("/dashboard/fenograma");
  const { data, error } = await loadFenogramaPageData();

  if (!data) {
    return (
      <Card className="starter-panel border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>No se pudo cargar el fenograma</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return <FenogramaExplorer initialData={data} />;
}
