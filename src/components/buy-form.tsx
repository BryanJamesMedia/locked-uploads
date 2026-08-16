"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { startCheckout } from "@/app/l/[slug]/actions";

export function BuyForm({ slug, price }: { slug: string; price: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-4"
      action={(formData) =>
        startTransition(async () => {
          setError(null);
          const result = await startCheckout(slug, formData);
          if (result?.error) setError(result.error);
        })
      }
    >
      <Field
        label="Your email"
        htmlFor="email"
        hint="Your download link is sent here, and you'll enter it again to open the files."
      >
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Starting checkout…" : `Buy for ${price}`}
      </Button>
    </form>
  );
}
