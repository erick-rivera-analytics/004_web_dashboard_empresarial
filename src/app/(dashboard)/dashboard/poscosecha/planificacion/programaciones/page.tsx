import { CalendarClock } from "lucide-react";

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";

export default function PoscosechaProgramacionesPage() {
  return (
    <ModulePlaceholder
      badge="Gestion / Poscosecha / Planificacion"
      title="Programaciones de poscosecha"
      summary="La ruta ya queda reservada dentro del nuevo arbol de Planificacion. Todavia no se habilita la logica funcional, pero el espacio queda listo para evolucionar sin cambiar la navegacion."
      icon={CalendarClock}
      highlights={[
        "Programaciones queda formalmente dentro de Poscosecha > Planificacion.",
        "La estructura permite separar la agenda operativa de los maestros y del solver.",
        "El catalogo maestro de SKU ya puede servir como fuente para futuras planificaciones.",
        "La siguiente capa funcional podra reutilizar el mismo patron de pagina y API del dashboard actual.",
      ]}
    />
  );
}
