"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { unlockDownload } from "@/app/download/[token]/actions";

export function EmailGate({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          setError(null);
          const result = await unlockDownload(token, formData);
          if (result.ok) router.refresh();
          else setError(result.error);
        })
      }
    >
      <Field label="Purchase email" htmlFor="email" hint="Use the email you paid with.">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Checking…" : "Unlock downloads"}
      </Button>
    </form>
  );
}
