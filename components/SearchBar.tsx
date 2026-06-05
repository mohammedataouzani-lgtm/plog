"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SearchResult {
  uid: string;
  chambre?: string;
  type: string;
  prenom?: string | null;
  nom?: string | null;
  groupe?: string | null;
  statut?: string;
  departement?: string | null;
  titre?: string | null;
  date?: string | null;
  sort?: string | null;
}

interface SearchResults {
  deputes: SearchResult[];
  senateurs: SearchResult[];
  archives: SearchResult[];
  scrutins: SearchResult[];
}

const EMPTY: SearchResults = { deputes: [], senateurs: [], archives: [], scrutins: [] };

function hasResults(r: SearchResults) {
  return r.deputes.length + r.senateurs.length + r.archives.length + r.scrutins.length > 0;
}

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermer au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Raccourci clavier ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Debounce fetch
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(EMPTY);
      setOpen(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`);
        const d = await r.json();
        setResults(d);
        setOpen(true);
      } catch {}
      finally { setLoading(false); }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  const goToSearch = () => {
    if (query.trim().length < 2) return;
    setOpen(false);
    router.push(`/recherche?q=${encodeURIComponent(query.trim())}`);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") goToSearch();
  };

  const total = results.deputes.length + results.senateurs.length +
                results.archives.length + results.scrutins.length;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm">
      {/* Input */}
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-sm select-none">⌕</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Rechercher un élu, une ville, un scrutin…"
          className="w-full pl-7 pr-16 py-1.5 text-sm border border-border bg-bg focus:border-text focus:outline-none"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted border border-border px-1 hidden md:block">
          ⌘K
        </span>
      </div>

      {/* Dropdown */}
      {open && (loading || hasResults(results)) && (
        <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border shadow-xl mt-0.5 max-h-[70vh] overflow-y-auto">

          {loading && (
            <div className="px-4 py-3 text-xs text-muted">Recherche…</div>
          )}

          {!loading && hasResults(results) && (
            <>
              {/* Députés */}
              {results.deputes.length > 0 && (
                <Section title="Députés">
                  {results.deputes.map(r => (
                    <EluRow
                      key={r.uid}
                      href={`/deputes/${r.uid}`}
                      prenom={r.prenom} nom={r.nom}
                      groupe={r.groupe} info={r.departement}
                      chambre="AN"
                      onClick={() => { setOpen(false); setQuery(""); }}
                    />
                  ))}
                </Section>
              )}

              {/* Sénateurs */}
              {results.senateurs.length > 0 && (
                <Section title="Sénateurs">
                  {results.senateurs.map(r => (
                    <EluRow
                      key={r.uid}
                      href={`/senateurs/${r.uid}`}
                      prenom={r.prenom} nom={r.nom}
                      groupe={r.groupe} info={r.departement}
                      chambre="Sénat"
                      onClick={() => { setOpen(false); setQuery(""); }}
                    />
                  ))}
                </Section>
              )}

              {/* Scrutins */}
              {results.scrutins.length > 0 && (
                <Section title="Scrutins">
                  {results.scrutins.map((r: any) => (
                    <Link
                      key={r.uid}
                      href={`/scrutins/${r.uid}`}
                      onClick={() => { setOpen(false); setQuery(""); }}
                      className="flex items-start gap-2 px-4 py-2.5 hover:bg-bg border-b border-border last:border-0"
                    >
                      <span className={`text-xs font-semibold mt-0.5 shrink-0 ${r.sort === "adopté" ? "text-emerald-600" : "text-red-500"}`}>
                        {r.sort === "adopté" ? "✓" : "✗"}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm line-clamp-1">{r.titre}</div>
                        <div className="text-xs text-muted">{r.date}</div>
                      </div>
                    </Link>
                  ))}
                </Section>
              )}

              {/* Archives */}
              {results.archives.length > 0 && (
                <Section title="Anciens élus">
                  {results.archives.map(r => (
                    <EluRow
                      key={`${r.chambre}-${r.uid}`}
                      href={`/archives/${(r.chambre ?? "AN").toLowerCase()}/${r.uid}`}
                      prenom={r.prenom} nom={r.nom}
                      groupe={r.groupe} info={r.chambre}
                      chambre={r.chambre ?? ""}
                      onClick={() => { setOpen(false); setQuery(""); }}
                    />
                  ))}
                </Section>
              )}

              {/* Voir tous */}
              <button
                onClick={goToSearch}
                className="w-full text-left px-4 py-2.5 text-xs text-an hover:bg-bg border-t border-border"
              >
                Voir tous les résultats pour « {query} » →
              </button>
            </>
          )}

          {!loading && !hasResults(results) && (
            <div className="px-4 py-3 text-sm text-muted">Aucun résultat pour « {query} »</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-widest text-muted bg-bg border-b border-border">
        {title}
      </div>
      {children}
    </div>
  );
}

function EluRow({ href, prenom, nom, groupe, info, chambre, onClick }: {
  href: string; prenom?: string | null; nom?: string | null;
  groupe?: string | null; info?: string | null; chambre: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 hover:bg-bg border-b border-border last:border-0"
    >
      {groupe && (
        <span className="text-[10px] px-1.5 py-0.5 bg-border font-medium shrink-0 uppercase">
          {groupe}
        </span>
      )}
      <span className="text-sm flex-1 min-w-0 truncate">{prenom} {nom}</span>
      {info && <span className="text-xs text-muted shrink-0 truncate max-w-[100px]">{info}</span>}
    </Link>
  );
}
