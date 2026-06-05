"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface EluResult {
  uid: string;
  chambre: string;
  type: string;
  prenom: string | null;
  nom: string | null;
  groupe: string | null;
  statut: string;
  departement: string | null;
}

interface Props {
  slot: "a" | "b";
  label: string;
  currentUid?: string;
  currentName?: string;
}

export default function EluSearch({ slot, label, currentUid, currentName }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(currentName ?? "");
  const [results, setResults] = useState<EluResult[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const d = await r.json();
      const all = [...(d.deputes ?? []), ...(d.senateurs ?? [])];
      setResults(all.slice(0, 8));
      setOpen(all.length > 0);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const select = (elu: EluResult) => {
    setQuery(`${elu.prenom} ${elu.nom}`);
    setOpen(false);
    const sp = new URLSearchParams(params.toString());
    sp.set(slot, elu.uid);
    router.push(`${pathname}?${sp.toString()}`);
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    const sp = new URLSearchParams(params.toString());
    sp.delete(slot);
    router.push(`${pathname}?${sp.toString()}`);
  };

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs text-muted uppercase tracking-wide mb-1.5">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Nom du parlementaire…"
          className="flex-1 px-3 py-2 text-sm border border-border bg-bg focus:border-text focus:outline-none"
        />
        {currentUid && (
          <button onClick={clear} className="px-3 py-2 text-xs border border-border hover:border-text text-muted">
            ✕
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border shadow-lg mt-0.5 max-h-64 overflow-y-auto">
          {results.map(r => (
            <button
              key={r.uid}
              onClick={() => select(r)}
              className="w-full text-left px-3 py-2 hover:bg-bg border-b border-border last:border-0 flex items-center gap-2"
            >
              {r.groupe && (
                <span className="text-[10px] px-1.5 py-0.5 bg-border font-medium shrink-0">
                  {r.groupe}
                </span>
              )}
              <span className="text-sm">{r.prenom} {r.nom}</span>
              <span className="text-xs text-muted ml-auto shrink-0">
                {r.chambre === "AN" ? "Assemblée" : "Sénat"}
                {r.departement ? ` · ${r.departement}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
