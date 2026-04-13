import { UsuariosExplorer } from "@/components/dashboard/usuarios-explorer";
import { requirePageAccess } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  await requirePageAccess("/dashboard/admin/seguridad/usuarios");
  return <UsuariosExplorer />;
}
