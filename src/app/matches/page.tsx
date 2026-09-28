import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { ExpressInterestForm } from "@/components/express-interest-form";
import { limitParam, type Post, type Profile, type Skill } from "@/lib/constants";
import {
  currentUser,
  getProfile,
  getSkills,
  listPostsMatching,
  listSkillsMatching,
} from "@/lib/data";
import { complementaryMatches, searchTokens, type MatchPerson, type SkillSide } from "@/lib/matching";
import { ensureProfile } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

function sidesFrom(skills: Skill[], posts: Post[], kind: "offer" | "want", postType: "offer" | "request"): SkillSide[] {
  return [
    ...skills.filter((skill) => skill.kind === kind).map((skill) => ({
      name: skill.skill_name,
      context: skill.experience_notes ?? "",
    })),
    ...posts.filter((post) => post.post_type === postType).map((post) => ({
      name: post.skill_name,
      context: `${post.title} ${post.description}`,
    })),
  ];
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/matches");
  await ensureProfile();
  const params = await searchParams;
  const limit = limitParam(params.matchLimit);
  const [{ profile, error }, skillResult] = await Promise.all([getProfile(user.id), getSkills(user.id)]);
  if (!profile) return <p role="alert" className="text-sm text-request">{error || "Your profile could not be loaded."}</p>;

  const supabase = await createClient();
  const { data: ownPosts, error: postError } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "open");
  const myPosts = (ownPosts as Post[] | null) ?? [];
  const offered = sidesFrom(skillResult.skills, myPosts, "offer", "offer");
  const needed = sidesFrom(skillResult.skills, myPosts, "want", "request");

  if (offered.length === 0 && needed.length === 0) {
    return (
      <EmptyState
        title="No matches yet"
        body="Browse help requests for ideas, or add a skill you can offer and a skill you want."
        href="/?type=requests"
        action="Browse help requests"
      />
    );
  }

  const tokens = searchTokens(
    [...offered, ...needed].map((side) => `${side.name} ${side.context}`).join(" "),
  );
  const [skillsResult, postsResult, sent] = await Promise.all([
    listSkillsMatching(tokens),
    listPostsMatching(tokens),
    supabase
      .from("interests")
      .select("to_user_id, status")
      .eq("from_user_id", user.id)
      .is("post_id", null)
      .in("status", ["pending", "accepted"]),
  ]);
  const errors = [skillResult.error, postError?.message, skillsResult.error, postsResult.error].filter(Boolean);

  const people = new Map<string, { skills: Skill[]; posts: Post[] }>();
  for (const skill of skillsResult.skills) {
    if (skill.user_id === user.id) continue;
    const entry = people.get(skill.user_id) ?? { skills: [], posts: [] };
    entry.skills.push(skill);
    people.set(skill.user_id, entry);
  }
  for (const post of postsResult.posts) {
    if (post.user_id === user.id) continue;
    const entry = people.get(post.user_id) ?? { skills: [], posts: [] };
    entry.posts.push(post);
    people.set(post.user_id, entry);
  }

  const ids = [...people.keys()];
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("*").in("id", ids)
    : { data: [] };
  const me: MatchPerson = {
    id: user.id,
    name: profile.full_name || "You",
    offered,
    needed,
    profileOffers: skillResult.skills.filter((skill) => skill.kind === "offer").map((skill) => skill.skill_name),
    profileWants: skillResult.skills.filter((skill) => skill.kind === "want").map((skill) => skill.skill_name),
  };
  const others: MatchPerson[] = ((profiles as Profile[] | null) ?? []).map((person) => {
    const entry = people.get(person.id) ?? { skills: [], posts: [] };
    return {
      id: person.id,
      name: person.full_name || "Student",
      offered: sidesFrom(entry.skills, entry.posts, "offer", "offer"),
      needed: sidesFrom(entry.skills, entry.posts, "want", "request"),
      profileOffers: entry.skills.filter((skill) => skill.kind === "offer").map((skill) => skill.skill_name),
      profileWants: entry.skills.filter((skill) => skill.kind === "want").map((skill) => skill.skill_name),
    };
  });
  const cards = complementaryMatches(me, others);
  const visible = cards.slice(0, limit);
  const blockedIds = new Set((sent.data ?? []).map((row) => row.to_user_id as string));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Matches</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-rose-950/70">
          A match needs both directions: they offer something you need, and they need something you offer.
        </p>
      </div>
      {errors.map((message) => (
        <p key={message} role="alert" className="text-sm text-request">
          {message}
        </p>
      ))}
      {cards.length === 0 ? (
        <EmptyState title="No complementary matches yet" body="Nothing overlaps both ways. Keep browsing requests and offers while more students join." href="/" action="Back to Discover" />
      ) : (
        <div className="grid gap-4">
          {visible.map((card) => (
            <article key={card.id} className="space-y-4 rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{card.name}</h2>
                <Link href={`/profile/${card.id}`} className="text-sm font-medium text-request">
                  View profile
                </Link>
              </div>
              <p className="text-sm leading-6">{card.summary}</p>
              <ExpressInterestForm
                profile={profile}
                toUserId={card.id}
                missing={card.missing}
                blocked={blockedIds.has(card.id) ? "You already have a pending or accepted interest with this student." : undefined}
              />
            </article>
          ))}
        </div>
      )}
      {cards.length > limit ? (
        <Link href={`/matches?matchLimit=${limit + 20}`} className="inline-flex text-sm font-medium text-request">
          Load more matches
        </Link>
      ) : null}
    </div>
  );
}
