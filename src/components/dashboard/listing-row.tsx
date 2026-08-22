"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { previewUrl } from "@/components/file-tile";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { listings } from "@/db/schema";
import { formatBytes } from "@/lib/files";
import { formatCurrency } from "@/lib/utils";
import {
  deleteListing,
  regenerateListingPreviews,
  toggleListingVisibility,
} from "@/app/dashboard/listings/actions";

type Listing = typeof listings.$inferSelect;

export function ListingRow({ listing, shareUrl }: { listing: Listing; shareUrl: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (!result.ok && result.error) window.alert(result.error);
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {listing.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl(listing.coverImage)} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-slate-400">
            {listing.fileCount} files
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900">{listing.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge>{listing.linkType === "permanent" ? "Permanent" : "Single-use"}</Badge>
          <Badge tone={listing.visibility === "public" ? "green" : "slate"}>
            {listing.visibility === "public" ? "Public" : "Private"}
          </Badge>
          {listing.status === "sold" ? <Badge tone="amber">Sold</Badge> : null}
          <span className="text-xs text-slate-500">
            {listing.fileCount} files · {formatBytes(listing.totalSizeBytes)} · {listing.salesCount}{" "}
            sales
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
        <p className="font-semibold text-slate-900">{formatCurrency(listing.price)}</p>
        <div className="flex gap-1">
          <CopyLinkButton url={shareUrl} label="" size="sm" variant="ghost" />
          {listing.coverImage ? null : (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              aria-label="Rebuild blurred previews"
              title="Rebuild blurred previews"
              onClick={() => void run(() => regenerateListingPreviews(listing.id))}
            >
              <RefreshCw className="size-4" />
            </Button>
          )}
          <Link href={`/dashboard/listings/${listing.id}/edit`}>
            <Button size="sm" variant="ghost" aria-label="Edit listing">
              <Pencil className="size-4" />
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy || listing.status === "sold"}
            aria-label="Toggle visibility"
            onClick={() => void run(() => toggleListingVisibility(listing.id))}
          >
            {listing.visibility === "public" ? (
              <Eye className="size-4" />
            ) : (
              <EyeOff className="size-4" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            aria-label="Delete listing"
            onClick={() => {
              if (window.confirm(`Delete "${listing.title}" and its files?`)) {
                void run(() => deleteListing(listing.id));
              }
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
