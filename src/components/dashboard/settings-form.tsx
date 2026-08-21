"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { saveSettings } from "@/app/dashboard/actions";

const toggles = [
  {
    name: "publicProfileEnabled",
    label: "Public profile",
    hint: "Show your public listings at your handle URL.",
  },
  { name: "emailOnSale", label: "Email me when I make a sale", hint: undefined },
  { name: "emailOnPayout", label: "Email me when a payout is processed", hint: undefined },
] as const;

export function SettingsForm({
  settings,
}: {
  settings: Record<(typeof toggles)[number]["name"], boolean>;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardTitle>Preferences</CardTitle>
      <form
        className="mt-3"
        action={(formData) =>
          startTransition(async () => {
            await saveSettings(formData);
            setSaved(true);
            router.refresh();
          })
        }
      >
        <div className="space-y-3">
          {toggles.map((toggle) => (
            <label key={toggle.name} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name={toggle.name}
                defaultChecked={settings[toggle.name]}
                className="mt-0.5 size-4 rounded border-slate-300"
              />
              <span>
                <span className="font-medium text-slate-900">{toggle.label}</span>
                {toggle.hint ? <span className="block text-xs text-slate-500">{toggle.hint}</span> : null}
              </span>
            </label>
          ))}
        </div>
        {saved ? <p className="mt-3 text-sm text-emerald-600">Settings saved.</p> : null}
        <Button type="submit" className="mt-4" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </form>
    </Card>
  );
}
