import Link from "next/link";

type Groupe = { abrev: string; libelle: string; pour: number; contre: number; abstention: number };
type Scrutin = { uid: string; date: string; titre: string; sort: string; pour: number; contre: number; abstentions: number; groupes: Groupe[] };

export default function VotesParGroupe({ scrutins }: { scrutins: Scrutin[] }) {
  return (
    <div className="mb-16">
      <div className="flex items-end justify-between mb-6">
        <h2 className="font-display text-2xl font-light">Votes par groupe</h2>
        <Link href="/scrutins" className="text-xs text-muted underline underline-offset-2">Voir tous →</Link>
      </div>
      <div className="space-y-8">
        {scrutins.map((sc) => (
          <div key={sc.uid} className="border border-border rounded-lg p-5">
            <Link href={`/scrutins/${sc.uid}`} className="block mb-4 group">
              <div className="flex items-start gap-2 mb-1">
                <span className={`text-xs font-semibold mt-0.5 ${sc.sort === "adopté" ? "text-emerald-600" : "text-red-500"}`}>
                  {sc.sort === "adopté" ? "✓ Adopté" : "✗ Rejeté"}
                </span>
                <span className="text-xs text-muted">· {sc.date}</span>
              </div>
              <div className="text-sm font-medium group-hover:underline underline-offset-1 line-clamp-2">{sc.titre}</div>
              <div className="text-xs text-muted mt-1">{sc.pour} pour · {sc.contre} contre · {sc.abstentions} abstentions</div>
            </Link>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {sc.groupes.map((g) => {
                const total = g.pour + g.contre + g.abstention;
                const pct = (n: number) => total > 0 ? (n / total) * 100 : 0;
                return (
                  <div key={g.abrev} className="border border-border rounded-md p-3">
                    <div className="font-mono text-xs font-medium text-an mb-2">{g.abrev}</div>
                    <div className="flex gap-0.5 h-1.5 mb-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500" style={{ width: `${pct(g.pour)}%` }} />
                      <div className="bg-amber-400" style={{ width: `${pct(g.abstention)}%` }} />
                      <div className="bg-red-500" style={{ width: `${pct(g.contre)}%` }} />
                    </div>
                    <div className="text-xs text-muted">
                      <span className="text-emerald-600 font-medium">{g.pour}</span> · <span className="text-amber-500 font-medium">{g.abstention}</span> · <span className="text-red-500 font-medium">{g.contre}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-4 text-xs text-muted">
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1 align-middle" />Pour</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 mr-1 align-middle" />Abstention</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 mr-1 align-middle" />Contre</span>
      </div>
    </div>
  );
}
