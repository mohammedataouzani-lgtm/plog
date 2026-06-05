import { getGroupeColor } from "@/lib/groupeColors";

interface Props {
  abrev?: string | null;
  libelle?: string | null;
  chambre?: "AN" | "Senat";
  size?: "sm" | "md";
}

export default function GroupeBadge({ abrev, libelle, chambre = "AN", size = "sm" }: Props) {
  const label = abrev || libelle || "?";
  const { bg, text } = getGroupeColor(abrev ?? null, libelle ?? null, chambre);

  return (
    <span
      className={`inline-block font-medium tracking-wide uppercase ${
        size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"
      }`}
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
}
