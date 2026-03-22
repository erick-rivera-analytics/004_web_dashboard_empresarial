"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

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
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al iniciar sesion");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Error de conexion");
    } finally {
      setLoading(false);
    }
  }

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
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Clave</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Tu clave"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
