import {
  getDepute, getSenateur,
  getStatsVotesActeur, getConvergence,
  getVotesDivergents
} from "@/lib/db";
import GroupeBadge from "@/components/GroupeBadge";
import VoteBadge from "@/components/VoteBadge";
import EluSearch from "@/components/EluSearch";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Comparer deux élus" };
export const dynamic = "force-dynamic";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getElu(uid: string | undefined) {
  if (!uid) return null;
  return (await getDepute(uid)) ?? (await getSenateur(uid) as any);
}

function StatLine({ label, val, max, color }: { label: string; val: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round(val / max * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-border h-1.5">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 text-right font-medium">{val} <span className="text-muted">({pct}%)</span></span>
    </div>
  );
}

function EluCard({ elu, slot }: { elu: any; slot: "a" | "b" }) {
  const isAN = elu.chambre === "AN";
  return (
    <div className="border border-border p-4">
      <div className="mb-2">
        {isAN
          ? <GroupeBadge abrev={elu.groupe_abrev} libelle={elu.groupe_libelle} chambre="AN" size="md" />
          : <GroupeBadge libelle={elu.groupe} chambre="Senat" size="md" />
        }
      </div>
      <h2 className="font-display text-2xl font-light mt-2">
        {elu.civilite} {elu.prenom} <strong className="font-semibold">{elu.nom}</strong>
      </h2>
      <p className="text-sm text-muted mt-1">
        {isAN
          ? `${elu.departement ?? ""} (${elu.num_departement ?? ""}) — ${elu.num_circo}e circo.`
          : elu.circonscription}
      </p>
      {elu.profession && <p className="text-xs text-muted mt-1">{elu.profession}</p>}
      <Link
        href={isAN ? `/deputes/${elu.uid}` : `/senateurs/${elu.uid}`}
        className="text-xs text-an underline underline-offset-2 mt-3 inline-block"
      >
        Voir la fiche →
      </Link>
    </div>
  );
}

// ─── Jauge de convergence ─────────────────────────────────────────────────────

function ConvergenceGauge({ taux, total }: { taux: number; total: number }) {
  const color =
    taux >= 70 ? "bg-emerald-500"
    : taux >= 40 ? "bg-amber-400"
    : "bg-red-400";

  const label =
    taux >= 70 ? "Forte convergence"
    : taux >= 40 ? "Convergence modérée"
    : "Forte divergence";

  return (
    <div className="border border-border p-6 text-center">
      <p className="text-xs text-muted uppercase tracking-wide mb-4">Convergence de vote</p>
      <div className="font-display text-6xl font-light mb-2">{taux}%</div>
      <p className="text-sm text-muted mb-4">{label} · {total.toLocaleString("fr")} scrutins en commun</p>
      <div className="h-3 bg-border w-full">
        <div className={`h-full ${color} transition-all`} style={{ width: `${taux}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted mt-1">
        <span>0% — opposition totale</span>
        <span>100% — accord total</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  searchParams: { a?: string; b?: string };
}

export default async function ComparerPage({ searchParams }: Props) {
  const { a, b } = searchParams;

  const [eluA, eluB] = await Promise.all([getElu(a), getElu(b)]);

  const bothSelected = eluA && eluB;

  const [statsA, statsB, convergence, divergences] = bothSelected
    ? await Promise.all([
        getStatsVotesActeur(a!),
        getStatsVotesActeur(b!),
        getConvergence(a!, b!),
        getVotesDivergents(a!, b!, 50),
      ])
    : [null, null, null, []];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/" className="text-xs text-muted hover:text-text underline underline-offset-2 mb-8 block">
        ← Accueil
      </Link>

      <h1 className="font-display text-3xl font-light mb-8">Comparer deux élus</h1>

      {/* Sélecteurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <EluSearch slot="a" label="Élu A" currentUid={a} currentName={eluA ? `${eluA.prenom} ${eluA.nom}` : undefined} />
        <EluSearch slot="b" label="Élu B" currentUid={b} currentName={eluB ? `${eluB.prenom} ${eluB.nom}` : undefined} />
      </div>

      {/* Prompt si rien sélectionné */}
      {!bothSelected && (
        <div className="py-20 text-center border border-dashed border-border text-muted">
          {!a && !b
            ? "Sélectionnez deux parlementaires pour comparer leurs votes."
            : "Sélectionnez le deuxième parlementaire."}
        </div>
      )}

      {/* Comparaison */}
      {bothSelected && statsA && statsB && convergence && (
        <div className="space-y-8">

          {/* Cartes élus */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EluCard elu={eluA} slot="a" />
            <EluCard elu={eluB} slot="b" />
          </div>

          {/* Jauge convergence */}
          <ConvergenceGauge taux={convergence.taux} total={convergence.total} />

          {/* Stats côte à côte */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { elu: eluA, stats: statsA, label: `${eluA.prenom} ${eluA.nom}` },
              { elu: eluB, stats: statsB, label: `${eluB.prenom} ${eluB.nom}` },
            ].map(({ elu, stats, label }) => (
              <div key={elu.uid} className="border border-border p-4">
                <p className="text-xs text-muted uppercase tracking-wide mb-3">{label}</p>
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-display text-3xl font-light">{stats.participation}%</span>
                  <span className="text-sm text-muted">participation</span>
                </div>
                <div className="space-y-2">
                  <StatLine label="Pour"       val={stats.pour}       max={stats.total} color="bg-emerald-500" />
                  <StatLine label="Contre"     val={stats.contre}     max={stats.total} color="bg-red-400" />
                  <StatLine label="Abstention" val={stats.abstention} max={stats.total} color="bg-amber-300" />
                  <StatLine label="Absent"     val={stats.nonVotant}  max={stats.total} color="bg-gray-200" />
                </div>
              </div>
            ))}
          </div>

          {/* Scrutins divergents */}
          {divergences.length > 0 && (
            <div>
              <h2 className="font-display text-xl font-light mb-4">
                Scrutins où ils ont voté différemment
                <span className="text-sm text-muted font-sans ml-2">({divergences.length})</span>
              </h2>

              {/* En-tête colonnes */}
              <div className="hidden md:grid grid-cols-[1fr_80px_80px] gap-4 px-3 py-2 bg-border text-xs text-muted uppercase tracking-wide">
                <span>Scrutin</span>
                <span className="text-center">{eluA.nom}</span>
                <span className="text-center">{eluB.nom}</span>
              </div>

              <div className="border-t border-border">
                {divergences.map((v) => (
                  <Link
                    key={v.scrutin_uid}
                    href={`/scrutins/${v.scrutin_uid}`}
                    className="grid grid-cols-1 md:grid-cols-[1fr_80px_80px] gap-2 md:gap-4 items-center px-3 py-3 border-b border-border hover:bg-card group"
                  >
                    <div>
                      <span className="text-xs text-muted">{v.date}</span>
                      <div className="text-sm line-clamp-1 group-hover:underline underline-offset-1 mt-0.5">{v.titre}</div>
                    </div>
                    <div className="flex md:justify-center">
                      <VoteBadge position={v.pos_a} />
                    </div>
                    <div className="flex md:justify-center">
                      <VoteBadge position={v.pos_b} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {divergences.length === 0 && (
            <p className="text-center text-muted py-8">Aucun scrutin divergent trouvé sur les votes actifs.</p>
          )}
        </div>
      )}
    </div>
  );
}
