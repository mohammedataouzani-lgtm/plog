import { getArchive } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
interface Props { params: { chambre: string; uid: string } }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ch = params.chambre.toUpperCase() === "AN" ? "AN" : "Senat";
  const a = await getArchive(params.uid, ch);
  if (!a) return { title: "Élu introuvable" };
  return { title: `${a.prenom} ${a.nom} (archives)` };
}
function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (<div className="border-b border-border py-3 grid grid-cols-[160px_1fr] gap-4"><span className="text-xs text-muted uppercase tracking-wide pt-0.5">{label}</span><span className="text-sm">{value}</span></div>);
}
export default async function ArchivePage({ params }: Props) {
  const ch = params.chambre.toUpperCase() === "AN" ? "AN" : "Senat" as const;
  const a = await getArchive(params.uid, ch);
  if (!a) notFound();
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/archives" className="text-xs text-muted hover:text-text underline underline-offset-2 mb-8 block">← Archives</Link>
      <div className="border-b border-border pb-8 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-xs px-2 py-1 font-medium uppercase tracking-wide ${a.chambre === "AN" ? "bg-an text-white" : "bg-senat text-white"}`}>{a.chambre === "AN" ? "Assemblée Nationale" : "Sénat"}</span>
          <span className="text-xs text-muted">Archives</span>
        </div>
        <h1 className="font-display text-4xl font-light mb-2">{a.civilite} {a.prenom} <strong className="font-semibold">{a.nom}</strong></h1>
        <p className="text-muted">{a.groupe ?? a.groupe_abrev ?? "Groupe inconnu"}{a.departement ? ` — ${a.departement}` : ""}</p>
      </div>
      <div className="border-t border-border">
        {a.chambre === "AN" ? (<>
          <Field label="Dernière législature" value={a.derniere_legislature ? `${a.derniere_legislature}e` : null} />
          <Field label="Nombre de mandats" value={a.nombre_mandats} />
          <Field label="Département" value={a.departement} />
        </>) : <Field label="Circonscription" value={a.circonscription} />}
        <Field label="Profession" value={a.profession} />
        <Field label="Naissance" value={a.date_naissance} />
        {a.date_deces && <Field label="Décès" value={a.date_deces} />}
        <Field label="Fin de mandat" value={a.raison_fin} />
      </div>
      <div className="mt-6 pt-4 border-t border-border"><p className="text-xs text-muted">Source : {a.chambre === "AN" ? "data.gouv.fr" : "data.senat.fr"}</p></div>
    </div>
  );
}