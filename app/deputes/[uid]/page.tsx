export const dynamic = "force-dynamic";

import { getDepute, getVotesActeur, getStatsVotesActeur } from "@/lib/db";
import GroupeBadge from "@/components/GroupeBadge";
import StatutBadge from "@/components/StatutBadge";
import VoteBadge from "@/components/VoteBadge";
import CompareButton from "@/components/CompareButton";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: { uid: string };
  searchParams: { vpage?: string; vpos?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dep = await getDepute(params.uid);
  if (!dep) return { title: "Député introuvable" };
  return { title: `${dep.prenom} ${dep.nom}` };
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

function StatBar({ label, n, total, color }: { label: string; n: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round(n / total * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-border h-1.5"><div className={`h-full ${color}`} style={{ width: `${pct}%` }} /></div>
      <span className="text-xs font-medium w-24 text-right">{n} <span className="text-muted font-normal">({pct}%)</span></span>
    </div>
  );
}

function ActivityCard({ icon, label, value, sub }: { icon: string; label: string; value: number; sub?: string }) {
  return (
    <div className="border border-border p-4 flex flex-col gap-1">
      <span className="text-lg">{icon}</span>
      <div className="font-display text-2xl font-light">{value.toLocaleString("fr")}</div>
      <div className="text-xs text-muted uppercase tracking-wide">{label}</div>
      {sub && <div className="text-[10px] text-muted">{sub}</div>}
    </div>
  );
}

export default async function DeputePage({ params, searchParams }: Props) {
  const dep = await getDepute(params.uid);
  if (!dep) notFound();

  const vpage = Math.max(1, parseInt(searchParams.vpage ?? "1"));
  const vpos = searchParams.vpos;

  const [stats, votes] = await Promise.all([
    getStatsVotesActeur(params.uid),
    getVotesActeur(params.uid, { page: vpage, pageSize: 30, position: vpos }),
  ]);

  // Activité parlementaire (jointure via db.ts)
  const activite = (dep as any);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/deputes" className="text-xs text-muted hover:text-text underline underline-offset-2 mb-8 block">
        ← Députés
      </Link>

      {/* En-tête */}
      <div className="border-b border-border pb-8 mb-8">
        <div className="flex items-start gap-3 flex-wrap mb-4">
          <GroupeBadge abrev={dep.groupe_abrev} libelle={dep.groupe_libelle} chambre="AN" size="md" />
          <StatutBadge statut={dep.statut} raisonFin={dep.raison_fin} />
        </div>
        <h1 className="font-display text-4xl font-light mb-2">
          {dep.civilite} {dep.prenom} <strong className="font-semibold">{dep.nom}</strong>
        </h1>
        <p className="text-muted mb-4">
          Député{dep.civilite === "Mme" ? "e" : ""} — {dep.departement} ({dep.num_departement}) {dep.num_circo}e circonscription
        </p>
        <CompareButton uid={dep.uid} nom={dep.nom ?? ""} prenom={dep.prenom} chambre="AN" />
      </div>

      {/* Stats votes */}
      {stats.total > 0 && (
        <div className="border border-border p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-light">Activité de vote</h2>
            <span className="text-xs text-muted">{stats.total.toLocaleString("fr")} scrutins</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-xs text-muted uppercase tracking-wide mb-1">Participation</div>
              <div className="font-display text-3xl font-light">{stats.participation}%</div>
              {dep.participation_rate !== null && (
                <div className="text-[10px] text-muted">Calculé: {dep.participation_rate}%</div>
              )}
            </div>
            {dep.rebellion_rate !== null && (
              <div>
                <div className="text-xs text-muted uppercase tracking-wide mb-1">Rébellion</div>
                <div className={`font-display text-3xl font-light ${dep.rebellion_rate > 10 ? "text-orange-600" : ""}`}>
                  {dep.rebellion_rate}%
                </div>
                <div className="text-[10px] text-muted">votes contre son groupe</div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <StatBar label="Pour" n={stats.pour} total={stats.total} color="bg-emerald-500" />
            <StatBar label="Contre" n={stats.contre} total={stats.total} color="bg-red-400" />
            <StatBar label="Abstention" n={stats.abstention} total={stats.total} color="bg-amber-300" />
            <StatBar label="Absent" n={stats.nonVotant} total={stats.total} color="bg-gray-200" />
          </div>
        </div>
      )}

      {/* Activité parlementaire */}
      {((activite.nb_presences_commission ?? 0) + (activite.nb_questions_ecrites ?? 0) +
        (activite.nb_questions_orales ?? 0) + (activite.nb_amendements_deposes ?? 0) +
        (activite.nb_amendements_signes ?? 0)) > 0 && (
          <div className="mb-8">
            <h2 className="font-display text-xl font-light mb-4">Activité parlementaire</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <ActivityCard
                icon="🏛️"
                label="Présences commission"
                value={activite.nb_presences_commission ?? 0}
              />
              <ActivityCard
                icon="✍️"
                label="Questions écrites"
                value={activite.nb_questions_ecrites ?? 0}
              />
              <ActivityCard
                icon="🎤"
                label="Questions orales"
                value={activite.nb_questions_orales ?? 0}
              />
              <ActivityCard
                icon="📝"
                label="Amendements déposés"
                value={activite.nb_amendements_deposes ?? 0}
                sub={activite.nb_amendements_adoptes ? `${activite.nb_amendements_adoptes} adoptés` : undefined}
              />
              <ActivityCard
                icon="🤝"
                label="Amendements signés"
                value={activite.nb_amendements_signes ?? 0}
              />
            </div>
          </div>
        )}

      {/* Infos mandat */}
      <div className="border-t border-border mb-8">
        <Field label="Groupe" value={dep.groupe_libelle} />
        <Field label="Commission" value={dep.commission} />
        <Field label="Département" value={dep.departement} />
        <Field label="Profession" value={dep.profession} />
        <Field label="Naissance" value={dep.date_naissance} />
        <Field label="Mandat depuis" value={dep.date_debut_mandat} />
        {dep.statut === "mandat_termine" && (
          <>
            <Field label="Fin de mandat" value={dep.date_fin_mandat} />
            <Field label="Motif" value={dep.raison_fin} />
          </>
        )}
      </div>

      {/* Historique votes */}
      {votes.data.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-light">Scrutins récents</h2>
            <div className="flex gap-1">
              {(["", "pour", "contre", "abstention", "nonVotant"] as const).map(p => (
                <Link key={p} href={`/deputes/${params.uid}?vpos=${p}&vpage=1`}
                  className={`text-xs px-2 py-1 border ${(vpos ?? "") === p ? "border-text bg-text text-bg" : "border-border hover:border-text"}`}>
                  {p === "" ? "Tous" : p === "pour" ? "Pour" : p === "contre" ? "Contre" : p === "abstention" ? "Abst." : "Absent"}
                </Link>
              ))}
            </div>
          </div>
          <div className="border-t border-border">
            {votes.data.map((v) => (
              <Link key={v.scrutin_uid} href={`/scrutins/${v.scrutin_uid}`}
                className="flex items-start gap-3 border-b border-border py-3 hover:bg-card group">
                <VoteBadge position={v.position} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted mb-0.5">{v.date}</div>
                  <div className="text-sm line-clamp-2 group-hover:underline underline-offset-1">{v.titre}</div>
                </div>
                <div className={`text-xs font-medium shrink-0 hidden sm:block ${v.sort === "adopté" ? "text-emerald-600" : "text-red-500"}`}>
                  {v.sort}
                </div>
              </Link>
            ))}
          </div>
          {votes.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
              <span className="text-xs text-muted">Page {votes.page}/{votes.totalPages} · {votes.total.toLocaleString("fr")} votes</span>
              <div className="flex gap-1">
                {vpage > 1 && <Link href={`/deputes/${params.uid}?vpage=${vpage - 1}${vpos ? `&vpos=${vpos}` : ""}`} className="px-3 py-1 text-xs border border-border hover:border-text">←</Link>}
                {vpage < votes.totalPages && <Link href={`/deputes/${params.uid}?vpage=${vpage + 1}${vpos ? `&vpos=${vpos}` : ""}`} className="px-3 py-1 text-xs border border-border hover:border-text">→</Link>}
              </div>
            </div>
          )}
        </div>
      )}

      {(dep.hatvp || dep.site_web) && (
        <div className="mt-8 flex gap-4 pt-4 border-t border-border">
          {dep.hatvp && <a href={dep.hatvp} target="_blank" rel="noopener noreferrer" className="text-xs text-an underline underline-offset-2">Déclaration HATVP →</a>}
          {dep.site_web?.startsWith("http") && <a href={dep.site_web} target="_blank" rel="noopener noreferrer" className="text-xs text-an underline underline-offset-2">Site officiel →</a>}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-border">
        <p className="text-xs text-muted">Source : data.assemblee-nationale.fr · 17e législature</p>
      </div>
    </div>
  );
}