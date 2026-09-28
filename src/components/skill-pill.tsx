import { kindLabel, postTypeLabel } from "@/lib/constants";

export function SkillPill({
  name,
  kind,
}: {
  name: string;
  kind: "offer" | "want" | "request";
}) {
  const offer = kind === "offer";
  const label = kind === "request" ? postTypeLabel("request") : kind === "offer" ? "Skill offer" : kindLabel("want");
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-white ${offer ? "bg-offer" : "bg-request"}`}
    >
      {label}
      <span className="font-normal text-white/90">{name}</span>
    </span>
  );
}
