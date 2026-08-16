"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { changePlan } from "@/app/dashboard/actions";
import type { Plan } from "@/db/schema";
import { PLANS } from "@/lib/plans";
import { formatBytes } from "@/lib/files";

export function PlanPicker({ current }: { current: Plan }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Plan | null>(null);

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {(Object.keys(PLANS) as Plan[]).map((plan) => {
        const config = PLANS[plan];
        const isCurrent = plan === current;
        return (
          <Card key={plan} className={isCurrent ? "border-slate-900" : undefined}>
            <div className="flex items-center justify-between">
              <p className="font-semibold capitalize text-slate-900">{plan}</p>
              {isCurrent ? <Badge tone="green">Current</Badge> : null}
            </div>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              ${config.monthlyPrice}
              <span className="text-sm font-normal text-slate-500">/mo</span>
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
              <li className="flex gap-2">
                <Check className="size-4 shrink-0 text-emerald-600" />
                {(config.feeRate * 100).toFixed(0)}% platform fee
              </li>
              <li className="flex gap-2">
                <Check className="size-4 shrink-0 text-emerald-600" />
                {formatBytes(config.storagePerListingBytes)} per listing
              </li>
              <li className="flex gap-2">
                <Check className="size-4 shrink-0 text-emerald-600" />
                {config.activeListings === null
                  ? "Unlimited active listings"
                  : `${config.activeListings} active listings`}
              </li>
              <li className="flex gap-2">
                <Check className="size-4 shrink-0 text-emerald-600" />
                {config.video ? "Video uploads" : "No video uploads"}
              </li>
            </ul>
            <Button
              className="mt-4 w-full"
              variant={isCurrent ? "secondary" : "primary"}
              disabled={isCurrent || busy !== null}
              onClick={async () => {
                setBusy(plan);
                await changePlan(plan);
                setBusy(null);
                router.refresh();
              }}
            >
              {isCurrent ? "Current plan" : busy === plan ? "Switching…" : `Switch to ${plan}`}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
