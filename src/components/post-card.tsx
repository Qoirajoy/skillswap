import Link from "next/link";
import { postTypeLabel, type Post } from "@/lib/constants";

export function PostCard({ post }: { post: Post }) {
  const request = post.post_type === "request";
  return (
    <Link
      href={`/posts/${post.id}`}
      className={`block rounded-3xl border bg-white p-5 shadow-sm ${request ? "border-request/40" : "border-offer/40"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${request ? "bg-request" : "bg-offer"}`}>
          {postTypeLabel(post.post_type)}
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${request ? "bg-rose-100 text-request" : "bg-teal-100 text-offer"}`}>
          {post.skill_name}
        </span>
      </div>
      <h2 className="mt-3 text-lg font-semibold leading-6">{post.title}</h2>
      <p className="mt-2 text-sm text-rose-950/70">
        {post.full_name || "Student"}
        {post.college ? ` · ${post.college}` : ""}
      </p>
    </Link>
  );
}
