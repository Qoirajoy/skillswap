import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConfirmForm } from "@/components/confirm-form";
import { ExpressInterestForm } from "@/components/express-interest-form";
import { PostForm } from "@/components/post-form";
import { deletePost, ensureProfile } from "@/lib/actions";
import { postTypeLabel, type Post, type Profile } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { currentUser, getProfile, getSkills } from "@/lib/data";
import { skillsMatch } from "@/lib/matching";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/posts/${id}`);
  await ensureProfile();
  const supabase = await createClient();
  const [{ data, error }, mine, skills] = await Promise.all([
    supabase.from("posts").select("*").eq("id", id).maybeSingle(),
    getProfile(user.id),
    getSkills(user.id),
  ]);
  if (error) return <p role="alert" className="text-sm text-request">{error.message}</p>;
  if (!data || !mine.profile) notFound();

  const post = data as Post;
  const owner = post.user_id === user.id;
  const { profile: author } = owner ? { profile: mine.profile } : await getProfile(post.user_id);
  const { count } = await supabase
    .from("interests")
    .select("id", { count: "exact", head: true })
    .eq("post_id", post.id);
  const existing = owner
    ? null
    : await supabase
        .from("interests")
        .select("status")
        .eq("post_id", post.id)
        .eq("from_user_id", user.id)
        .in("status", ["pending", "accepted"])
        .maybeSingle();

  const requiredKind = post.post_type === "request" ? "offer" : "want";
  const alreadyHasSkill = skills.skills.some(
    (skill) => skill.kind === requiredKind && skillsMatch(skill.skill_name, post.skill_name),
  );
  const request = post.post_type === "request";
  let blocked = "";
  if (!owner && post.status !== "open") blocked = "This post is closed.";
  if (!owner && existing?.data?.status === "pending") blocked = "You already sent a pending interest.";
  if (!owner && existing?.data?.status === "accepted") blocked = "This interest was accepted. The email is on My Posts.";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <article className={`space-y-4 rounded-3xl border bg-white p-6 shadow-sm ${request ? "border-request/40" : "border-offer/40"}`}>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white ${request ? "bg-request" : "bg-offer"}`}>
          {postTypeLabel(post.post_type)}
        </span>
        <h1 className="text-3xl font-semibold leading-tight">{post.title}</h1>
        <p className="text-sm text-rose-950/70">
          {post.skill_name}
          {author ? ` · ${(author as Profile).full_name || "Student"}` : ""}
          {post.status === "closed" ? " · Closed" : ""}
        </p>
        {author ? (
          <Link href={`/profile/${author.id}`} className="text-sm font-medium text-request">
            View profile
          </Link>
        ) : null}
        <p className="max-w-2xl whitespace-pre-wrap text-sm leading-6">{post.description || "No extra detail yet."}</p>
        {owner ? (
          <ConfirmForm
            action={deletePost}
            id={post.id}
            label="Delete post"
            message="Delete this post? An accepted interest stays, and the other student keeps the shared email."
          />
        ) : null}
      </article>
      <div>
        {owner ? (
          <PostForm profile={mine.profile} post={post} skillLocked={(count ?? 0) > 0} />
        ) : (
          <ExpressInterestForm
            profile={mine.profile}
            toUserId={post.user_id}
            postId={post.id}
            missing={alreadyHasSkill ? [] : [{ name: post.skill_name, kind: requiredKind }]}
            blocked={blocked}
          />
        )}
      </div>
    </div>
  );
}
