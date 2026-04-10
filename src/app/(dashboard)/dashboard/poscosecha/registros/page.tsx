import { ClipboardList } from "lucide-react";

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";

export default function PoscosechaRegistrosPage() {
  return (
    <ModulePlaceholder
      badge="Gestion / Poscosecha / Registros"
      title="Registros de poscosecha"
      summary="Este espacio queda reservado para los registros operativos de poscosecha. La estructura del modulo ya esta disponible para crecer sin alterar el menu principal."
      icon={ClipboardList}
      highlights={[
        "La navegacion ya replica el nuevo nivel de desglose solicitado dentro de Gestion.",
        "Este punto servira para capturas operativas futuras sin mezclar maestros ni planificacion.",
        "El primer entregable real de esta rama es Administrar SKU's, que ya queda persistido en PostgreSQL.",
        "Cuando se active este modulo, podra compartir catalogos y trazabilidad con Planificacion y Solver.",
      ]}
    />
  );
}
