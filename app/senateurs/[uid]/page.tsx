import { getSenateur } from "@/lib/db";
import GroupeBadge from "@/components/GroupeBadge";
import CompareButton from "@/components/CompareButton";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

interface Props { params: { uid: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await getSenateur(params.uid);
  if (!s) return { title: "Sénateur introuvable" };
  return { title: `${s.prenom} ${s.nom}` };
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div className="border-b border-border py-3 grid grid-cols-[140px_1fr] gap-4">
      <span className="text-xs text-muted uppercase tracking-wide pt-0.5">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export default async function SenateurPage({ params }: Props) {
  const sen = await getSenateur(params.uid);
  if (!sen) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/senateurs" className="text-xs text-muted hover:text-text underline underline-offset-2 mb-8 block">
        ← Sénateurs
      </Link>

      <div className="border-b border-border pb-8 mb-8">
        <div className="mb-4">
          <GroupeBadge libelle={sen.groupe} chambre="Senat" size="md" />
        </div>
        <h1 className="font-display text-4xl font-light mb-2">
          {sen.civilite} {sen.prenom} <strong className="font-semibold">{sen.nom}</strong>
        </h1>
        <p className="text-muted mb-4">
          Sénateur{sen.civilite === "Mme" ? "rice" : ""} — {sen.circonscription}
        </p>
        <CompareButton uid={sen.uid} nom={sen.nom ?? ""} prenom={sen.prenom} chambre="Senat" />
      </div>

      <div className="border-t border-border">
        <Field label="Groupe"          value={sen.groupe} />
        <Field label="Commission"      value={sen.commission} />
        <Field label="Circonscription" value={sen.circonscription} />
        <Field label="Profession"      value={sen.profession} />
        <Field label="Naissance"       value={sen.date_naissance} />
        <Field label="Mandat depuis"   value={sen.date_debut_mandat} />
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <p className="text-xs text-muted">Source : data.senat.fr</p>
      </div>
    </div>
  );
}
