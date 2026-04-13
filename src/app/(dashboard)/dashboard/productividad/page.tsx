import { ProductividadExplorer } from "@/components/dashboard/productividad-explorer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePageAccess } from "@/lib/api-auth";
import { defaultProductividadFilters, getProductividadDashboardData } from "@/lib/productividad";

export const dynamic = "force-dynamic";

async function loadProductividadPageData() {
  try {
    return {
      data: await getProductividadDashboardData(defaultProductividadFilters),
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

export default async function ProductividadPage() {
  await requirePageAccess("/dashboard/productividad");
  const { data, error } = await loadProductividadPageData();

  if (!data) {
    return (
      <Card className="starter-panel border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>No se pudo cargar el dashboard de productividad</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return <ProductividadExplorer initialData={data} />;
}
