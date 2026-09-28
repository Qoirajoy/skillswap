"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PROFICIENCY_OPTIONS, YEAR_OPTIONS, friendlyError, type Proficiency } from "@/lib/constants";

export type ActionState = {
  error: string;
};

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function yearValue(value: string) {
  return YEAR_OPTIONS.find((option) => option === value) ?? null;
}

function proficiencyValue(value: string): Proficiency | null {
  return PROFICIENCY_OPTIONS.find((option) => option === value) ?? null;
}

async function client() {
  return createClient();
}

export async function ensureProfile() {
  const supabase = await client();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!existing) {
    await supabase.from("profiles").insert({ id: data.user.id });
  }
}

export async function signOut() {
  const supabase = await client();
  await supabase.auth.signOut();
  redirect("/");
}

export async function saveProfile(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await client();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "You need to sign in first." };

  const year = yearValue(text(formData, "year"));
  if (text(formData, "year") && !year) return { error: "Choose a year from the list." };

  const profile = {
    id: data.user.id,
    full_name: text(formData, "full_name"),
    college: text(formData, "college"),
    major: text(formData, "major"),
    year,
    bio: text(formData, "bio"),
  };

  const { error: profileError } = await supabase.from("profiles").upsert(profile);
  if (profileError) return { error: friendlyError(profileError) };

  const skillName = text(formData, "skill_name");
  if (skillName) {
    const proficiency = proficiencyValue(text(formData, "proficiency"));
    const kind = text(formData, "kind");
    if (kind !== "offer" && kind !== "want") return { error: "Choose whether you offer this skill or want to learn it." };
    if (!proficiency) return { error: "Choose a proficiency for the new skill." };
    const { error: skillError } = await supabase.from("profile_skills").insert({
      user_id: data.user.id,
      skill_name: skillName,
      kind,
      proficiency,
      experience_notes: text(formData, "experience_notes") || null,
    });
    if (skillError) return { error: friendlyError(skillError) };
  }

  revalidatePath("/", "layout");
  return { error: "" };
}

export async function updateSkill(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await client();
  const proficiency = proficiencyValue(text(formData, "proficiency"));
  if (!proficiency) return { error: "Choose a proficiency." };
  const { error } = await supabase
    .from("profile_skills")
    .update({
      proficiency,
      experience_notes: text(formData, "experience_notes") || null,
    })
    .eq("id", text(formData, "id"));
  if (error) return { error: friendlyError(error) };
  revalidatePath("/profile");
  return { error: "" };
}

export async function removeSkill(formData: FormData) {
  const supabase = await client();
  await supabase.from("profile_skills").delete().eq("id", text(formData, "id"));
  revalidatePath("/profile");
}

export async function deleteProfile() {
  const supabase = await client();
  const { error } = await supabase.rpc("delete_own_profile");
  if (error) redirect(`/profile?error=${encodeURIComponent(friendlyError(error))}`);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function createPost(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await client();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "You need to sign in first." };

  const year = yearValue(text(formData, "year"));
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: data.user.id,
    full_name: text(formData, "full_name"),
    college: text(formData, "college"),
    major: text(formData, "major"),
    year,
    bio: text(formData, "bio"),
  });
  if (profileError) return { error: friendlyError(profileError) };

  const postType = text(formData, "post_type");
  if (postType !== "request" && postType !== "offer") {
    return { error: "Choose a help request or a skill offer." };
  }

  const { error } = await supabase.from("posts").insert({
    user_id: data.user.id,
    post_type: postType,
    skill_name: text(formData, "skill_name"),
    title: text(formData, "title"),
    description: text(formData, "description"),
  });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/", "layout");
  redirect("/my-posts");
}

export async function updatePost(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await client();
  const id = text(formData, "id");
  const status = text(formData, "status");
  if (status !== "open" && status !== "closed") return { error: "Choose open or closed." };

  const changes: {
    title: string;
    description: string;
    status: "open" | "closed";
    skill_name?: string;
    post_type?: "request" | "offer";
  } = {
    title: text(formData, "title"),
    description: text(formData, "description"),
    status,
  };

  if (formData.get("skill_locked") !== "true") {
    const postType = text(formData, "post_type");
    if (postType === "request" || postType === "offer") changes.post_type = postType;
    changes.skill_name = text(formData, "skill_name");
  }

  const { error } = await supabase.from("posts").update(changes).eq("id", id);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/", "layout");
  return { error: "" };
}

export async function setPostStatus(formData: FormData) {
  const supabase = await client();
  const status = text(formData, "status");
  if (status !== "open" && status !== "closed") return;
  const { error } = await supabase.from("posts").update({ status }).eq("id", text(formData, "id"));
  if (error) redirect(`/my-posts?error=${encodeURIComponent(friendlyError(error))}`);
  revalidatePath("/", "layout");
}

export async function deletePost(formData: FormData) {
  const supabase = await client();
  const id = text(formData, "id");
  await supabase.from("posts").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/my-posts");
}

export async function expressInterest(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await client();
  const skills = text(formData, "skill_count");
  const count = Number(skills) || 0;
  const payload = [];
  for (let index = 0; index < count; index += 1) {
    payload.push({
      skill_name: text(formData, `skill_name_${index}`),
      kind: text(formData, `skill_kind_${index}`),
      proficiency: text(formData, `skill_proficiency_${index}`),
      experience_notes: text(formData, `skill_notes_${index}`),
    });
  }

  const postId = text(formData, "post_id");
  const { error } = await supabase.rpc("express_interest", {
    p_full_name: text(formData, "full_name"),
    p_college: text(formData, "college"),
    p_major: text(formData, "major"),
    p_year: text(formData, "year"),
    p_bio: text(formData, "bio"),
    p_to_user_id: text(formData, "to_user_id"),
    p_post_id: postId || null,
    p_message: text(formData, "message"),
    p_skills: payload,
  });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/", "layout");
  redirect("/my-posts");
}

export async function respondToInterest(formData: FormData) {
  const supabase = await client();
  const status = text(formData, "status");
  if (status !== "accepted" && status !== "declined") return;
  await supabase.from("interests").update({ status }).eq("id", text(formData, "id"));
  revalidatePath("/", "layout");
}

export async function withdrawInterest(formData: FormData) {
  const supabase = await client();
  await supabase.from("interests").delete().eq("id", text(formData, "id"));
  revalidatePath("/my-posts");
}

export async function markInboxSeen() {
  const supabase = await client();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase
    .from("profiles")
    .update({ inbox_seen_at: new Date().toISOString() })
    .eq("id", data.user.id);
  revalidatePath("/", "layout");
}

export async function suggestColleges(query: string) {
  const supabase = await client();
  const needle = query.trim().replace(/[%_]/g, "");
  if (needle.length < 1) return [];
  const { data } = await supabase
    .from("profiles")
    .select("college")
    .ilike("college", `%${needle}%`)
    .limit(40);
  return uniqueSuggestions((data ?? []).map((row) => row.college));
}

export async function suggestMajors(query: string) {
  const supabase = await client();
  const needle = query.trim().replace(/[%_]/g, "");
  if (needle.length < 1) return [];
  const { data } = await supabase
    .from("profiles")
    .select("major")
    .ilike("major", `%${needle}%`)
    .limit(40);
  return uniqueSuggestions((data ?? []).map((row) => row.major));
}

export async function suggestSkills(query: string) {
  const supabase = await client();
  const needle = query.trim().replace(/[%_]/g, "");
  if (needle.length < 1) return [];
  const { data } = await supabase
    .from("profile_skills")
    .select("skill_name")
    .ilike("skill_name", `%${needle}%`)
    .limit(40);
  return uniqueSuggestions((data ?? []).map((row) => row.skill_name));
}

function uniqueSuggestions(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length === 8) break;
  }
  return result;
}
