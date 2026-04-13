"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, ShieldOff, Eye, EyeOff, LoaderCircle, RefreshCcw } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";

import { fetchJson } from "@/lib/fetch-json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { User } from "@/lib/users";

// ── Fetcher ───────────────────────────────────────────────────────────────────
const usersFetcher = (url: string) =>
  fetchJson<{ users: User[] }>(url, "No se pudo cargar la lista de usuarios.");

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Main component ────────────────────────────────────────────────────────────
export function UsuariosExplorer() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/admin/users",
    usersFetcher,
    { revalidateOnFocus: false },
  );

  const [showModal, setShowModal] = useState<"create" | "edit" | "delete" | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  function openCreate() {
    setSelectedUser(null);
    setShowModal("create");
  }
  function openEdit(user: User) {
    setSelectedUser(user);
    setShowModal("edit");
  }
  function openDelete(user: User) {
    setSelectedUser(user);
    setShowModal("delete");
  }
  function closeModal() {
    setShowModal(null);
    setSelectedUser(null);
  }

  async function handleToggleActive(user: User) {
    try {
      await fetchJson(`/api/admin/users/${user.id}`, "Error al cambiar estado.", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      toast.success(`Usuario ${!user.isActive ? "activado" : "desactivado"} correctamente.`);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar estado.");
    }
  }

  const users = data?.users ?? [];

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            {users.length} {users.length === 1 ? "usuario" : "usuarios"} registrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl text-xs hover:bg-muted/70"
            onClick={() => mutate()}
            disabled={isLoading}
          >
            <RefreshCcw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            size="sm"
            className="gap-2 rounded-xl text-xs"
            onClick={openCreate}
          >
            <Plus className="size-3.5" />
            Nuevo usuario
          </Button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <Card className="rounded-[24px] border border-border/70 bg-card/80">
        <CardHeader className="px-6 pb-3 pt-5">
          <CardTitle className="text-sm font-semibold">Usuarios del sistema</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Cargando usuarios...
            </div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-destructive">
              {error.message}
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No hay usuarios registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60">
                    <TH>ID</TH>
                    <TH>Usuario</TH>
                    <TH>Estado</TH>
                    <TH>Creado</TH>
                    <TH>Actualizado</TH>
                    <TH right>Acciones</TH>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                      <TD className="text-muted-foreground">{user.id}</TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                            {user.username.charAt(0)}
                          </div>
                          <span className="font-medium">{user.username}</span>
                        </div>
                      </TD>
                      <TD>
                        {user.isActive ? (
                          <Badge className="gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                            <ShieldCheck className="size-3" /> Activo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            <ShieldOff className="size-3" /> Inactivo
                          </Badge>
                        )}
                      </TD>
                      <TD className="text-muted-foreground">{formatDate(user.createdAt)}</TD>
                      <TD className="text-muted-foreground">{formatDate(user.updatedAt)}</TD>
                      <TD right>
                        <div className="flex items-center justify-end gap-1">
                          <ActionButton
                            title={user.isActive ? "Desactivar" : "Activar"}
                            onClick={() => handleToggleActive(user)}
                          >
                            {user.isActive ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                          </ActionButton>
                          <ActionButton title="Editar" onClick={() => openEdit(user)}>
                            <Pencil className="size-3.5" />
                          </ActionButton>
                          <ActionButton title="Eliminar" onClick={() => openDelete(user)} danger>
                            <Trash2 className="size-3.5" />
                          </ActionButton>
                        </div>
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {(showModal === "create" || showModal === "edit") && (
        <UserFormModal
          user={selectedUser}
          onClose={closeModal}
          onSaved={() => { mutate(); closeModal(); }}
        />
      )}
      {showModal === "delete" && selectedUser && (
        <DeleteModal
          user={selectedUser}
          onClose={closeModal}
          onDeleted={() => { mutate(); closeModal(); }}
        />
      )}
    </div>
  );
}

// ── Table helpers ─────────────────────────────────────────────────────────────
function TH({ children, right = false }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th className={`bg-background/95 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}
function TD({ children, right = false, className = "" }: { children?: React.ReactNode; right?: boolean; className?: string }) {
  return (
    <td className={`px-5 py-3 whitespace-nowrap ${right ? "text-right" : ""} ${className}`}>
      {children}
    </td>
  );
}
function ActionButton({
  children, title, onClick, danger = false,
}: {
  children: React.ReactNode; title: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex size-7 items-center justify-center rounded-lg border border-transparent transition-colors ${danger ? "hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive" : "hover:border-border hover:bg-muted text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

// ── UserFormModal ─────────────────────────────────────────────────────────────
function UserFormModal({
  user,
  onClose,
  onSaved,
}: {
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = user !== null;
  const [username, setUsername] = useState(user?.username ?? "");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const body: Record<string, unknown> = { isActive };
      if (!isEdit || username !== user?.username) body.username = username;
      if (!isEdit) {
        body.username = username;
        body.password = password;
      } else if (password) {
        body.password = password;
      }

      const url = isEdit ? `/api/admin/users/${user.id}` : "/api/admin/users";
      const method = isEdit ? "PATCH" : "POST";

      await fetchJson(url, isEdit ? "Error al actualizar usuario." : "Error al crear usuario.", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      toast.success(isEdit ? "Usuario actualizado." : "Usuario creado.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="mb-5 text-base font-semibold">
        {isEdit ? "Editar usuario" : "Nuevo usuario"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nombre de usuario">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            placeholder="ej. juan.garcia"
            className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </FormField>

        <FormField label={isEdit ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEdit}
              minLength={isEdit && !password ? undefined : 6}
              placeholder={isEdit ? "••••••••" : "Mínimo 6 caracteres"}
              className="h-9 w-full rounded-xl border border-input bg-background px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>
        </FormField>

        <FormField label="Estado">
          <label className="flex cursor-pointer items-center gap-2.5">
            <div
              onClick={() => setIsActive((v) => !v)}
              className={`relative h-5 w-9 rounded-full transition-colors ${isActive ? "bg-primary" : "bg-muted"}`}
            >
              <div className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm">{isActive ? "Activo" : "Inactivo"}</span>
          </label>
        </FormField>

        {error ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl">
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={loading} className="rounded-xl gap-2">
            {loading ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
            {isEdit ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ── DeleteModal ───────────────────────────────────────────────────────────────
function DeleteModal({
  user,
  onClose,
  onDeleted,
}: {
  user: User;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await fetchJson(`/api/admin/users/${user.id}`, "Error al eliminar usuario.", { method: "DELETE" });
      toast.success("Usuario eliminado.");
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar.");
      setLoading(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="mb-2 text-base font-semibold">Eliminar usuario</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        ¿Estás seguro que deseas eliminar al usuario{" "}
        <span className="font-semibold text-foreground">{user.username}</span>?
        Esta acción no se puede deshacer.
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl">
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={loading}
          onClick={handleDelete}
          className="rounded-xl gap-2"
        >
          {loading ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          Eliminar
        </Button>
      </div>
    </ModalOverlay>
  );
}

// ── Reusables ─────────────────────────────────────────────────────────────────
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-[24px] border border-border/70 bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
