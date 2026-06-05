import { getScrutins } from "@/lib/db";
import FilterBar from "@/components/FilterBar";
import Pagination from "@/components/Pagination";
import Link from "next/link";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Scrutins" };
interface Props { searchParams: { page?: string; q?: string; sort?: string; type?: string } }
function VoteBar({ pour, contre, abstentions, votants }: { pour: number; contre: number; abstentions: number; votants: number }) {
  if (!votants) return null;
  const pPour = Math.round(pour / votants * 100);
  const pCont = Math.round(contre / votants * 100);
  return (
    <div className="flex h-1 w-full overflow-hidden bg-gray-200 mt-2">
      <div className="bg-emerald-500" style={{ width: `${pPour}%` }} />
      <div className="bg-red-400" style={{ width: `${pCont}%` }} />
    </div>
  );
}
export default async function ScrutinsPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const result = await getScrutins({ page, pageSize: 50, q: searchParams.q, sort: searchParams.sort, type: searchParams.type });
  return (
    <>
      <FilterBar placeholder="Rechercher un scrutin..." total={result.total} label="scrutins"
        filters={[{ key: "sort", label: "Résultat", options: [{ value: "adopté", label: "Adopté" }, { value: "rejeté", label: "Rejeté" }] },
          { key: "type", label: "Type", options: [{ value: "SOR", label: "Scrutin ordinaire" }, { value: "SSO", label: "Scrutin solennel" }, { value: "MOC", label: "Motion de censure" }] }]} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div><h1 className="font-display text-3xl font-light">Scrutins</h1><p className="text-sm text-muted mt-1">Assemblée Nationale — 17e législature</p></div>
          <span className="text-sm text-muted hidden md:block">{result.total.toLocaleString("fr")} scrutins</span>
        </div>
        {result.data.length === 0 ? <div className="py-24 text-center text-muted">Aucun résultat.</div> : (
          <div className="border-t border-border">
            {result.data.map((s) => (
              <Link key={s.uid} href={`/scrutins/${s.uid}`} className="flex gap-4 border-b border-border py-3 px-2 hover:bg-card transition-colors group items-start">
                <div className="w-14 shrink-0 text-right">
                  <div className="font-mono text-xs text-muted">#{s.numero}</div>
                  <span className={s.sort === "adopté" ? "text-emerald-600 text-xs font-semibold" : "text-red-500 text-xs font-semibold"}>{s.sort === "adopté" ? "✓" : "✗"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm line-clamp-2 group-hover:underline underline-offset-2">{s.titre}</div>
                  <VoteBar pour={s.pour} contre={s.contre} abstentions={s.abstentions} votants={s.votants} />
                </div>
                <div className="shrink-0 text-right hidden sm:block">
                  <div className="text-xs text-muted">{s.date}</div>
                  <div className="text-xs mt-1 space-x-2">
                    <span className="text-emerald-600">↑{s.pour}</span>
                    <span className="text-red-500">↓{s.contre}</span>
                  </div>
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