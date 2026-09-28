import Link from "next/link";

export function EmptyState({
  title,
  body,
  href,
  action,
}: {
  title: string;
  body: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-rose-200 bg-white px-6 py-10 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-rose-950/70">{body}</p>
      {href && action ? (
        <Link href={href} className="mt-4 inline-flex rounded-full bg-request px-4 py-2 text-sm font-medium text-white">
          {action}
        </Link>
      ) : null}
    </div>
  );
}
