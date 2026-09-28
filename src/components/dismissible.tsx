"use client";

import { useState } from "react";

export function Dismissible({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="flex items-start justify-between gap-4 rounded-3xl border border-rose-200 bg-white px-5 py-4">
      <div>{children}</div>
      <button type="button" onClick={() => setOpen(false)} className="text-sm font-medium text-request">
        Dismiss
      </button>
    </div>
  );
}
