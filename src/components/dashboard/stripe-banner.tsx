"use client";

import Link from "next/link";
import { useState } from "react";

export function StripeBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="mb-4 flex items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div>
        <p className="text-sm font-medium text-amber-900">Connect Stripe to get paid</p>
        <p className="text-sm text-amber-800">
          You can create listings now, but buyers cannot purchase until Stripe is connected.
        </p>
        <Link
          href="/onboarding"
          className="mt-2 inline-block text-sm font-medium text-amber-900 underline"
        >
          Connect Stripe
        </Link>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-sm text-amber-700 hover:text-amber-900"
        aria-label="Dismiss"
      >
        Dismiss
      </button>
    </div>
  );
}
