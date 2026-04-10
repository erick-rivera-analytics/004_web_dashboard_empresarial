import { PoscosechaClasificacionEnBlancoExplorer } from "@/components/dashboard/postcosecha-clasificacion-en-blanco-explorer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getClasificacionEnBlancoBootData } from "@/lib/postcosecha-clasificacion-en-blanco";

export const dynamic = "force-dynamic";

async function loadPageData() {
  try {
    return {
      data: await getClasificacionEnBlancoBootData(),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cargar la base de Clasificacion en blanco.",
    };
  }
}

export default async function ClasificacionEnBlancoPage() {
  const { data, error } = await loadPageData();

  if (!data) {
    return (
      <Card className="starter-panel border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>No se pudo cargar Clasificacion en blanco</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <PoscosechaClasificacionEnBlancoExplorer
      initialData={data}
      initialError={error}
    />
  );
}
