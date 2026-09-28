"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/actions";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const supabase = createClient();
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setPending(false);
    if (sendError) {
      setError(sendError.message);
      return;
    }
    setSent(true);
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (verifyError) {
      setPending(false);
      setError(verifyError.message);
      return;
    }
    await ensureProfile();
    const next = searchParams.get("next");
    const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    router.refresh();
    router.push(destination);
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-rose-100 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <p className="mt-2 text-sm leading-6 text-rose-950/70">
        Enter your email. SkillSwap will send a 6-digit code. That address is the only email saved for your account.
      </p>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-request">
          {error}
        </p>
      ) : null}
      {sent ? (
        <form onSubmit={verifyCode} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            6-digit code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-1 w-full rounded-xl border border-rose-200 px-3 py-2 tracking-[0.3em] outline-none focus:border-request"
            />
          </label>
          <button type="submit" disabled={pending} className="w-full rounded-full bg-request px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {pending ? "Checking code…" : "Continue"}
          </button>
        </form>
      ) : (
        <form onSubmit={sendCode} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-rose-200 px-3 py-2 font-normal outline-none focus:border-request"
            />
          </label>
          <button type="submit" disabled={pending} className="w-full rounded-full bg-request px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {pending ? "Sending code…" : "Send code"}
          </button>
        </form>
      )}
    </div>
  );
}
