import { FenogramaWeeklyBarsChart } from "@/components/dashboard/fenograma-weekly-bars-chart";
import type { FenogramaWeeklyTotal } from "@/lib/fenograma";

export function FenogramaWeeklyBarsPanel({
  data,
}: {
  data: FenogramaWeeklyTotal[];
}) {
  return <FenogramaWeeklyBarsChart data={data} />;
}
