import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfirmForm } from "@/components/confirm-form";
import { CopyEmail } from "@/components/copy-email";
import { EmptyState } from "@/components/empty-state";
import { MarkInboxSeen } from "@/components/mark-inbox-seen";
import { deletePost, respondToInterest, setPostStatus, withdrawInterest } from "@/lib/actions";
import { postTypeLabel, type Post } from "@/lib/constants";
import { currentUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

type InterestRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  post_id: string | null;
  message: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

export default async function MyPostsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/my-posts");
  const params = await searchParams;
  const notice = typeof params.error === "string" ? params.error : "";
  const supabase = await createClient();
  const [postsResult, interestsResult] = await Promise.all([
    supabase.from("posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase
      .from("interests")
      .select("*")
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false }),
  ]);
  const posts = (postsResult.data as Post[] | null) ?? [];
  const interests = (interestsResult.data as InterestRow[] | null) ?? [];
  const errors = [postsResult.error?.message, interestsResult.error?.message].filter(Boolean);
  const otherIds = [
    ...new Set(interests.map((interest) => (interest.from_user_id === user.id ? interest.to_user_id : interest.from_user_id))),
  ];
  const contactIds = [...new Set([user.id, ...otherIds])];
  const [{ data: people }, { data: contacts }] = await Promise.all([
    otherIds.length ? supabase.from("profiles").select("id, full_name").in("id", otherIds) : Promise.resolve({ data: [] }),
    supabase.from("profile_contacts").select("user_id, email").in("user_id", contactIds),
  ]);
  const names = new Map((people ?? []).map((person) => [person.id as string, (person.full_name as string) || "Student"]));
  const emails = new Map((contacts ?? []).map((contact) => [contact.user_id as string, contact.email as string]));
  const received = interests.filter((interest) => interest.to_user_id === user.id);
  const sent = interests.filter((interest) => interest.from_user_id === user.id);

  return (
    <div className="space-y-8">
      <MarkInboxSeen />
      <div>
        <h1 className="text-3xl font-semibold">My Posts</h1>
        <p className="mt-2 text-sm text-rose-950/70">Your requests, offers, and the interests connected to them.</p>
      </div>
      {notice ? <p role="alert" className="text-sm text-request">{notice}</p> : null}
      {errors.map((message) => (
        <p key={message} role="alert" className="text-sm text-request">
          {message}
        </p>
      ))}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Posts</h2>
          <Link href="/posts/new" className="text-sm font-medium text-request">
            New post
          </Link>
        </div>
        {posts.length === 0 ? <EmptyState title="No posts yet" body="Publish a help request or a skill offer." href="/posts/new" action="New post" /> : null}
        {posts.map((post) => {
          const request = post.post_type === "request";
          return (
            <article key={post.id} className={`space-y-3 rounded-3xl border bg-white p-5 ${request ? "border-request/40" : "border-offer/40"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${request ? "bg-request" : "bg-offer"}`}>
                  {postTypeLabel(post.post_type)}
                </span>
                <span className="text-sm">{post.skill_name}</span>
                <span className="text-sm capitalize text-rose-950/60">{post.status}</span>
              </div>
              <h3 className="text-lg font-semibold">{post.title}</h3>
              <div className="flex flex-wrap gap-3">
                <Link href={`/posts/${post.id}`} className="text-sm font-medium text-request">
                  Edit
                </Link>
                <form action={setPostStatus}>
                  <input type="hidden" name="id" value={post.id} />
                  <input type="hidden" name="status" value={post.status === "open" ? "closed" : "open"} />
                  <button type="submit" className="text-sm font-medium text-request">
                    Mark {post.status === "open" ? "closed" : "open"}
                  </button>
                </form>
                <ConfirmForm
                  action={deletePost}
                  id={post.id}
                  label="Delete"
                  message="Delete this post? An accepted interest stays, and the other student keeps the shared email."
                />
              </div>
            </article>
          );
        })}
      </section>

      <InterestList
        title="Interests sent to you"
        rows={received}
        userId={user.id}
        names={names}
        emails={emails}
        incoming
      />
      <InterestList title="Interests you sent" rows={sent} userId={user.id} names={names} emails={emails} incoming={false} />
    </div>
  );
}

function InterestList({
  title,
  rows,
  userId,
  names,
  emails,
  incoming,
}: {
  title: string;
  rows: InterestRow[];
  userId: string;
  names: Map<string, string>;
  emails: Map<string, string>;
  incoming: boolean;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-rose-950/70">None yet.</p> : null}
      {rows.map((interest) => {
        const otherId = interest.from_user_id === userId ? interest.to_user_id : interest.from_user_id;
        const otherName = names.get(otherId) || "Student";
        return (
          <article key={interest.id} className="space-y-3 rounded-3xl border border-rose-100 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/profile/${otherId}`} className="font-semibold text-request">
                {otherName}
              </Link>
              <span className="text-sm capitalize">{interest.status}</span>
            </div>
            {interest.message ? <p className="text-sm leading-6">{interest.message}</p> : null}
            {interest.status === "accepted" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {emails.get(userId) ? <CopyEmail label="Your email" email={emails.get(userId)!} /> : null}
                {emails.get(otherId) ? <CopyEmail label={`${otherName}'s email`} email={emails.get(otherId)!} /> : null}
              </div>
            ) : null}
            {incoming && interest.status === "pending" ? (
              <div className="flex gap-3">
                <form action={respondToInterest}>
                  <input type="hidden" name="id" value={interest.id} />
                  <input type="hidden" name="status" value="accepted" />
                  <button type="submit" className="rounded-full bg-offer px-4 py-2 text-sm font-medium text-white">
                    Accept
                  </button>
                </form>
                <form action={respondToInterest}>
                  <input type="hidden" name="id" value={interest.id} />
                  <input type="hidden" name="status" value="declined" />
                  <button type="submit" className="rounded-full border border-request px-4 py-2 text-sm font-medium text-request">
                    Decline
                  </button>
                </form>
              </div>
            ) : null}
            {!incoming && interest.status === "pending" ? (
              <form action={withdrawInterest}>
                <input type="hidden" name="id" value={interest.id} />
                <button type="submit" className="text-sm font-medium text-request">
                  Withdraw
                </button>
              </form>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
