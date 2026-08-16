import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { ListingRow } from "@/components/dashboard/listing-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { requireSeller } from "@/lib/session";
import { appUrl } from "@/lib/utils";

export default async function ListingsPage() {
  const seller = await requireSeller();
  const rows = await db
    .select()
    .from(listings)
    .where(and(eq(listings.sellerId, seller.id), eq(listings.draft, false)))
    .orderBy(desc(listings.createdAt));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Listings</h1>
        <Link href="/dashboard/listings/new">
          <Button size="sm">
            <Plus className="size-4" />
            New listing
          </Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No listings yet"
          description="Upload your files, set a price and share the link. It takes under two minutes."
          action={
            <Link href="/dashboard/listings/new">
              <Button>Create your first listing</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((listing) => (
            <ListingRow key={listing.id} listing={listing} shareUrl={appUrl(`/l/${listing.slug}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
