"use client";
import { useMemo, useState } from "react";

type Groupe = { abrev: string; libelle: string; nb: number; couleur: string };

const LIBELLE_COURT: Record<string, string> = {
  "GDR": "Gauche Dém. & Républicaine",
  "LFI-NFP": "La France insoumise – NFP",
  "ECOS": "Écologiste et Social",
  "SOC": "Socialistes et apparentés",
  "DEM": "Les Démocrates",
  "EPR": "Ensemble pour la République",
  "HOR": "Horizons & Indépendants",
  "LIOT": "Libertés, Indép., Outre-mer",
  "UDDPLR": "Union des droites",
  "DR": "Droite Républicaine",
  "RN": "Rassemblement National",
  "NI": "Non inscrits",
};

const ORDRE = ["GDR","LFI-NFP","ECOS","SOC","DEM","EPR","HOR","LIOT","UDDPLR","DR","RN","NI"];

export default function Hemicycle({ groupes }: { groupes: Groupe[] }) {
  const [hover, setHover] = useState<string | null>(null);

  const ordered = useMemo(
    () => [...groupes].sort((a, b) => ORDRE.indexOf(a.abrev) - ORDRE.indexOf(b.abrev)),
    [groupes]
  );
  const total = ordered.reduce((s, g) => s + g.nb, 0);

  const seats = useMemo(() => {
    const rows = 13, r0 = 158, r1 = 360;
    const radii: number[] = [];
    let cap = 0;
    for (let i = 0; i < rows; i++) {
      const r = r0 + ((r1 - r0) * i) / (rows - 1);
      radii.push(r); cap += r;
    }
    const spr = radii.map(r => Math.max(2, Math.round((total * r) / cap)));
    let diff = total - spr.reduce((a, b) => a + b, 0);
    let idx = rows - 1;
    while (diff !== 0) {
      spr[idx] += diff > 0 ? 1 : -1;
      diff += diff > 0 ? -1 : 1;
      idx = (idx - 1 + rows) % rows;
    }
    const positions: { ang: number; r: number }[] = [];
    for (let a = 0; a < rows; a++) {
      const rr = radii[a], c = spr[a];
      for (let j = 0; j < c; j++) {
        const t = c === 1 ? 0.5 : j / (c - 1);
        positions.push({ ang: Math.PI - t * Math.PI, r: rr });
      }
    }
    positions.sort((a, b) => b.ang - a.ang || a.r - b.r);

    const cx = 380, cy = 376;
    const result: { x: number; y: number; couleur: string; abrev: string }[] = [];
    let k = 0;
    for (const g of ordered) {
      for (let m = 0; m < g.nb && k < positions.length; m++) {
        const s = positions[k++];
        result.push({
          x: cx + s.r * Math.cos(s.ang),
          y: cy - s.r * Math.sin(s.ang),
          couleur: g.couleur,
          abrev: g.abrev,
        });
      }
    }
    return result;
  }, [ordered, total]);

  return (
    <div className="mb-16">
      <div className="grid md:grid-cols-[1fr_1fr] gap-8 items-stretch">
        <div className="relative">
          <svg viewBox="0 0 760 392" className="w-full h-auto">
            {seats.map((s, i) => (
              <circle
                key={i}
                cx={s.x} cy={s.y} r={5.3}
                fill={s.couleur}
                opacity={hover && hover !== s.abrev ? 0.2 : 1}
                onMouseEnter={() => setHover(s.abrev)}
                onMouseLeave={() => setHover(null)}
                style={{ transition: "opacity 0.15s", cursor: "pointer" }}
              />
            ))}
          </svg>
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-xs uppercase tracking-widest text-muted mb-2">Assemblée Nationale · 17<sup>e</sup> législature</p>
          <h2 className="font-display text-2xl font-light leading-tight mb-3">{total} sièges, {ordered.length} groupes, une carte des forces.</h2>
          <div className="border-t border-border">
            {ordered.map(g => (
              <button
                key={g.abrev}
                onMouseEnter={() => setHover(g.abrev)}
                onMouseLeave={() => setHover(null)}
                className="w-full flex items-center gap-3 border-b border-border py-1 text-left hover:bg-card"
                style={{ opacity: hover && hover !== g.abrev ? 0.4 : 1, transition: "opacity 0.15s" }}
              >
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: g.couleur }} />
                <span className="font-mono text-xs font-medium w-16 shrink-0">{g.abrev}</span>
                <span className="text-xs text-muted flex-1 truncate">{LIBELLE_COURT[g.abrev] ?? g.libelle}</span>
                <span className="text-xs font-medium tabular-nums">{g.nb}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
