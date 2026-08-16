"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { requestPayout } from "@/app/dashboard/actions";

export function PayoutButton({ disabled, hint }: { disabled: boolean; hint?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <div className="mt-4">
      <Button
        disabled={disabled || busy}
        onClick={async () => {
          setBusy(true);
          const result = await requestPayout();
          setBusy(false);
          if (!result.ok) window.alert(result.error);
          router.refresh();
        }}
      >
        {busy ? "Requesting…" : "Withdraw to Stripe"}
      </Button>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
