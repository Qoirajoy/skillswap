export const YEAR_OPTIONS = [
  "First year",
  "Second year",
  "Third year",
  "Fourth year or later",
  "Master's",
  "PhD",
] as const;

export const PROFICIENCY_OPTIONS = ["beginner", "intermediate", "advanced"] as const;

export type YearOption = (typeof YEAR_OPTIONS)[number];
export type Proficiency = (typeof PROFICIENCY_OPTIONS)[number];

export type Profile = {
  id: string;
  full_name: string;
  college: string;
  major: string;
  year: string | null;
  bio: string;
  college_key: string;
  inbox_seen_at: string | null;
  created_at: string;
};

export type Skill = {
  id: string;
  user_id: string;
  skill_name: string;
  kind: "offer" | "want";
  proficiency: Proficiency;
  experience_notes: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  post_type: "request" | "offer";
  skill_name: string;
  title: string;
  description: string;
  status: "open" | "closed";
  created_at: string;
  full_name?: string;
  college?: string;
};

export function isProfileFilled(profile: Pick<Profile, "full_name" | "college" | "major" | "year" | "bio"> | null) {
  if (!profile) return false;
  return Boolean(
    profile.full_name.trim() &&
      profile.college.trim() &&
      profile.major.trim() &&
      profile.year &&
      profile.bio.trim(),
  );
}

export function postTypeLabel(postType: "request" | "offer") {
  return postType === "request" ? "Help request" : "Skill offer";
}

export function kindLabel(kind: "offer" | "want") {
  return kind === "offer" ? "Can offer" : "Wants to learn";
}

export function limitParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 20) return 20;
  return Math.min(Math.floor(parsed), 500);
}

export function oneParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function friendlyError(error: { message: string; code?: string } | null) {
  if (!error) return "Something went wrong. Try again.";
  if (error.code === "23505" || error.message.includes("duplicate")) {
    return "That is already saved. A pending or accepted interest cannot be sent twice.";
  }
  return error.message;
}
