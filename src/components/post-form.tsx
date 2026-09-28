"use client";

import { useActionState } from "react";
import { createPost, updatePost, suggestSkills, type ActionState } from "@/lib/actions";
import { ProfileFields } from "@/components/profile-fields";
import { SuggestInput } from "@/components/suggest-input";
import { isProfileFilled, type Post, type Profile } from "@/lib/constants";

const initial: ActionState = { error: "" };

export function PostForm({
  profile,
  post,
  skillLocked = false,
}: {
  profile: Profile;
  post?: Post;
  skillLocked?: boolean;
}) {
  const editing = Boolean(post);
  const [state, action, pending] = useActionState(editing ? updatePost : createPost, initial);
  const showProfile = !editing && !isProfileFilled(profile);

  return (
    <form action={action} className="space-y-5 rounded-3xl border border-rose-100 bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold">{editing ? "Edit post" : "New post"}</h1>
        <p className="mt-2 text-sm leading-6 text-rose-950/70">
          The title is the one-sentence summary students see on a card. The description is the longer detail.
        </p>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-request">
          {state.error}
        </p>
      ) : null}
      {post ? <input type="hidden" name="id" value={post.id} /> : null}
      <input type="hidden" name="skill_locked" value={skillLocked ? "true" : "false"} />
      {showProfile ? (
        <div className="space-y-3">
          <p className="text-sm">Add your name, college, major, year, and bio so people know who posted this.</p>
          <ProfileFields profile={profile} />
        </div>
      ) : (
        <>
          <input type="hidden" name="full_name" value={profile.full_name} />
          <input type="hidden" name="college" value={profile.college} />
          <input type="hidden" name="major" value={profile.major} />
          <input type="hidden" name="year" value={profile.year ?? ""} />
          <input type="hidden" name="bio" value={profile.bio} />
        </>
      )}
      <label className="block text-sm font-medium">
        Type
        <select
          name="post_type"
          defaultValue={post?.post_type ?? "request"}
          disabled={skillLocked}
          className="mt-1 w-full rounded-xl border border-rose-200 px-3 py-2 font-normal disabled:bg-rose-50"
        >
          <option value="request">Help request</option>
          <option value="offer">Skill offer</option>
        </select>
      </label>
      {skillLocked ? <input type="hidden" name="post_type" value={post?.post_type} /> : null}
      <SuggestInput
        name="skill_name"
        label="Skill"
        required
        maxLength={80}
        defaultValue={post?.skill_name ?? ""}
        suggest={suggestSkills}
      />
      {skillLocked ? <p className="text-sm text-rose-950/70">Skill and type stay as they are after the first interest.</p> : null}
      <label className="block text-sm font-medium">
        Summary
        <input
          name="title"
          required
          maxLength={140}
          defaultValue={post?.title ?? ""}
          className="mt-1 w-full rounded-xl border border-rose-200 px-3 py-2 font-normal outline-none focus:border-request"
        />
      </label>
      <label className="block text-sm font-medium">
        Detail
        <textarea
          name="description"
          maxLength={2000}
          rows={6}
          defaultValue={post?.description ?? ""}
          className="mt-1 w-full rounded-xl border border-rose-200 px-3 py-2 font-normal outline-none focus:border-request"
        />
      </label>
      {editing ? (
        <label className="block text-sm font-medium">
          Status
          <select name="status" defaultValue={post?.status ?? "open"} className="mt-1 w-full rounded-xl border border-rose-200 px-3 py-2 font-normal">
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      ) : null}
      <button type="submit" disabled={pending} className="rounded-full bg-request px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {pending ? "Saving…" : editing ? "Save changes" : "Publish"}
      </button>
    </form>
  );
}
