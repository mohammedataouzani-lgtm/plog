interface Props {
  statut: string;
  raisonFin?: string | null;
}

export default function StatutBadge({ statut, raisonFin }: Props) {
  if (statut !== "mandat_termine") return null;

  const label = raisonFin
    ? raisonFin.length > 30
      ? raisonFin.slice(0, 28) + "…"
      : raisonFin
    : "Mandat terminé";

  return (
    <span className="inline-block text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 font-medium uppercase tracking-wide">
      {label}
    </span>
  );
}
