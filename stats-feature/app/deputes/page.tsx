import { getDeputes } from "@/lib/db";
import GroupeBadge from "@/components/GroupeBadge";
import StatutBadge from "@/components/StatutBadge";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Députés" };

const GROUPES_AN = [
  { value: "RN", label: "Rassemblement National" }, { value: "EPR", label: "Ensemble pour la République" },
  { value: "LFI-NFP", label: "La France Insoumise" }, { value: "SOC", label: "Socialistes" },
  { value: "DR", label: "Droite Républicaine" }, { value: "ECOS", label: "Écologiste et Social" },
  { value: "DEM", label: "Les Démocrates" }, { value: "HOR", label: "Horizons" },
  { value: "LIOT", label: "LIOT" }, { value: "UDDPLR", label: "Union des droites" },
  { value: "GDR", label: "Gauche Démocrate" }, { value: "NI", label: "Non inscrit" },
];

interface Props {
  searchParams: { page?: string; q?: string; groupe?: string; departement?: string; statut?: string; tri?: string };
}

function ParticipationBar({ rate, avg }: { rate: number | null; avg: number }) {
  if (rate === null) return null;
  const delta = rate - avg;
  const color = delta < -10 ? "bg-red-400" : delta < -3 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 bg-border h-1 relative">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <span className={`text-[10px] font-medium tabular-nums w-8 text-right ${
        delta < -10 ? "text-red-500" : delta < -3 ? "text-amber-600" : "text-muted"
      }`}>{rate}%</span>
    </div>
  );
}

function RebellionDot({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-[10px] text-muted">—</span>;
  const color = rate > 15 ? "text-orange-600" : rate > 5 ? "text-amber-600" : "text-muted";
  return <span className={`text-[10px] font-medium ${color}`}>{rate}%</span>;
}

export default async function DeputesPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const tri  = searchParams.tri ?? "nom";

  const result = await getDeputes({
    page, pageSize: 60,
    q: searchParams.q, groupe: searchParams.groupe,
    departement: searchParams.departement, statut: searchParams.statut,
    tri,
  });

  // Moyennes pour les indicateurs (calculées sur la page courante)
  const avgPart = result.data.reduce((s, d) => s + (d.participation_rate ?? 0), 0) / (result.data.filter(d => d.participation_rate !== null).length || 1);

  return (
    <>
      <FilterBar placeholder="Rechercher un député..." total={result.total} label="députés"
        filters={[
          { key: "groupe", label: "Groupe politique", options: GROUPES_AN },
          { key: "statut", label: "Statut", options: [{ value: "actif", label: "Actif" }, { value: "mandat_termine", label: "Mandat interrompu" }] },
          { key: "tri", label: "Trier par", options: [
            { value: "nom", label: "Nom" },
            { value: "participation_asc", label: "Présence ↑" },
            { value: "participation_desc", label: "Présence ↓" },
            { value: "rebellion_desc", label: "Rébellion ↓" },
          ]},
        ]} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-light">Députés</h1>
            <p className="text-sm text-muted mt-1">Assemblée Nationale — 17e législature</p>
          </div>
          <span className="text-sm text-muted hidden md:block">{result.total.toLocaleString("fr")} résultats</span>
        </div>

        {/* Légende */}
        <div className="flex gap-4 text-[10px] text-muted mb-4 border-b border-border pb-3">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-1 bg-emerald-500 rounded" /> Présence ≥ moy.</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-1 bg-amber-400 rounded" /> Présence −3 à −10%</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-1 bg-red-400 rounded" /> Présence &lt; −10%</span>
          <span className="ml-auto">Rébellion = % votes contre son groupe</span>
        </div>

        {result.data.length === 0 ? <div className="py-24 text-center text-muted">Aucun résultat.</div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-border">
            {result.data.map((dep) => (
              <Link key={dep.uid} href={`/deputes/${dep.uid}`}
                className="border-b border-r border-border p-4 hover:bg-card transition-colors group flex flex-col gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <GroupeBadge abrev={dep.groupe_abrev} libelle={dep.groupe_libelle} chambre="AN" />
                  {dep.statut === "mandat_termine" && <StatutBadge statut={dep.statut} raisonFin={dep.raison_fin} />}
                </div>
                <div>
                  <div className="font-medium text-sm group-hover:underline underline-offset-2">{dep.civilite} {dep.prenom} {dep.nom}</div>
                  {dep.commission && <div className="text-xs text-muted mt-0.5 line-clamp-1">{dep.commission}</div>}
                </div>

                {/* Stats */}
                <div className="mt-1 space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted w-14 shrink-0">Présence</span>
                    <div className="flex-1">
                      <ParticipationBar rate={dep.participation_rate ?? null} avg={avgPart} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted w-14 shrink-0">Rébellion</span>
                    <RebellionDot rate={dep.rebellion_rate ?? null} />
                  </div>
                </div>

                <div className="text-xs text-muted mt-auto pt-1 border-t border-border">
                  {dep.departement ? `${dep.departement} (${dep.num_departement}) — ${dep.num_circo}e circo.` : "—"}
                </div>
              </Link>
            ))}
          </div>
        )}

        <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} />
      </div>
    </>
  );
}
