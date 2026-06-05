interface Props {
  participationRate: number | null;
  rebellionRate: number | null;
  groupeAvgParticipation?: number | null;
  groupeAvgRebellion?: number | null;
  compact?: boolean;
}

function indicator(val: number, avg: number, inverse = false) {
  const delta = val - avg;
  if (inverse) {
    if (delta > 5)  return { cls: "text-red-600",    arrow: "↑" };
    if (delta < -3) return { cls: "text-emerald-600", arrow: "↓" };
  } else {
    if (delta > 3)  return { cls: "text-emerald-600", arrow: "↑" };
    if (delta < -5) return { cls: "text-red-600",     arrow: "↓" };
  }
  return { cls: "text-muted", arrow: "=" };
}

export default function StatsPills({
  participationRate, rebellionRate,
  groupeAvgParticipation, groupeAvgRebellion,
  compact = false,
}: Props) {
  if (participationRate === null && rebellionRate === null) return null;

  const partIndicator = (participationRate !== null && groupeAvgParticipation !== null)
    ? indicator(participationRate, groupeAvgParticipation!)
    : null;

  const rebIndicator = (rebellionRate !== null && groupeAvgRebellion !== null)
    ? indicator(rebellionRate, groupeAvgRebellion!, true)
    : null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {participationRate !== null && (
          <span className={`text-[10px] font-medium ${partIndicator?.cls ?? "text-muted"}`}>
            {partIndicator?.arrow} {participationRate}% présence
          </span>
        )}
        {rebellionRate !== null && (
          <span className={`text-[10px] font-medium ${rebIndicator?.cls ?? "text-muted"}`}>
            {rebIndicator?.arrow} {rebellionRate}% rébellion
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {participationRate !== null && (
        <div className="border border-border p-3">
          <div className="text-xs text-muted uppercase tracking-wide mb-1">Présence</div>
          <div className={`text-2xl font-display font-light ${partIndicator?.cls ?? ""}`}>
            {participationRate}%
          </div>
          {groupeAvgParticipation !== null && (
            <div className="text-[10px] text-muted mt-1">
              Moy. groupe : {groupeAvgParticipation?.toFixed(1)}%
            </div>
          )}
        </div>
      )}
      {rebellionRate !== null && (
        <div className="border border-border p-3">
          <div className="text-xs text-muted uppercase tracking-wide mb-1">Rébellion</div>
          <div className={`text-2xl font-display font-light ${rebIndicator?.cls ?? ""}`}>
            {rebellionRate}%
          </div>
          {groupeAvgRebellion !== null && (
            <div className="text-[10px] text-muted mt-1">
              Moy. groupe : {groupeAvgRebellion?.toFixed(1)}%
            </div>
          )}
        </div>
      )}
    </div>
  );
}
