import { Suspense } from "react";
import { DiscoverFeed } from "@/components/discover-feed";

export default function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-rose-950/70">Loading Discover…</p>}>
      <DiscoverFeed searchParams={searchParams} />
    </Suspense>
  );
}
