import { createClient } from "@/lib/supabase/server";
import type { Post, Profile, Skill } from "@/lib/constants";

export async function currentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getProfile(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return { profile: (data as Profile | null) ?? null, error: error?.message ?? "" };
}

export async function getSkills(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_skills")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { skills: (data as Skill[] | null) ?? [], error: error?.message ?? "" };
}

export async function inboxCount(userId: string, seenAt: string | null) {
  const supabase = await createClient();
  const pending = await supabase
    .from("interests")
    .select("id", { count: "exact", head: true })
    .eq("to_user_id", userId)
    .eq("status", "pending");
  const acceptedQuery = supabase
    .from("interests")
    .select("id", { count: "exact", head: true })
    .eq("to_user_id", userId)
    .eq("status", "accepted");
  const accepted = seenAt
    ? await acceptedQuery.gt("updated_at", seenAt)
    : await acceptedQuery;
  return (pending.count ?? 0) + (accepted.count ?? 0);
}

export async function listColleges() {
  const supabase = await createClient();
  const names: string[] = [];
  for (let from = 0; from < 10000; from += 1000) {
    const { data, error } = await supabase
      .from("profiles")
      .select("college")
      .neq("college", "")
      .range(from, from + 999);
    if (error) return { names, error: error.message };
    const batch = data ?? [];
    names.push(...batch.map((row) => row.college as string));
    if (batch.length < 1000) break;
  }
  return { names, error: "" };
}

export async function listDiscoverPosts(collegeKey: string, postType: string, max = 10000) {
  const supabase = await createClient();
  const posts: Post[] = [];
  for (let from = 0; from < max; from += 1000) {
    const { data, error } = await supabase
      .rpc("list_discover_posts", {
        p_college_key: collegeKey,
        p_post_type: postType === "students" ? "" : postType,
      })
      .range(from, from + 999);
    if (error) return { posts, error: error.message };
    const batch = (data as Post[] | null) ?? [];
    posts.push(...batch);
    if (batch.length < 1000 || posts.length >= max) break;
  }
  return { posts: posts.slice(0, max), error: "" };
}

export async function listProfiles(collegeKey: string) {
  const supabase = await createClient();
  const profiles: Profile[] = [];
  for (let from = 0; from < 10000; from += 1000) {
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (collegeKey) query = query.eq("college_key", collegeKey);
    const { data, error } = await query.range(from, from + 999);
    if (error) return { profiles, error: error.message };
    const batch = (data as Profile[] | null) ?? [];
    profiles.push(...batch);
    if (batch.length < 1000) break;
  }
  return { profiles, error: "" };
}

export async function listSkillsForUsers(userIds: string[]) {
  if (userIds.length === 0) return { skills: [] as Skill[], error: "" };
  const supabase = await createClient();
  const skills: Skill[] = [];
  const chunkSize = 100;
  for (let index = 0; index < userIds.length; index += chunkSize) {
    const chunk = userIds.slice(index, index + chunkSize);
    const { data, error } = await supabase.from("profile_skills").select("*").in("user_id", chunk);
    if (error) return { skills, error: error.message };
    skills.push(...((data as Skill[] | null) ?? []));
  }
  return { skills, error: "" };
}

export async function listProfilePage(collegeKey: string, limit: number) {
  const supabase = await createClient();
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(limit);
  if (collegeKey) query = query.eq("college_key", collegeKey);
  const { data, error } = await query;
  return { profiles: (data as Profile[] | null) ?? [], error: error?.message ?? "" };
}

export async function listSkillsMatching(tokens: string[]) {
  if (tokens.length === 0) return { skills: [] as Skill[], error: "" };
  const supabase = await createClient();
  const skills: Skill[] = [];
  for (let from = 0; from < 5000; from += 1000) {
    const { data, error } = await supabase
      .from("profile_skills")
      .select("*")
      .or(tokens.map((token) => `skill_name.ilike.%${token}%`).join(","))
      .range(from, from + 999);
    if (error) return { skills, error: error.message };
    const batch = (data as Skill[] | null) ?? [];
    skills.push(...batch);
    if (batch.length < 1000) break;
  }
  return { skills, error: "" };
}

export async function listPostsMatching(tokens: string[]) {
  if (tokens.length === 0) return { posts: [] as Post[], error: "" };
  const supabase = await createClient();
  const posts: Post[] = [];
  for (let from = 0; from < 5000; from += 1000) {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("status", "open")
      .or(tokens.map((token) => `skill_name.ilike.%${token}%`).join(","))
      .range(from, from + 999);
    if (error) return { posts, error: error.message };
    const batch = (data as Post[] | null) ?? [];
    posts.push(...batch);
    if (batch.length < 1000) break;
  }
  return { posts, error: "" };
}

export async function listOpenPostsForUsers(userIds: string[]) {
  if (userIds.length === 0) return { posts: [] as Post[], error: "" };
  const supabase = await createClient();
  const posts: Post[] = [];
  const chunkSize = 100;
  for (let index = 0; index < userIds.length; index += chunkSize) {
    const chunk = userIds.slice(index, index + chunkSize);
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("status", "open")
      .in("user_id", chunk);
    if (error) return { posts, error: error.message };
    posts.push(...((data as Post[] | null) ?? []));
  }
  return { posts, error: "" };
}
