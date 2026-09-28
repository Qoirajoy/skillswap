import Link from "next/link";
import { SkillPill } from "@/components/skill-pill";
import type { Skill } from "@/lib/constants";

export function StudentCard({
  id,
  name,
  college,
  major,
  year,
  skills,
}: {
  id: string;
  name: string;
  college: string;
  major: string;
  year: string | null;
  skills: Skill[];
}) {
  return (
    <Link href={`/profile/${id}`} className="block rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{name || "Student"}</h2>
      <p className="mt-1 text-sm text-rose-950/70">
        {[college, major, year].filter(Boolean).join(" · ") || "Profile in progress"}
      </p>
      {skills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {skills.slice(0, 6).map((skill) => (
            <SkillPill key={skill.id} name={skill.skill_name} kind={skill.kind} />
          ))}
        </div>
      ) : null}
    </Link>
  );
}
