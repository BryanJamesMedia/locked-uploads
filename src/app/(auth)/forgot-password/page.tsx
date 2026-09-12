"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await authClient.requestPasswordReset({
        email: String(form.get("email")),
        redirectTo: "/reset-password",
      });
    } finally {
      setPending(false);
      setSent(true);
    }
  }

  return (
    <Card className="p-6">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Reset your password</h1>
      {sent ? (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          If your email is registered to an account you will receive an email to
          reset your password.
        </p>
      ) : (
        <form onSubmit={onSubmit}>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href="/login" className="font-medium text-slate-900">
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}
