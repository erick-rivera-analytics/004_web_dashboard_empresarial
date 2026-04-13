import { PoscosechaSkusExplorer } from "@/components/dashboard/postcosecha-skus-explorer";
import { requirePageAccess } from "@/lib/api-auth";
import { listCurrentPostharvestSkus } from "@/lib/postcosecha-skus";

export const dynamic = "force-dynamic";

async function loadPageData() {
  try {
    return {
      data: await listCurrentPostharvestSkus(),
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cargar el maestro de SKU de postcosecha.",
    };
  }
}

export default async function AdministrarSkusPage() {
  await requirePageAccess("/dashboard/postcosecha/administrar-maestros/skus");
  const { data, error } = await loadPageData();

  return (
    <PoscosechaSkusExplorer initialData={data} initialError={error} />
  );
}
