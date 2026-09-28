"use client";

import { useState } from "react";

export function CopyEmail({ label, email }: { label: string; email: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-2xl bg-rose-50 px-3 py-2">
      <p className="text-xs font-medium text-rose-950/60">{label}</p>
      <p className="mt-1 select-all text-sm">{email}</p>
      <button type="button" onClick={copy} className="mt-2 text-sm font-medium text-request">
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
