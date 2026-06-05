"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

interface Props {
  filters?: FilterConfig[];
  placeholder?: string;
  total?: number;
  label?: string;
}

export default function FilterBar({ filters = [], placeholder = "Rechercher…", total, label }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();
  const [, startTransition] = useTransition();

  const update = useCallback(
    (key: string, value: string) => {
      const sp = new URLSearchParams(params.toString());
      if (value) sp.set(key, value);
      else sp.delete(key);
      sp.delete("page"); // reset pagination
      startTransition(() => router.push(`${pathname}?${sp.toString()}`));
    },
    [params, pathname, router]
  );

  const hasFilters = filters.some((f) => params.has(f.key)) || params.has("q");

  return (
    <div className="border-b border-border bg-card sticky top-14 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-sm select-none">⌕</span>
          <input
            type="text"
            defaultValue={params.get("q") ?? ""}
            placeholder={placeholder}
            onChange={(e) => update("q", e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-sm border border-border bg-bg focus:border-text focus:outline-none"
          />
        </div>

        {/* Filtres dropdown */}
        {filters.map((f) => (
          <select
            key={f.key}
            value={params.get(f.key) ?? ""}
            onChange={(e) => update(f.key, e.target.value)}
            className="py-1.5 px-2 text-sm border border-border bg-bg focus:border-text focus:outline-none min-w-[140px]"
          >
            <option value="">{f.label}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ))}

        {/* Réinitialiser */}
        {hasFilters && (
          <button
            onClick={() => startTransition(() => router.push(pathname))}
            className="text-xs text-muted hover:text-text underline underline-offset-2 whitespace-nowrap"
          >
            Effacer
          </button>
        )}

        {/* Compteur */}
        {total !== undefined && (
          <span className="text-xs text-muted whitespace-nowrap ml-auto hidden sm:block">
            {total.toLocaleString("fr")} {label ?? "résultat(s)"}
          </span>
        )}
      </div>
    </div>
  );
}
