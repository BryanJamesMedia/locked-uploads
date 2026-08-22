import { notFound, permanentRedirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, sellers } from "@/db/schema";
import { listingPath } from "@/lib/utils";

/** Legacy listing URL. Kept so links shared before the move keep working. */
export default async function LegacyListingPage(props: PageProps<"/l/[slug]">) {
  const { slug } = await props.params;

  const [row] = await db
    .select({ publicId: sellers.publicId })
    .from(listings)
    .innerJoin(sellers, eq(sellers.id, listings.sellerId))
    .where(and(eq(listings.slug, slug), eq(listings.draft, false)))
    .limit(1);
  if (!row) notFound();

  permanentRedirect(listingPath(row.publicId, slug));
}
