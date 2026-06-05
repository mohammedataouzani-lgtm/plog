import Link from "next/link";
export const dynamic = "force-dynamic";
import { getStats } from "@/lib/db";

export default async function HomePage() {
  const stats = await getStats();
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-16">
        <p className="text-xs uppercase tracking-widest text-muted mb-4">Données parlementaires françaises</p>
        <h1 className="font-display text-5xl md:text-7xl font-light leading-tight mb-6 max-w-3xl">
          Le Parlement,<br /><em className="italic">sans filtre.</em>
        </h1>
        <p className="text-muted max-w-xl leading-relaxed">Votes, mandats et propositions des 577 députés et 348 sénateurs.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-t border-l border-border mb-16">
        {[
          { n: stats.totalDeputes.toLocaleString("fr"),  label: "Députés actifs",   href: "/deputes" },
          { n: stats.totalSenateurs.toLocaleString("fr"),label: "Sénateurs actifs", href: "/senateurs" },
          { n: stats.totalScrutins.toLocaleString("fr"), label: "Scrutins AN",      href: "/scrutins" },
          { n: stats.totalArchives.toLocaleString("fr"), label: "Anciens élus",     href: "/archives" },
        ].map(s => (
          <div key={s.label} className="border-b border-r border-border p-6">
            <div className="font-display text-4xl font-light mb-1">{s.n}</div>
            <div className="text-xs text-muted uppercase tracking-wide">{s.label}</div>
            <Link href={s.href} className="text-xs text-an underline underline-offset-2 mt-2 inline-block">Consulter →</Link>
          </div>
        ))}
      </div>
      <div className="mb-16">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-display text-2xl font-light">Scrutins récents</h2>
          <Link href="/scrutins" className="text-xs text-muted underline underline-offset-2">Voir tous →</Link>
        </div>
        <div className="border-t border-border">
          {(stats.recentScrutins as any[]).map((s: any) => (
            <Link key={s.uid} href={`/scrutins/${s.uid}`} className="flex items-start gap-4 border-b border-border py-3 hover:bg-card group">
              <span className={`text-xs font-semibold mt-0.5 w-5 shrink-0 ${s.sort === "adopté" ? "text-emerald-600" : "text-red-500"}`}>{s.sort === "adopté" ? "✓" : "✗"}</span>
              <div className="flex-1 min-w-0"><div className="text-sm line-clamp-1 group-hover:underline underline-offset-1">{s.titre}</div></div>
              <div className="text-xs text-muted shrink-0">{s.date}</div>
            </Link>
          ))}
        </div>
      </div>
      <div className="mb-16">
        <h2 className="font-display text-2xl font-light mb-6">Assemblée Nationale — 17<sup>e</sup> législature</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-t border-l border-border">
          {(stats.groupesAN as any[]).map((g: any) => (
            <Link key={g.abrev} href={`/deputes?groupe=${g.abrev}`} className="border-b border-r border-border p-4 hover:bg-white group">
              <div className="font-mono text-sm font-medium text-an mb-1 group-hover:underline">{g.abrev}</div>
              <div className="text-xs text-muted truncate mb-2">{g.libelle}</div>
              <div className="font-display text-3xl font-light">{g.nb}</div>
            </Link>
          ))}
        </div>
      </div>
      <div>
        <h2 className="font-display text-2xl font-light mb-6">Sénat</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-t border-l border-border">
          {(stats.groupesSenat as any[]).map((g: any) => (
            <Link key={g.groupe} href={`/senateurs?groupe=${encodeURIComponent(g.groupe)}`} className="border-b border-r border-border p-4 hover:bg-white group">
              <div className="text-xs text-muted truncate mb-2">{g.groupe}</div>
              <div className="font-display text-3xl font-light">{g.nb}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
