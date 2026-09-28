import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm">Loading login…</p>}>
      <LoginForm />
    </Suspense>
  );
}
