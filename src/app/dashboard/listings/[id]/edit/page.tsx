import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { files, listings } from "@/db/schema";
import { ListingWizard } from "@/components/dashboard/listing-wizard";
import { requireSeller } from "@/lib/session";
import { appUrl } from "@/lib/utils";

export default async function EditListingPage(
  props: PageProps<"/dashboard/listings/[id]/edit">,
) {
  const { id } = await props.params;
  const seller = await requireSeller();

  const [listing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, id), eq(listings.sellerId, seller.id)))
    .limit(1);
  if (!listing) notFound();

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

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Edit listing</h1>
      <ListingWizard
        plan={seller.plan}
        appUrl={appUrl()}
        sellerPublicId={seller.publicId}
        listing={{
          id: listing.id,
          title: listing.title,
          description: listing.description,
          price: listing.price,
          linkType: listing.linkType,
          visibility: listing.visibility,
          slug: listing.slug,
          draft: listing.draft,
        }}
        files={listingFiles}
      />
    </div>
  );
}
