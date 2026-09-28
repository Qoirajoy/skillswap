import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { ensureProfile } from "@/lib/actions";
import { currentUser, getProfile, getSkills } from "@/lib/data";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/profile");
  await ensureProfile();
  const params = await searchParams;
  const [{ profile, error }, skills] = await Promise.all([getProfile(user.id), getSkills(user.id)]);
  const notice = typeof params.error === "string" ? params.error : "";
  if (!profile) {
    return (
      <p role="alert" className="text-sm text-request">
        {error || "Your profile could not be loaded."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {notice ? (
        <p role="alert" className="text-sm text-request">
          {notice}
        </p>
      ) : null}
      {error || skills.error ? (
        <p role="alert" className="text-sm text-request">
          {error || skills.error}
        </p>
      ) : null}
      <ProfileForm profile={profile} skills={skills.skills} />
    </div>
  );
}
