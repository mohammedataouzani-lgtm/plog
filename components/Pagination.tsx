"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

export default function Pagination({ page, totalPages, total, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const go = (p: number) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("page", String(p));
    router.push(`${pathname}?${sp.toString()}`);
  };

  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
      <span className="text-xs text-muted">
        {from}–{to} sur {total.toLocaleString("fr")}
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1 text-sm border border-border hover:border-text disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ←
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-2 py-1 text-sm text-muted">…</span>
          ) : (
            <button
              key={p}
              onClick={() => go(p)}
              className={`px-3 py-1 text-sm border ${
                p === page
                  ? "border-text bg-text text-bg"
                  : "border-border hover:border-text"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1 text-sm border border-border hover:border-text disabled:opacity-30 disabled:cursor-not-allowed"
        >
          →
        </button>
      </div>
    </div>
  );
}
