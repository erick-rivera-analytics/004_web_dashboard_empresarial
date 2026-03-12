import { ComparisonRadarPanel } from "@/components/dashboard/comparison-radar-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  comparisonRadar,
  getComparisonSummary,
} from "@/lib/dashboard-seed";

function ComparisonMiniCard({
  label,
  left,
  right,
}: {
  label: string;
  left: string;
  right: string;
}) {
  return (
    <Card className="starter-panel border-border/70 bg-card/80">
      <CardContent className="space-y-4 p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">2610</p>
            <p className="mt-2 text-lg font-semibold">{left}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">2611</p>
            <p className="mt-2 text-lg font-semibold">{right}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ComparacionPage() {
  const summary = getComparisonSummary();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard
          label="Brecha de rendimiento"
          value={`${summary.yieldGap.toFixed(1)} kg/m2`}
          description="2610 vs 2611."
          icon={<span className="text-base font-semibold">A</span>}
        />
        <MetricCard
          label="Brecha de calidad"
          value={`${summary.qualityGap} pts`}
          description="Exportable."
          icon={<span className="text-base font-semibold">Q</span>}
        />
        <MetricCard
          label="Brecha de cumplimiento"
          value={`${summary.complianceGap} pts`}
          description="Contra plan."
          icon={<span className="text-base font-semibold">C</span>}
        />
        <MetricCard
          label="Brecha de costo"
          value={`$${summary.costGap}`}
          description="Costo / ha."
          icon={<span className="text-base font-semibold">$</span>}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="starter-panel border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>
              Ciclo A / {summary.left.cycle} / {summary.left.block}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <ComparisonMiniCard
              label="Rendimiento"
              left={`${summary.left.yieldKgM2.toFixed(1)} kg/m2`}
              right={`${summary.right.yieldKgM2.toFixed(1)} kg/m2`}
            />
            <ComparisonMiniCard
              label="Calidad"
              left={`${summary.left.exportableQuality}%`}
              right={`${summary.right.exportableQuality}%`}
            />
            <ComparisonMiniCard
              label="Cumplimiento"
              left={`${summary.left.harvestCompliance}%`}
              right={`${summary.right.harvestCompliance}%`}
            />
            <ComparisonMiniCard
              label="Costo / ha"
              left={`$${summary.left.costPerHectare}`}
              right={`$${summary.right.costPerHectare}`}
            />
          </CardContent>
        </Card>

        <Card className="starter-panel border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Radar comparativo</CardTitle>
          </CardHeader>
          <CardContent>
            <ComparisonRadarPanel data={comparisonRadar} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <ComparisonMiniCard
          label="Productividad"
          left={`${summary.left.laborProductivity}%`}
          right={`${summary.right.laborProductivity}%`}
        />
        <ComparisonMiniCard
          label="Agua"
          left={`${summary.left.waterEfficiency}%`}
          right={`${summary.right.waterEfficiency}%`}
        />
        <ComparisonMiniCard
          label="Forecast"
          left={`${summary.left.forecastAccuracy}%`}
          right={`${summary.right.forecastAccuracy}%`}
        />
        <ComparisonMiniCard
          label="Waste"
          left={`${summary.left.wasteRate}%`}
          right={`${summary.right.wasteRate}%`}
        />
      </div>
    </div>
  );
}

