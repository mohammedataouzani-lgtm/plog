import { getScrutin, getVotesPourScrutin } from "@/lib/db";
import GroupeBadge from "@/components/GroupeBadge";
import VoteBadge from "@/components/VoteBadge";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
interface Props { params: { uid: string } }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await getScrutin(params.uid);
  if (!s) return { title: "Scrutin introuvable" };
  return { title: `Scrutin #${s.numero}` };
}
const POSITIONS = ["pour", "contre", "abstention", "nonVotant", "nonVotantVolontaire"] as const;
export default async function ScrutinPage({ params }: Props) {
  const [scrutin, votes] = await Promise.all([getScrutin(params.uid), getVotesPourScrutin(params.uid)]);
  if (!scrutin) notFound();
  const byPos = Object.fromEntries(POSITIONS.map(p => [p, votes.filter((v: any) => v.position === p)]));
  const total = scrutin.votants || 1;
  const pctPour = Math.round(scrutin.pour / total * 100);
  const pctCont = Math.round(scrutin.contre / total * 100);
  const adopted = scrutin.sort === "adopté";
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/scrutins" className="text-xs text-muted hover:text-text underline underline-offset-2 mb-8 block">← Scrutins</Link>
      <div className="border-b border-border pb-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-xs text-muted">Scrutin #{scrutin.numero}</span>
          <span className="text-xs text-muted">{scrutin.date}</span>
          {scrutin.type_vote_libelle && <span className="text-xs bg-border px-2 py-0.5">{scrutin.type_vote_libelle}</span>}
        </div>
        <h1 className="font-display text-2xl md:text-3xl font-light leading-snug mb-6 max-w-3xl">{scrutin.titre}</h1>
        <div className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium ${adopted ? "bg-emerald-50 text-emerald-800 border border-emerald-300" : "bg-red-50 text-red-800 border border-red-300"}`}>
          <span className="text-lg">{adopted ? "✓" : "✗"}</span>
          <span className="uppercase tracking-wide text-xs">{scrutin.sort}</span>
        </div>
      </div>
      <div className="mb-10">
        <div className="flex h-6 overflow-hidden border border-border mb-3">
          <div className="bg-emerald-500 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${pctPour}%` }}>{pctPour > 8 ? `${pctPour}%` : ""}</div>
          <div className="bg-red-400 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${pctCont}%` }}>{pctCont > 8 ? `${pctCont}%` : ""}</div>
          <div className="bg-gray-200 flex-1" />
        </div>
        <div className="flex gap-6 text-sm">
          <span><span className="font-semibold text-emerald-700">{scrutin.pour}</span> <span className="text-muted">pour</span></span>
          <span><span className="font-semibold text-red-600">{scrutin.contre}</span> <span className="text-muted">contre</span></span>
          <span><span className="font-semibold text-amber-700">{scrutin.abstentions}</span> <span className="text-muted">abstentions</span></span>
          <span className="text-muted ml-auto">{scrutin.votants} votants</span>
        </div>
      </div>
      <div className="space-y-8">
        {POSITIONS.filter(p => ((byPos[p] as any[]) ?? []).length > 0).map(pos => (
          <div key={pos}>
            <div className="flex items-center gap-3 mb-3">
              <VoteBadge position={pos} size="md" />
              <span className="text-sm text-muted">{((byPos[pos] as any[]) ?? []).length} parlementaires</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-border">
              {((byPos[pos] as any[]) ?? []).map((v: any) => (
                v.nom ? (
                  <Link key={v.acteur_uid} href={`/deputes/${v.acteur_uid}`} className="border-b border-r border-border px-3 py-2 hover:bg-card group flex items-center gap-2">
                    {v.groupe_abrev && <GroupeBadge abrev={v.groupe_abrev} libelle={v.groupe_libelle} chambre="AN" />}
                    <span className="text-xs group-hover:underline underline-offset-1 truncate">{v.prenom} {v.nom}{v.par_delegation ? " (délég.)" : ""}</span>
                  </Link>
                ) : (
                  <div key={v.acteur_uid} className="border-b border-r border-border px-3 py-2 text-xs text-muted">{v.acteur_uid}</div>
                )
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-10 pt-4 border-t border-border"><p className="text-xs text-muted">Source : data.assemblee-nationale.fr · {scrutin.uid}</p></div>
    </div>
  );
}