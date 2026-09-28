import Link from "next/link";
import { Dismissible } from "@/components/dismissible";
import { EmptyState } from "@/components/empty-state";
import { PostCard } from "@/components/post-card";
import { StudentCard } from "@/components/student-card";
import { isProfileFilled, limitParam, oneParam, type Post, type Profile, type Skill } from "@/lib/constants";
import {
  currentUser,
  getProfile,
  listColleges,
  listDiscoverPosts,
  listProfilePage,
  listProfiles,
  listSkillsForUsers,
  listSkillsMatching,
} from "@/lib/data";
import { groupColleges, rankItems, searchTokens, skillsMatch } from "@/lib/matching";

type Search = Record<string, string | string[] | undefined>;

function hrefFor(current: Search, updates: Record<string, string>) {
  const params = new URLSearchParams();
  const merged = {
    q: oneParam(current.q),
    college: oneParam(current.college),
    type: oneParam(current.type),
    postLimit: oneParam(current.postLimit),
    studentLimit: oneParam(current.studentLimit),
    ...updates,
  };
  for (const [key, value] of Object.entries(merged)) {
    if (value && value !== "all" && !(key.endsWith("Limit") && value === "20")) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export async function DiscoverFeed({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const user = await currentUser();
  if (!user) {
    return (
      <EmptyState
        title="Log in to browse SkillSwap"
        body="Discover help requests, skill offers, and students across campus. You can look around before you add any skills."
        href="/login"
        action="Log in"
      />
    );
  }

  const query = oneParam(params.q);
  const college = oneParam(params.college);
  const type = oneParam(params.type) || "all";
  const postLimit = limitParam(params.postLimit);
  const studentLimit = limitParam(params.studentLimit);
  const tokens = searchTokens(query);
  const showPosts = type !== "students";
  const showStudents = type === "all" || type === "students";

  const [{ profile, error: profileError }, collegeResult] = await Promise.all([
    getProfile(user.id),
    listColleges(),
  ]);
  const groups = groupColleges(collegeResult.names);
  const errors = [profileError, collegeResult.error].filter(Boolean);

  let posts: Post[] = [];
  let postHasMore = false;
  if (showPosts) {
    const result = await listDiscoverPosts(
      college,
      type === "requests" ? "request" : type === "offers" ? "offer" : "",
      query ? 10000 : postLimit + 1,
    );
    if (result.error) errors.push(result.error);
    const ranked = rankItems(
      result.posts,
      query,
      (post) => skillsMatch(query, post.skill_name),
      (post) => `${post.skill_name} ${post.title} ${post.description}`,
    );
    postHasMore = query ? ranked.length > postLimit : result.posts.length > postLimit;
    posts = ranked.slice(0, postLimit);
  }

  let studentCards: { profile: Profile; skills: Skill[] }[] = [];
  let studentHasMore = false;
  if (showStudents) {
    if (!query) {
      const page = await listProfilePage(college, studentLimit + 1);
      if (page.error) errors.push(page.error);
      studentHasMore = page.profiles.length > studentLimit;
      const visible = page.profiles.slice(0, studentLimit);
      const skillResult = await listSkillsForUsers(visible.map((item) => item.id));
      if (skillResult.error) errors.push(skillResult.error);
      studentCards = visible.map((item) => ({
        profile: item,
        skills: skillResult.skills.filter((skill) => skill.user_id === item.id),
      }));
    } else {
      const [profilesResult, skillsResult, postsResult] = await Promise.all([
        listProfiles(college),
        listSkillsMatching(tokens),
        listDiscoverPosts(college, "", 10000),
      ]);
      errors.push(profilesResult.error, skillsResult.error, postsResult.error);
      const profileIds = new Set(profilesResult.profiles.map((item) => item.id));
      const byUser = new Map<string, { skills: Skill[]; text: string[] }>();
      for (const skill of skillsResult.skills) {
        if (!profileIds.has(skill.user_id) || !skillsMatch(query, skill.skill_name)) continue;
        const entry = byUser.get(skill.user_id) ?? { skills: [], text: [] };
        entry.skills.push(skill);
        entry.text.push(`${skill.skill_name} ${skill.experience_notes ?? ""}`);
        byUser.set(skill.user_id, entry);
      }
      for (const post of postsResult.posts) {
        if (!profileIds.has(post.user_id) || !skillsMatch(query, post.skill_name)) continue;
        const entry = byUser.get(post.user_id) ?? { skills: [], text: [] };
        entry.text.push(`${post.skill_name} ${post.title} ${post.description}`);
        byUser.set(post.user_id, entry);
      }
      const ranked = profilesResult.profiles
        .filter((item) => byUser.has(item.id))
        .map((item) => ({
          profile: item,
          skills: byUser.get(item.id)?.skills ?? [],
          created_at: item.created_at,
          text: (byUser.get(item.id)?.text ?? []).join(" "),
        }));
      const ordered = rankItems(
        ranked,
        query,
        () => true,
        (item) => item.text,
      );
      studentHasMore = ordered.length > studentLimit;
      const visible = ordered.slice(0, studentLimit);
      const missingSkills = visible.filter((item) => item.skills.length === 0).map((item) => item.profile.id);
      const extra = await listSkillsForUsers(missingSkills);
      studentCards = visible.map((item) => ({
        profile: item.profile,
        skills:
          item.skills.length > 0
            ? item.skills
            : extra.skills.filter((skill) => skill.user_id === item.profile.id),
      }));
    }
  }

  const filters = [
    { id: "all", label: "All" },
    { id: "requests", label: "Help requests" },
    { id: "offers", label: "Skill offers" },
    { id: "students", label: "Students" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Discover</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-rose-950/70">
          Search the whole university, or stay in one college. Help requests are rose. Skill offers are teal.
        </p>
      </div>
      {profile && !isProfileFilled(profile) ? (
        <Dismissible>
          <p className="text-sm leading-6">
            Your profile is still empty, and that is fine for browsing.{" "}
            <Link href="/profile" className="font-medium text-request">
              Add your name, college, major, year, and bio
            </Link>{" "}
            before you post or express interest.
          </p>
        </Dismissible>
      ) : null}
      {errors.filter(Boolean).map((message) => (
        <p key={message} role="alert" className="text-sm text-request">
          {message}
        </p>
      ))}
      <form className="grid gap-3 rounded-3xl border border-rose-100 bg-white p-4 md:grid-cols-[1fr_16rem_auto]">
        <label className="text-sm font-medium">
          Skill
          <input
            name="q"
            defaultValue={query}
            placeholder="Python, design, Excel"
            className="mt-1 w-full rounded-xl border border-rose-200 px-3 py-2 font-normal outline-none focus:border-request"
          />
        </label>
        <label className="text-sm font-medium">
          College
          <select
            name="college"
            defaultValue={college}
            className="mt-1 w-full rounded-xl border border-rose-200 px-3 py-2 font-normal"
          >
            <option value="">All colleges</option>
            {groups.map((group) => (
              <option key={group.key} value={group.key}>
                {group.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="self-end rounded-full bg-request px-4 py-2 text-sm font-medium text-white">
          Search
        </button>
        {type !== "all" ? <input type="hidden" name="type" value={type} /> : null}
      </form>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = type === filter.id || (filter.id === "all" && type === "all");
          const tone =
            filter.id === "requests"
              ? active
                ? "bg-request text-white"
                : "border border-request text-request"
              : filter.id === "offers"
                ? active
                  ? "bg-offer text-white"
                  : "border border-offer text-offer"
                : active
                  ? "bg-rose-950 text-white"
                  : "border border-rose-200 bg-white";
          return (
            <Link
              key={filter.id}
              href={hrefFor(params, { type: filter.id, postLimit: "", studentLimit: "" })}
              className={`rounded-full px-4 py-2 text-sm font-medium ${tone}`}
            >
              {filter.label}
            </Link>
          );
        })}
        <Link href="/posts/new" className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium">
          New post
        </Link>
      </div>
      {showPosts ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            {type === "requests" ? "Help requests" : type === "offers" ? "Skill offers" : "Posts"}
          </h2>
          {posts.length === 0 ? (
            <EmptyState title="No posts yet" body="Try another skill or college, or publish a request of your own." href="/posts/new" action="New post" />
          ) : (
            <div className="grid gap-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
          {postHasMore ? (
            <Link href={hrefFor(params, { postLimit: String(postLimit + 20) })} className="inline-flex text-sm font-medium text-request">
              Load more posts
            </Link>
          ) : null}
        </section>
      ) : null}
      {showStudents ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Students</h2>
          {studentCards.length === 0 ? (
            <EmptyState title="No students match" body="Try a broader skill, or look across all colleges." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {studentCards.map((card) => (
                <StudentCard
                  key={card.profile.id}
                  id={card.profile.id}
                  name={card.profile.full_name}
                  college={card.profile.college}
                  major={card.profile.major}
                  year={card.profile.year}
                  skills={card.skills}
                />
              ))}
            </div>
          )}
          {studentHasMore ? (
            <Link href={hrefFor(params, { studentLimit: String(studentLimit + 20) })} className="inline-flex text-sm font-medium text-request">
              Load more students
            </Link>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
