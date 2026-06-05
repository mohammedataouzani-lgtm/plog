interface Props {
  position: string;
  size?: "sm" | "md";
}

const CONFIG: Record<string, { label: string; cls: string }> = {
  pour:               { label: "Pour",       cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  contre:             { label: "Contre",     cls: "bg-red-100 text-red-800 border-red-300" },
  abstention:         { label: "Abstention", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  nonVotant:          { label: "Absent",     cls: "bg-gray-100 text-gray-600 border-gray-300" },
  nonVotantVolontaire:{ label: "N.V.",       cls: "bg-gray-100 text-gray-500 border-gray-300" },
};

export default function VoteBadge({ position, size = "sm" }: Props) {
  const cfg = CONFIG[position] ?? { label: position, cls: "bg-gray-100 text-gray-600 border-gray-300" };
  return (
    <span className={`inline-block border font-medium ${
      size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"
    } ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
