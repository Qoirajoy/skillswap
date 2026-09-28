import { redirect } from "next/navigation";
import { PostForm } from "@/components/post-form";
import { ensureProfile } from "@/lib/actions";
import { currentUser, getProfile } from "@/lib/data";

export default async function NewPostPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/posts/new");
  await ensureProfile();
  const { profile, error } = await getProfile(user.id);
  if (!profile) return <p role="alert" className="text-sm text-request">{error || "Your profile could not be loaded."}</p>;
  return <PostForm profile={profile} />;
}
