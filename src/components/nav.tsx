import Link from "next/link";
import { signOut } from "@/lib/actions";
import { currentUser, getProfile, inboxCount } from "@/lib/data";

const links = [
  { href: "/", label: "Discover" },
  { href: "/matches", label: "Matches" },
  { href: "/my-posts", label: "My Posts" },
  { href: "/profile", label: "Profile" },
];

export async function Nav() {
  const user = await currentUser();
  let count = 0;
  if (user) {
    const { profile } = await getProfile(user.id);
    count = await inboxCount(user.id, profile?.inbox_seen_at ?? null);
  }

  return (
    <header className="border-b border-rose-100 bg-white/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold text-request">
          SkillSwap
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-full px-3 py-2 text-sm font-medium hover:bg-rose-50">
              {link.label}
              {link.href === "/my-posts" && count > 0 ? (
                <span className="ml-2 rounded-full bg-request px-2 py-0.5 text-xs text-white">{count}</span>
              ) : null}
            </Link>
          ))}
          {user ? (
            <form action={signOut}>
              <button type="submit" className="rounded-full px-3 py-2 text-sm font-medium hover:bg-rose-50">
                Logout
              </button>
            </form>
          ) : (
            <Link href="/login" className="rounded-full bg-request px-3 py-2 text-sm font-medium text-white">
              Login
            </Link>
          )}
        </nav>
      </div>
      <nav className="flex justify-around border-t border-rose-100 px-2 py-2 md:hidden">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="relative px-2 py-1 text-xs font-medium">
            {link.label}
            {link.href === "/my-posts" && count > 0 ? (
              <span className="absolute -top-1 -right-1 rounded-full bg-request px-1.5 text-[10px] text-white">{count}</span>
            ) : null}
          </Link>
        ))}
        {user ? (
          <form action={signOut}>
            <button type="submit" className="px-2 py-1 text-xs font-medium">
              Logout
            </button>
          </form>
        ) : (
          <Link href="/login" className="px-2 py-1 text-xs font-medium text-request">
            Login
          </Link>
        )}
      </nav>
    </header>
  );
}
