"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Label, Textarea } from "@/components/ui/input";
import { previewUrl } from "@/components/file-tile";
import { saveProfile } from "@/app/dashboard/actions";
import { DEFAULT_PAGE_BACKGROUND } from "@/lib/colors";

const PRESETS = [DEFAULT_PAGE_BACKGROUND, "#ffffff", "#0f172a", "#000000", "#fef3c7", "#ecfdf5"];

export function ProfileForm({
  seller,
  baseUrl,
}: {
  seller: {
    name: string;
    handle: string;
    bio: string | null;
    profileImagePathname: string | null;
    pageBackground: string | null;
  };
  baseUrl: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(seller.profileImagePathname);
  const [background, setBackground] = useState(seller.pageBackground ?? DEFAULT_PAGE_BACKGROUND);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function sendImage(body: FormData | null) {
    setUploading(true);
    setMessage(null);
    try {
      const response = await fetch(
        "/api/profile/image",
        body ? { method: "POST", body } : { method: "DELETE" },
      );
      const result: { pathname?: string; error?: string } = await response.json();
      if (!response.ok) {
        setMessage({ tone: "error", text: result.error ?? "Upload failed." });
        return;
      }
      setAvatar(result.pathname ?? null);
      setMessage({ tone: "ok", text: body ? "Profile image updated." : "Profile image removed." });
      router.refresh();
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <Card>
      <div className="mb-6">
        <Label>Profile image</Label>
        <div className="flex items-center gap-4">
          <div className="size-16 shrink-0 overflow-hidden rounded-full bg-slate-200">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl(avatar)} alt="" className="size-full object-cover" />
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const body = new FormData();
                body.append("file", file);
                void sendImage(body);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              {uploading ? "Uploading…" : avatar ? "Replace image" : "Upload image"}
            </Button>
            {avatar ? (
              <Button
                type="button"
                variant="ghost"
                disabled={uploading}
                onClick={() => void sendImage(null)}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">JPG, PNG or WebP, up to 8 MB.</p>
      </div>

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

        <Field
          label="Page background"
          htmlFor="pageBackground"
          hint="Colours the catalogue area of your public page. The top bar stays grey."
        >
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Pick a background colour"
              value={background}
              onChange={(event) => setBackground(event.target.value)}
              className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
            />
            <Input
              id="pageBackground"
              name="pageBackground"
              value={background}
              onChange={(event) => setBackground(event.target.value)}
              className="max-w-32"
            />
            <div className="flex gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-label={`Use ${preset}`}
                  onClick={() => setBackground(preset)}
                  style={{ backgroundColor: preset }}
                  className="size-7 rounded-full border border-slate-300"
                />
              ))}
            </div>
          </div>
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
