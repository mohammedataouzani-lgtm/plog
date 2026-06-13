export const dynamic = "force-dynamic";

import { getArchives } from "@/lib/db";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";
import Link from "next/link";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Archives" };
interface Props { searchParams: { page?: string; q?: string; chambre?: string; legislature?: string } }
const LEGISLATURES = Array.from({ length: 9 }, (_, i) => ({ value: String(17 - i - 1), label: `${17 - i - 1}e législature` }));
export default async function ArchivesPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const result = await getArchives({ page, pageSize: 60, q: searchParams.q, chambre: searchParams.chambre, legislature: searchParams.legislature });
  return (
    <>
      <FilterBar placeholder="Rechercher un ancien élu..." total={result.total} label="anciens élus"
        filters={[{ key: "chambre", label: "Chambre", options: [{ value: "AN", label: "Assemblée Nationale" }, { value: "Senat", label: "Sénat" }] },
          { key: "legislature", label: "Dernière législature", options: LEGISLATURES }]} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div><h1 className="font-display text-3xl font-light">Archives</h1><p className="text-sm text-muted mt-1">Anciens députés et sénateurs — depuis 2002</p></div>
          <span className="text-sm text-muted hidden md:block">{result.total.toLocaleString("fr")} résultats</span>
        </div>
        {result.data.length === 0 ? <div className="py-24 text-center text-muted">Aucun résultat.</div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-border">
            {result.data.map((a) => (
              <Link key={`${a.chambre}-${a.uid}`} href={`/archives/${a.chambre.toLowerCase()}/${a.uid}`}
                className="border-b border-r border-border p-4 hover:bg-card transition-colors group flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 font-medium uppercase tracking-wide ${a.chambre === "AN" ? "bg-an text-white" : "bg-senat text-white"}`}>{a.chambre === "AN" ? "AN" : "Sénat"}</span>
                  {a.groupe_abrev || a.groupe ? <span className="text-[10px] text-muted">{a.groupe_abrev ?? a.groupe}</span> : null}
                </div>
                <div className="font-medium text-sm group-hover:underline underline-offset-2">{a.civilite} {a.prenom} {a.nom}</div>
                <div className="text-xs text-muted mt-auto pt-1 border-t border-border flex gap-3">
                  {a.departement && <span>{a.departement}</span>}
                  {a.derniere_legislature && <span>Leg. {a.derniere_legislature}</span>}
                  {a.nombre_mandats && <span>{a.nombre_mandats} mandat{Number(a.nombre_mandats) > 1 ? "s" : ""}</span>}
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