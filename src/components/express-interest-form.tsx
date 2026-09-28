"use client";

import { useActionState } from "react";
import { expressInterest, type ActionState } from "@/lib/actions";
import { ProfileFields } from "@/components/profile-fields";
import { PROFICIENCY_OPTIONS, isProfileFilled, kindLabel, type Profile } from "@/lib/constants";
import type { MissingSkill } from "@/lib/matching";

const initial: ActionState = { error: "" };

export function ExpressInterestForm({
  profile,
  toUserId,
  postId,
  missing,
  blocked,
}: {
  profile: Profile;
  toUserId: string;
  postId?: string | null;
  missing: MissingSkill[];
  blocked?: string;
}) {
  const [state, action, pending] = useActionState(expressInterest, initial);
  if (blocked) return <p className="text-sm text-rose-950/70">{blocked}</p>;

  return (
    <form action={action} className="space-y-4 rounded-3xl border border-rose-100 bg-white p-5">
      <h2 className="text-lg font-semibold">Express interest</h2>
      {state.error ? (
        <p role="alert" className="text-sm text-request">
          {state.error}
        </p>
      ) : null}
      <input type="hidden" name="to_user_id" value={toUserId} />
      <input type="hidden" name="post_id" value={postId ?? ""} />
      <input type="hidden" name="skill_count" value={missing.length} />
      {!isProfileFilled(profile) ? (
        <div className="space-y-3">
          <p className="text-sm">Add who you are before this interest is sent.</p>
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
      {missing.map((skill, index) => (
        <fieldset key={`${skill.kind}-${skill.name}`} className="space-y-3 rounded-2xl bg-rose-50 p-4">
          <legend className="px-1 text-sm font-semibold">
            {kindLabel(skill.kind)}: {skill.name}
          </legend>
          <input type="hidden" name={`skill_name_${index}`} value={skill.name} />
          <input type="hidden" name={`skill_kind_${index}`} value={skill.kind} />
          <label className="block text-sm font-medium">
            Proficiency
            <select name={`skill_proficiency_${index}`} required defaultValue="" className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 font-normal">
              <option value="" disabled>
                Choose proficiency
              </option>
              {PROFICIENCY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Experience notes
            <textarea name={`skill_notes_${index}`} maxLength={1000} rows={2} className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 font-normal" />
          </label>
        </fieldset>
      ))}
      <label className="block text-sm font-medium">
        Message
        <textarea name="message" maxLength={500} rows={3} className="mt-1 w-full rounded-xl border border-rose-200 px-3 py-2 font-normal" />
      </label>
      <button type="submit" disabled={pending} className="rounded-full bg-request px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {pending ? "Sending…" : "Express interest"}
      </button>
    </form>
  );
}
