import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SkillPill } from "@/components/skill-pill";
import { currentUser, getProfile, getSkills } from "@/lib/data";

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/profile/${id}`);
  const [{ profile, error }, skills] = await Promise.all([getProfile(id), getSkills(id)]);
  if (error) return <p role="alert" className="text-sm text-request">{error}</p>;
  if (!profile) notFound();

  return (
    <article className="space-y-6 rounded-3xl border border-rose-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{profile.full_name || "Student"}</h1>
          <p className="mt-2 text-sm text-rose-950/70">
            {[profile.college, profile.major, profile.year].filter(Boolean).join(" · ") || "Profile in progress"}
          </p>
        </div>
        {user.id === profile.id ? (
          <Link href="/profile" className="rounded-full bg-request px-4 py-2 text-sm font-medium text-white">
            Edit profile
          </Link>
        ) : null}
      </div>
      {profile.bio ? <p className="max-w-2xl text-sm leading-6">{profile.bio}</p> : null}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Skills</h2>
        {skills.skills.length === 0 ? <p className="text-sm text-rose-950/70">No skills listed yet.</p> : null}
        {skills.skills.map((skill) => (
          <div key={skill.id} className="space-y-2">
            <SkillPill name={skill.skill_name} kind={skill.kind} />
            <p className="text-sm capitalize text-rose-950/70">{skill.proficiency}</p>
            {skill.experience_notes ? <p className="text-sm leading-6">{skill.experience_notes}</p> : null}
          </div>
        ))}
      </section>
    </article>
  );
}
