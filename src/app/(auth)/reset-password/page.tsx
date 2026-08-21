"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("This reset link is invalid or has expired.");
      return;
    }
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await authClient.resetPassword({
      newPassword: String(form.get("password")),
      token,
    });
    if (result.error) {
      setError(result.error.message ?? "Could not reset password");
      setPending(false);
      return;
    }
    router.push("/login");
  }

  return (
    <form onSubmit={onSubmit}>
      <Field label="New password" htmlFor="password" hint="At least 8 characters.">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Card className="p-6">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Choose a new password</h1>
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-slate-900">
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}
