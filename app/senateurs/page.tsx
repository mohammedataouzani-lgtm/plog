import { getSenateurs } from "@/lib/db";
import GroupeBadge from "@/components/GroupeBadge";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";
import Link from "next/link";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Sénateurs" };
const GROUPES_SENAT = [
  { value: "Les Républicains", label: "Les Républicains" }, { value: "Socialiste, Écologiste et Républicain", label: "SER" },
  { value: "Union Centriste", label: "Union Centriste" }, { value: "RDPI", label: "RDPI" },
  { value: "CRCE-K", label: "CRCE-K" }, { value: "RDSE", label: "RDSE" },
  { value: "Les Indépendants", label: "Les Indépendants" }, { value: "GEST", label: "GEST" },
  { value: "NI", label: "Non inscrits" },
];
interface Props { searchParams: { page?: string; q?: string; groupe?: string } }
export default async function SenateurSPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const result = await getSenateurs({ page, pageSize: 60, q: searchParams.q, groupe: searchParams.groupe });
  return (
    <>
      <FilterBar placeholder="Rechercher un sénateur..." total={result.total} label="sénateurs"
        filters={[{ key: "groupe", label: "Groupe politique", options: GROUPES_SENAT }]} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div><h1 className="font-display text-3xl font-light">Sénateurs</h1><p className="text-sm text-muted mt-1">Actifs — Sénat de la République</p></div>
          <span className="text-sm text-muted hidden md:block">{result.total.toLocaleString("fr")} résultats</span>
        </div>
        {result.data.length === 0 ? <div className="py-24 text-center text-muted">Aucun résultat.</div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-border">
            {result.data.map((sen) => (
              <Link key={sen.uid} href={`/senateurs/${sen.uid}`} className="border-b border-r border-border p-4 hover:bg-card transition-colors group flex flex-col gap-2">
                <GroupeBadge libelle={sen.groupe} chambre="Senat" />
                <div>
                  <div className="font-medium text-sm group-hover:underline underline-offset-2">{sen.civilite} {sen.prenom} {sen.nom}</div>
                  {sen.commission && <div className="text-xs text-muted mt-0.5 line-clamp-1">{sen.commission}</div>}
                </div>
                <div className="text-xs text-muted mt-auto pt-1 border-t border-border">{sen.circonscription ?? "—"}</div>
              </Link>
            ))}
          </div>
        )}
        <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} />
      </div>
    </>
  );
}