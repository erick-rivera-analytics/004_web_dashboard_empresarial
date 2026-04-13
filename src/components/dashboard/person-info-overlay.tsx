"use client";

import type { ReactNode } from "react";
import { LoaderCircle, User, X } from "lucide-react";
import useSWRImmutable from "swr/immutable";

import { fetchJson } from "@/lib/fetch-json";
import type { TalentoPersonProfile } from "@/lib/talento-humano";

const profileFetcher = (url: string) =>
  fetchJson<TalentoPersonProfile>(url, "No se pudo cargar el perfil.");

export function PersonInfoOverlay({
  personId,
  personName,
  onClose,
}: {
  personId: string;
  personName: string;
  onClose: () => void;
}) {
  const { data: profile, error, isLoading } = useSWRImmutable(
    `/api/talento-humano/persona/${encodeURIComponent(personId)}`,
    profileFetcher,
  );

  const displayName = profile?.personName ?? personName;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      <div
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border/60 bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/60 bg-card/95 px-5 py-4 backdrop-blur">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase">
            {displayName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{displayName}</p>
            <p className="text-xs text-muted-foreground">{personId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Cerrar ficha de persona"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 px-5 py-5">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Cargando perfil...
            </div>
          ) : error ? (
            <div className="py-20 text-center text-sm text-destructive">{error.message}</div>
          ) : !profile ? (
            <div className="py-20 text-center text-sm text-muted-foreground">
              No se encontro informacion de esta persona.
            </div>
          ) : (
            <div className="space-y-6">
              <InfoSection title="Identificacion">
                <InfoRow label="Nombre completo" value={profile.personName} />
                <InfoRow label="Cedula / ID" value={profile.nationalId} />
                <InfoRow label="Genero" value={profile.gender} />
                <InfoRow label="Estado civil" value={profile.maritalStatus} />
                <InfoRow label="Fecha de nacimiento" value={profile.birthDate ? formatDate(profile.birthDate) : null} />
                <InfoRow label="Lugar de nacimiento" value={profile.birthPlace} />
                <InfoRow label="Nacionalidad" value={profile.nationality} />
                <InfoRow label="Nivel de educacion" value={profile.educationTitle} />
                <InfoRow label="Hijos" value={profile.childrenCount !== null ? String(profile.childrenCount) : null} />
                <InfoRow label="Dependientes" value={profile.dependentsCount !== null ? String(profile.dependentsCount) : null} />
                <InfoRow label="Discapacidad" value={formatBoolean(profile.disabledFlag)} />
              </InfoSection>

              <InfoSection title="Empleo">
                <InfoRow label="Cargo" value={profile.jobTitle} />
                <InfoRow label="Empresa" value={profile.employerName} />
                <InfoRow label="Tipo de empleado" value={profile.employeeType} />
                <InfoRow label="Tipo de contrato" value={profile.contractType} />
                <InfoRow label="Clasificacion" value={profile.jobClassificationCode} />
                <InfoRow label="Codigo de finca" value={profile.farmCode} />
                <InfoRow label="Trabajadora social" value={profile.associatedWorkerName} />
                <InfoRow label="Bono por rendimiento" value={formatBoolean(profile.performancePayApplicable)} />
                <InfoRow label="Ultimo ingreso" value={profile.lastEntryDate ? formatDate(profile.lastEntryDate) : null} />
                <InfoRow label="Ultima salida" value={profile.lastExitDate ? formatDate(profile.lastExitDate) : null} />
              </InfoSection>

              <InfoSection title="Contacto">
                <InfoRow label="Email" value={profile.email} />
                <InfoRow label="Telefono" value={profile.phoneNumber} />
                <InfoRow label="Direccion" value={profile.address} />
                <InfoRow label="Ciudad" value={profile.city} />
                <InfoRow label="Parroquia" value={profile.parish} />
              </InfoSection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <User className="size-3.5 text-muted-foreground/60" />
        <h3 className="text-[10px] font-semibold uppercase text-muted-foreground/60">{title}</h3>
      </div>
      <div className="divide-y divide-border/40 rounded-[16px] border border-border/60 bg-background/60">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 px-4 py-2.5">
      <span className="w-36 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="flex-1 text-xs font-medium">{value}</span>
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatBoolean(value: boolean | null) {
  if (value === true) return "Si";
  if (value === false) return "No";
  return null;
}
