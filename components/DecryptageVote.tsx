"use client";
import { useMemo } from "react";

type Vote = { position: string; groupe_abrev: string | null };
type Props = { votes: Vote[]; limit?: number };

export default function DecryptageVote({ votes, limit = 9 }: Props) {
  const groupes = useMemo(() => {
    const map: Record<string, { pour: number; contre: number; abstention: number }> = {};
    for (const v of votes) {
      const g = v.groupe_abrev;
      if (!g) continue;
      map[g] ??= { pour: 0, contre: 0, abstention: 0 };
      if (v.position === "pour") map[g].pour++;
      else if (v.position === "contre") map[g].contre++;
      else if (v.position === "abstention") map[g].abstention++;
    }
    return Object.entries(map)
      .map(([abrev, c]) => ({ abrev, ...c, total: c.pour + c.contre + c.abstention }))
      .filter(g => g.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }, [votes, limit]);

  if (groupes.length === 0) return null;
  const maxTotal = Math.max(...groupes.map(g => g.total));

  return (
    <div className="mb-12">
      <p className="text-xs uppercase tracking-widest text-muted mb-4">Décryptage du vote</p>
      <div className="space-y-2.5">
        {groupes.map(g => {
          const w = (n: number) => `${(n / maxTotal) * 100}%`;
          return (
            <div key={g.abrev} className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted w-20 shrink-0 text-right">{g.abrev}</span>
              <div className="flex-1 flex h-5 rounded-sm overflow-hidden bg-transparent">
                <div className="bg-emerald-700" style={{ width: w(g.pour) }} />
                <div className="bg-[#c9c3b6]" style={{ width: w(g.abstention) }} />
                <div className="bg-red-700" style={{ width: w(g.contre) }} />
              </div>
              <span className="text-xs font-medium tabular-nums w-8 shrink-0">{g.total}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-5 mt-4 text-xs text-muted">
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-700 mr-1.5 align-middle" />Pour</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#c9c3b6] mr-1.5 align-middle" />Abstention</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-700 mr-1.5 align-middle" />Contre</span>
      </div>
    </div>
  );
}
