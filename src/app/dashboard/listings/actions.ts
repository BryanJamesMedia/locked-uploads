"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db";
import { files, listings, linkTypes, visibilities } from "@/db/schema";
import { requireSeller } from "@/lib/session";
import { deleteObjects } from "@/lib/storage";
import { canCreateListing, refreshListingAggregates } from "@/lib/uploads";
import { slugify } from "@/lib/utils";

const detailsSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  price: z.coerce.number().min(0.5, "Price must be at least $0.50").max(100000),
  linkType: z.enum(linkTypes),
  visibility: z.enum(visibilities),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

/** The storage prefix a client upload is allowed to write to. */
export async function getUploadPrefix(): Promise<string> {
  const seller = await requireSeller();
  return seller.id;
}

async function uniqueSlug(title: string): Promise<string> {
  const root = slugify(title);
  for (let attempt = 0; ; attempt++) {
    const candidate = attempt === 0 ? `${root}-${nanoid(6).toLowerCase()}` : `${root}-${nanoid(8).toLowerCase()}`;
    const existing = await db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.slug, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
  }
}

async function requireOwnedListing(listingId: string, sellerId: string) {
  const [listing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.sellerId, sellerId)))
    .limit(1);
  if (!listing) throw new Error("Listing not found");
  return listing;
}

/** Creates the draft the multi-step flow uploads into. */
export async function createDraftListing(): Promise<{ id: string } | { error: string }> {
  const seller = await requireSeller();
  if (!(await canCreateListing(seller.id, seller.plan))) {
    return { error: "You have reached the active listing limit on your plan." };
  }

  const id = nanoid(16);
  await db.insert(listings).values({
    id,
    sellerId: seller.id,
    slug: await uniqueSlug("listing"),
    title: "Untitled listing",
    price: "0",
    draft: true,
  });
  return { id };
}

export async function listListingFiles(listingId: string) {
  const seller = await requireSeller();
  return db
    .select({
      id: files.id,
      fileName: files.fileName,
      fileType: files.fileType,
      sizeBytes: files.sizeBytes,
      previewPathname: files.previewPathname,
      sortOrder: files.sortOrder,
    })
    .from(files)
    .where(and(eq(files.listingId, listingId), eq(files.sellerId, seller.id)))
    .orderBy(files.sortOrder);
}

export async function saveListingDetails(
  listingId: string,
  input: z.input<typeof detailsSchema>,
): Promise<ActionResult> {
  const seller = await requireSeller();
  const listing = await requireOwnedListing(listingId, seller.id);

  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { title, description, price, linkType, visibility } = parsed.data;

  await db
    .update(listings)
    .set({
      title,
      description: description || null,
      price: price.toFixed(2),
      linkType,
      visibility,
      slug: listing.draft ? await uniqueSlug(title) : listing.slug,
      updatedAt: new Date(),
    })
    .where(eq(listings.id, listingId));

  revalidatePath("/dashboard/listings");
  return { ok: true };
}

export async function publishListing(
  listingId: string,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const seller = await requireSeller();
  const listing = await requireOwnedListing(listingId, seller.id);
  if (listing.fileCount === 0) return { ok: false, error: "Add at least one file first." };
  if (Number(listing.price) <= 0) return { ok: false, error: "Set a price first." };

  await db
    .update(listings)
    .set({ draft: false, updatedAt: new Date() })
    .where(eq(listings.id, listingId));

  revalidatePath("/dashboard/listings");
  return { ok: true, slug: listing.slug };
}

export async function deleteListingFile(fileId: string): Promise<ActionResult> {
  const seller = await requireSeller();
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.sellerId, seller.id)))
    .limit(1);
  if (!file) return { ok: false, error: "File not found." };

  await db.delete(files).where(eq(files.id, fileId));
  await deleteObjects(
    [file.blobPathname, file.previewPathname].filter((path): path is string => Boolean(path)),
  );
  await refreshListingAggregates(file.listingId);
  return { ok: true };
}

export async function toggleListingVisibility(listingId: string): Promise<ActionResult> {
  const seller = await requireSeller();
  const listing = await requireOwnedListing(listingId, seller.id);
  if (listing.status === "sold") {
    return { ok: false, error: "Sold single-use listings stay private." };
  }

  await db
    .update(listings)
    .set({
      visibility: listing.visibility === "public" ? "private" : "public",
      updatedAt: new Date(),
    })
    .where(eq(listings.id, listingId));

  revalidatePath("/dashboard/listings");
  return { ok: true };
}

export async function deleteListing(listingId: string): Promise<ActionResult> {
  const seller = await requireSeller();
  await requireOwnedListing(listingId, seller.id);

  const rows = await db
    .select({ blobPathname: files.blobPathname, previewPathname: files.previewPathname })
    .from(files)
    .where(eq(files.listingId, listingId));

  await db.delete(listings).where(eq(listings.id, listingId));
  await deleteObjects(
    rows
      .flatMap((row) => [row.blobPathname, row.previewPathname])
      .filter((path): path is string => Boolean(path)),
  );

  revalidatePath("/dashboard/listings");
  return { ok: true };
}
