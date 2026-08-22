import { and, eq, isNull, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { files, listings, sellers, type FileType, type Plan } from "@/db/schema";
import { classifyFile, formatBytes } from "./files";
import { PLANS } from "./plans";
import { generateImagePreview } from "./preview";
import { getObjectBuffer, putObject, storagePaths } from "./storage";

export type UploadCandidate = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type UploadCheck =
  | { ok: true; fileType: FileType }
  | { ok: false; error: string };

/**
 * Enforces the plan's per-listing limits. Runs before any bytes are accepted,
 * both for direct server uploads and for client-to-blob uploads.
 */
export async function checkUpload(
  listingId: string,
  sellerId: string,
  plan: Plan,
  candidate: UploadCandidate,
): Promise<UploadCheck> {
  const limits = PLANS[plan];
  const fileType = classifyFile(candidate.fileName, candidate.mimeType);
  if (!fileType) {
    return { ok: false, error: `${candidate.fileName} is not a supported file type.` };
  }
  if (fileType === "video" && !limits.video) {
    return { ok: false, error: "Video uploads require the Pro or Studio plan." };
  }

  const [listing] = await db
    .select({ totalSizeBytes: listings.totalSizeBytes })
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.sellerId, sellerId)))
    .limit(1);
  if (!listing) return { ok: false, error: "Listing not found." };

  if (listing.totalSizeBytes + candidate.sizeBytes > limits.storagePerListingBytes) {
    return {
      ok: false,
      error: `This listing would exceed the ${formatBytes(limits.storagePerListingBytes)} limit on the ${limits.label} plan.`,
    };
  }

  if (fileType === "image") {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(files)
      .where(and(eq(files.listingId, listingId), eq(files.fileType, "image")));
    if (count >= limits.imageCapPerListing) {
      return { ok: false, error: `A listing can hold at most ${limits.imageCapPerListing} images.` };
    }
  }

  return { ok: true, fileType };
}

export async function canCreateListing(sellerId: string, plan: Plan): Promise<boolean> {
  const limit = PLANS[plan].activeListings;
  if (limit === null) return true;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .where(
      and(eq(listings.sellerId, sellerId), eq(listings.status, "active"), eq(listings.draft, false)),
    );
  return count < limit;
}

export function newFileId(): string {
  return nanoid(16);
}

export type PreviewResult = { pathname: string } | { error: string };

/**
 * Builds and stores the degraded preview for one image. Reports the reason it
 * failed rather than throwing, so a preview failure never blocks an upload —
 * {@link ensureListingPreviews} retries it later.
 */
async function buildPreview(args: {
  fileId: string;
  sellerId: string;
  blobPathname: string;
  buffer?: Buffer;
}): Promise<PreviewResult> {
  let source: Buffer | null;
  try {
    source = args.buffer ?? (await getObjectBuffer(args.blobPathname, "private"));
  } catch (error) {
    return fail(args.blobPathname, "reading the original failed", error);
  }
  if (!source) return fail(args.blobPathname, "the original could not be read back");

  let preview: Buffer;
  try {
    preview = await generateImagePreview(source);
  } catch (error) {
    return fail(args.blobPathname, "image processing failed", error);
  }

  try {
    const pathname = await putObject(
      storagePaths.preview(args.sellerId, args.fileId),
      preview,
      "image/jpeg",
      "public",
    );
    return { pathname };
  } catch (error) {
    return fail(args.blobPathname, "storing the preview failed", error);
  }
}

function fail(blobPathname: string, stage: string, cause?: unknown): { error: string } {
  const detail = cause instanceof Error ? `: ${cause.name}: ${cause.message}` : "";
  const error = `${stage}${detail}`;
  console.error(`[preview] ${blobPathname} — ${error}`, cause);
  return { error };
}

/**
 * Regenerates previews for images that don't have one yet, e.g. uploads whose
 * preview failed at the time. Safe to call repeatedly.
 */
export async function ensureListingPreviews(
  listingId: string,
): Promise<{ repaired: number; error?: string }> {
  const pending = await db
    .select({
      id: files.id,
      sellerId: files.sellerId,
      blobPathname: files.blobPathname,
    })
    .from(files)
    .where(
      and(
        eq(files.listingId, listingId),
        eq(files.fileType, "image"),
        isNull(files.previewPathname),
      ),
    );

  let repaired = 0;
  let error: string | undefined;
  for (const file of pending) {
    const result = await buildPreview({
      fileId: file.id,
      sellerId: file.sellerId,
      blobPathname: file.blobPathname,
    });
    if ("error" in result) {
      error ??= result.error;
      continue;
    }
    await db.update(files).set({ previewPathname: result.pathname }).where(eq(files.id, file.id));
    repaired++;
  }

  if (repaired > 0) await refreshListingAggregates(listingId);
  return { repaired, error };
}

/**
 * Records an uploaded original, generating the irreversible preview for images.
 * `buffer` is optional: when omitted the original is read back from storage,
 * which is only needed to build image previews.
 */
export async function registerUploadedFile(args: {
  fileId: string;
  listingId: string;
  sellerId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  fileType: FileType;
  blobPathname: string;
  buffer?: Buffer;
}): Promise<{ previewError?: string }> {
  const preview = args.fileType === "image" ? await buildPreview(args) : null;
  const previewPathname = preview && "pathname" in preview ? preview.pathname : null;

  const [{ sortOrder }] = await db
    .select({ sortOrder: sql<number>`coalesce(max(${files.sortOrder}) + 1, 0)::int` })
    .from(files)
    .where(eq(files.listingId, args.listingId));

  await db.insert(files).values({
    id: args.fileId,
    listingId: args.listingId,
    sellerId: args.sellerId,
    fileName: args.fileName,
    fileType: args.fileType,
    mimeType: args.mimeType,
    sizeBytes: args.sizeBytes,
    blobPathname: args.blobPathname,
    previewPathname,
    sortOrder,
  });

  await refreshListingAggregates(args.listingId);
  return { previewError: preview && "error" in preview ? preview.error : undefined };
}

/** Recomputes file count, total size and cover image from the listing's files. */
export async function refreshListingAggregates(listingId: string): Promise<void> {
  const rows = await db
    .select({
      sizeBytes: files.sizeBytes,
      previewPathname: files.previewPathname,
      fileType: files.fileType,
      sortOrder: files.sortOrder,
    })
    .from(files)
    .where(eq(files.listingId, listingId));

  const ordered = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
  const cover = ordered.find((row) => row.fileType === "image" && row.previewPathname);

  await db
    .update(listings)
    .set({
      fileCount: rows.length,
      totalSizeBytes: rows.reduce((total, row) => total + row.sizeBytes, 0),
      coverImage: cover?.previewPathname ?? null,
      updatedAt: new Date(),
    })
    .where(eq(listings.id, listingId));
}

export async function getSellerPlan(sellerId: string): Promise<Plan> {
  const [seller] = await db
    .select({ plan: sellers.plan })
    .from(sellers)
    .where(eq(sellers.id, sellerId))
    .limit(1);
  return seller?.plan ?? "free";
}
