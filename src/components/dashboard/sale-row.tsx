"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { reissueDownload } from "@/app/dashboard/actions";
import { formatCurrency, formatDate } from "@/lib/utils";

export type SaleView = {
  id: string;
  title: string;
  amount: string;
  net: string;
  buyerEmail: string;
  createdAt: string;
  tokenExpiresAt: string;
  reissueCount: number;
  accessedAt: Date | null;
};

export function SaleRow({
  sale,
  downloadUrl,
  expired,
}: {
  sale: SaleView;
  downloadUrl: string;
  expired: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900">{sale.title}</p>
        <p className="truncate text-sm text-slate-500">{sale.buyerEmail}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge tone={expired ? "amber" : "green"}>
            {expired ? "Link expired" : `Link valid until ${formatDate(sale.tokenExpiresAt)}`}
          </Badge>
          {sale.accessedAt ? <Badge>Downloaded</Badge> : <Badge tone="slate">Not opened</Badge>}
          {sale.reissueCount > 0 ? <Badge>Re-issued {sale.reissueCount}×</Badge> : null}
        </div>
      </div>

      <div className="text-right">
        <p className="font-semibold text-slate-900">{formatCurrency(sale.amount)}</p>
        <p className="text-xs text-slate-500">You earned {formatCurrency(sale.net)}</p>
        <p className="text-xs text-slate-400">{formatDate(sale.createdAt)}</p>
      </div>

      <div className="flex gap-2">
        <CopyLinkButton url={downloadUrl} label="Copy link" size="sm" variant="secondary" />
        <Button
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const result = await reissueDownload(sale.id);
            setBusy(false);
            if (!result.ok) window.alert(result.error);
            router.refresh();
          }}
        >
          {busy ? "Sending…" : "Re-issue"}
        </Button>
      </div>
    </Card>
  );
}
