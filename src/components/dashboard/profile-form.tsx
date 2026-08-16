"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { saveProfile } from "@/app/dashboard/actions";

export function ProfileForm({
  seller,
  baseUrl,
}: {
  seller: { name: string; handle: string; bio: string | null };
  baseUrl: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <form
        action={(formData) =>
          startTransition(async () => {
            const result = await saveProfile(formData);
            setMessage(
              result.ok
                ? { tone: "ok", text: "Profile saved." }
                : { tone: "error", text: result.error },
            );
            router.refresh();
          })
        }
      >
        <Field label="Display name" htmlFor="name">
          <Input id="name" name="name" defaultValue={seller.name} required />
        </Field>
        <Field label="Handle" htmlFor="handle" hint={`${baseUrl}/${seller.handle}`}>
          <Input id="handle" name="handle" defaultValue={seller.handle} required />
        </Field>
        <Field label="Bio" htmlFor="bio">
          <Textarea id="bio" name="bio" defaultValue={seller.bio ?? ""} maxLength={280} />
        </Field>
        {message ? (
          <p
            className={`mb-3 text-sm ${message.tone === "ok" ? "text-emerald-600" : "text-red-600"}`}
          >
            {message.text}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </Card>
  );
}
