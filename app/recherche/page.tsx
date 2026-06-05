import { globalSearch } from "@/lib/db";
import GroupeBadge from "@/components/GroupeBadge";
import VoteBadge from "@/components/VoteBadge";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: { q?: string } }): Promise<Metadata> {
  return { title: searchParams.q ? `"${searchParams.q}" — Recherche` : "Recherche" };
}

interface Props { searchParams: { q?: string } }

export default async function RecherchePage({ searchParams }: Props) {
  const q = searchParams.q?.trim() ?? "";
  const results = q.length >= 2 ? await globalSearch(q, 20) : null;

  const total = results
    ? results.deputes.length + results.senateurs.length +
      results.archives.length + results.scrutins.length
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-light mb-2">Recherche</h1>

      {q && (
        <p className="text-muted mb-8">
          {total > 0
            ? `${total} résultat${total > 1 ? "s" : ""} pour « ${q} »`
            : `Aucun résultat pour « ${q} »`}
        </p>
      )}

      {!q && (
        <p className="text-muted mb-8">Utilisez la barre de recherche pour trouver un élu, une circonscription ou un scrutin.</p>
      )}

      {results && total > 0 && (
        <div className="space-y-10">

          {/* Députés */}
          {results.deputes.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-light mb-4 pb-2 border-b border-border">
                Députés <span className="text-muted text-base font-sans">({results.deputes.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-t border-l border-border">
                {(results.deputes as any[]).map((r: any) => (
                  <Link key={r.uid} href={`/deputes/${r.uid}`}
                    className="border-b border-r border-border p-3 hover:bg-card group flex items-center gap-2">
                    <GroupeBadge abrev={r.groupe} chambre="AN" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium group-hover:underline underline-offset-1 truncate">{r.prenom} {r.nom}</div>
                      {r.departement && <div className="text-xs text-muted">{r.departement}</div>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Sénateurs */}
          {results.senateurs.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-light mb-4 pb-2 border-b border-border">
                Sénateurs <span className="text-muted text-base font-sans">({results.senateurs.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-t border-l border-border">
                {(results.senateurs as any[]).map((r: any) => (
                  <Link key={r.uid} href={`/senateurs/${r.uid}`}
                    className="border-b border-r border-border p-3 hover:bg-card group flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 bg-border font-medium shrink-0">{r.groupe?.slice(0,6)}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium group-hover:underline underline-offset-1 truncate">{r.prenom} {r.nom}</div>
                      {r.departement && <div className="text-xs text-muted">{r.departement}</div>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Scrutins */}
          {results.scrutins.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-light mb-4 pb-2 border-b border-border">
                Scrutins <span className="text-muted text-base font-sans">({results.scrutins.length})</span>
              </h2>
              <div className="border-t border-border">
                {(results.scrutins as any[]).map((r: any) => (
                  <Link key={r.uid} href={`/scrutins/${r.uid}`}
                    className="flex items-start gap-3 border-b border-border py-3 hover:bg-card group">
                    <span className={`text-xs font-semibold mt-0.5 shrink-0 w-4 ${r.sort === "adopté" ? "text-emerald-600" : "text-red-500"}`}>
                      {r.sort === "adopté" ? "✓" : "✗"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm line-clamp-2 group-hover:underline underline-offset-1">{r.titre}</div>
                    </div>
                    <span className="text-xs text-muted shrink-0">{r.date}</span>
                  </Link>
                ))}
              </div>
              <Link href={`/scrutins?q=${encodeURIComponent(q)}`}
                className="text-xs text-an underline underline-offset-2 mt-3 inline-block">
                Voir tous les scrutins correspondants →
              </Link>
            </section>
          )}

          {/* Archives */}
          {results.archives.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-light mb-4 pb-2 border-b border-border">
                Anciens élus <span className="text-muted text-base font-sans">({results.archives.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-t border-l border-border">
                {(results.archives as any[]).map((r: any) => (
                  <Link key={`${r.chambre}-${r.uid}`}
                    href={`/archives/${(r.chambre ?? "AN").toLowerCase()}/${r.uid}`}
                    className="border-b border-r border-border p-3 hover:bg-card group flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 font-medium shrink-0 ${r.chambre === "AN" ? "bg-an text-white" : "bg-senat text-white"}`}>
                      {r.chambre}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium group-hover:underline underline-offset-1 truncate">{r.prenom} {r.nom}</div>
                      {r.departement && <div className="text-xs text-muted">{r.departement}</div>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {results && total === 0 && q && (
        <div className="py-16 text-center border border-dashed border-border text-muted">
          <p className="mb-4">Aucun résultat pour « {q} »</p>
          <p className="text-xs">Essayez un nom de famille, un département, ou un mot-clé de loi.</p>
        </div>
      )}
    </div>
  );
}
