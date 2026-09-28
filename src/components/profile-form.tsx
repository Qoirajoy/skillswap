"use client";

import { useActionState } from "react";
import { saveProfile, updateSkill, removeSkill, deleteProfile, suggestSkills, type ActionState } from "@/lib/actions";
import { ProfileFields } from "@/components/profile-fields";
import { SkillPill } from "@/components/skill-pill";
import { SuggestInput } from "@/components/suggest-input";
import { PROFICIENCY_OPTIONS, kindLabel, type Profile, type Skill } from "@/lib/constants";

const initial: ActionState = { error: "" };

export function ProfileForm({ profile, skills }: { profile: Profile; skills: Skill[] }) {
  const [state, action, pending] = useActionState(saveProfile, initial);

  return (
    <div className="space-y-8">
      <form action={action} className="space-y-6 rounded-3xl border border-rose-100 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold">Your profile</h1>
          <p className="mt-2 text-sm leading-6 text-rose-950/70">
            Name, college, major, year, and bio are what other students see. Add a skill in the same save.
          </p>
        </div>
        {state.error ? (
          <p role="alert" className="text-sm text-request">
            {state.error}
          </p>
        ) : null}
        <ProfileFields profile={profile} />
        <fieldset className="space-y-4 rounded-2xl bg-rose-50 p-4">
          <legend className="px-1 text-sm font-semibold">Add a skill</legend>
          <SuggestInput name="skill_name" label="Skill" maxLength={80} suggest={suggestSkills} />
          <label className="block text-sm font-medium">
            This skill is
            <select name="kind" defaultValue="offer" className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 font-normal">
              <option value="offer">a skill I can offer</option>
              <option value="want">a skill I want to learn</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Proficiency
            <select name="proficiency" defaultValue="beginner" className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 font-normal">
              {PROFICIENCY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Experience notes
            <textarea name="experience_notes" maxLength={1000} rows={3} className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 font-normal" />
          </label>
        </fieldset>
        <button type="submit" disabled={pending} className="rounded-full bg-request px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save profile"}
        </button>
      </form>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Your skills</h2>
        {skills.length === 0 ? <p className="text-sm text-rose-950/70">No skills yet. You can still browse Discover.</p> : null}
        {skills.map((skill) => (
          <SkillEditor key={skill.id} skill={skill} />
        ))}
      </section>

      <form
        action={deleteProfile}
        onSubmit={(event) => {
          if (!window.confirm("The other student will lose your email. Your login account stays, so you can sign in and start over.")) {
            event.preventDefault();
          }
        }}
      >
        <button type="submit" className="text-sm font-medium text-request">
          Delete profile
        </button>
      </form>
    </div>
  );
}

function SkillEditor({ skill }: { skill: Skill }) {
  const [state, action, pending] = useActionState(updateSkill, initial);
  return (
    <form action={action} className="space-y-3 rounded-3xl border border-rose-100 bg-white p-4">
      <input type="hidden" name="id" value={skill.id} />
      <SkillPill name={skill.skill_name} kind={skill.kind} />
      <p className="text-xs text-rose-950/60">{kindLabel(skill.kind)}</p>
      {state.error ? (
        <p role="alert" className="text-sm text-request">
          {state.error}
        </p>
      ) : null}
      <label className="block text-sm font-medium">
        Proficiency
        <select name="proficiency" defaultValue={skill.proficiency} className="mt-1 w-full rounded-xl border border-rose-200 px-3 py-2 font-normal">
          {PROFICIENCY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Experience notes
        <textarea
          name="experience_notes"
          maxLength={1000}
          rows={2}
          defaultValue={skill.experience_notes ?? ""}
          className="mt-1 w-full rounded-xl border border-rose-200 px-3 py-2 font-normal"
        />
      </label>
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="rounded-full bg-request px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          Update skill
        </button>
        <button type="submit" formAction={removeSkill} className="text-sm font-medium text-request">
          Remove
        </button>
      </div>
    </form>
  );
}
