import { notFound } from "next/navigation";
import { and, eq, or, sql } from "drizzle-orm";
import { Lock, ShieldCheck, Timer } from "lucide-react";
import { db } from "@/db";
import { files, listings, sellers } from "@/db/schema";
import { BuyForm } from "@/components/buy-form";
import { FileTile } from "@/components/file-tile";
import { Card } from "@/components/ui/card";
import { formatBytes } from "@/lib/files";
import { formatCurrency } from "@/lib/utils";

/** The seller segment is the seller's public id; their handle also resolves. */
export default async function ListingPage(props: PageProps<"/[seller]/[slug]">) {
  const { seller: sellerRef, slug } = await props.params;

  const [row] = await db
    .select({ listing: listings })
    .from(listings)
    .innerJoin(sellers, eq(sellers.id, listings.sellerId))
    .where(
      and(
        eq(listings.slug, slug),
        eq(listings.draft, false),
        or(
          eq(sellers.publicId, sellerRef),
          sql`lower(${sellers.handle}) = lower(${sellerRef})`,
        ),
      ),
    )
    .limit(1);
  if (!row) notFound();

  const { listing } = row;

  // Only preview paths are selected: originals never reach the public page.
  const listingFiles = await db
    .select({
      id: files.id,
      fileName: files.fileName,
      fileType: files.fileType,
      sizeBytes: files.sizeBytes,
      previewPathname: files.previewPathname,
    })
    .from(files)
    .where(eq(files.listingId, listing.id))
    .orderBy(files.sortOrder);

  const sold = listing.status === "sold";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{listing.title}</h1>
      {listing.description ? (
        <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{listing.description}</p>
      ) : null}

      <p className="mt-3 text-sm text-slate-500">
        {listing.fileCount} file{listing.fileCount === 1 ? "" : "s"} ·{" "}
        {formatBytes(listing.totalSizeBytes)}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {listingFiles.map((file) => (
          <FileTile key={file.id} {...file} />
        ))}
      </div>

      <Card className="mt-6">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-500">Price</span>
          <span className="text-2xl font-semibold text-slate-900">
            {formatCurrency(listing.price)}
          </span>
        </div>

        {sold ? (
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            This listing has already been sold.
          </p>
        ) : (
          <BuyForm slug={listing.slug} price={formatCurrency(listing.price)} />
        )}
      </Card>

      <ul className="mt-6 space-y-2 text-sm text-slate-500">
        <li className="flex items-center gap-2">
          <Lock className="size-4" /> Previews are permanently degraded — originals stay locked
          until payment.
        </li>
        <li className="flex items-center gap-2">
          <ShieldCheck className="size-4" /> Payment is processed by Stripe.
        </li>
        <li className="flex items-center gap-2">
          <Timer className="size-4" /> Your download link stays active for 24 hours.
        </li>
      </ul>
    </main>
  );
}
