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
interface Props { searchParams: { page?: string; q?: string; groupe?: string; departement?: string; statut?: string } }
export default async function DeputesPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const result = await getDeputes({ page, pageSize: 60, q: searchParams.q, groupe: searchParams.groupe, departement: searchParams.departement, statut: searchParams.statut });
  return (
    <>
      <FilterBar placeholder="Rechercher un député..." total={result.total} label="députés"
        filters={[{ key: "groupe", label: "Groupe politique", options: GROUPES_AN },
          { key: "statut", label: "Statut", options: [{ value: "actif", label: "Actif" }, { value: "mandat_termine", label: "Mandat interrompu" }] }]} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div><h1 className="font-display text-3xl font-light">Députés</h1><p className="text-sm text-muted mt-1">Assemblée Nationale — 17e législature</p></div>
          <span className="text-sm text-muted hidden md:block">{result.total.toLocaleString("fr")} résultats</span>
        </div>
        {result.data.length === 0 ? <div className="py-24 text-center text-muted">Aucun résultat.</div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-border">
            {result.data.map((dep) => (
              <Link key={dep.uid} href={`/deputes/${dep.uid}`} className="border-b border-r border-border p-4 hover:bg-card transition-colors group flex flex-col gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <GroupeBadge abrev={dep.groupe_abrev} libelle={dep.groupe_libelle} chambre="AN" />
                  {dep.statut === "mandat_termine" && <StatutBadge statut={dep.statut} raisonFin={dep.raison_fin} />}
                </div>
                <div>
                  <div className="font-medium text-sm group-hover:underline underline-offset-2">{dep.civilite} {dep.prenom} {dep.nom}</div>
                  {dep.commission && <div className="text-xs text-muted mt-0.5 line-clamp-1">{dep.commission}</div>}
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