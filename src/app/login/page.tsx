import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { starterName } from "@/config/dashboard";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <main className="starter-shell flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="starter-panel w-full max-w-md border-border/70 bg-card/88 shadow-2xl shadow-slate-950/10">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/12 p-3 text-primary">
              <Logo size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold">{starterName}</p>
              <p className="text-xs text-muted-foreground">Indicadores</p>
            </div>
          </div>
          <div className="space-y-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Acceso
            </Badge>
            <CardTitle className="text-3xl">Entrar</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                placeholder="direccion@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Clave</Label>
              <Input
                id="password"
                type="password"
                placeholder="Tu clave"
              />
            </div>
          </div>

          <Button asChild className="h-11 w-full rounded-xl">
            <Link href="/dashboard">
              Entrar
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
