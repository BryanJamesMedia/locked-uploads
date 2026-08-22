import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { getSeller } from "@/lib/session";
import { putObject, storagePaths } from "@/lib/storage";
import { checkUpload, newFileId, registerUploadedFile } from "@/lib/uploads";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Direct server upload. Used in local development and for deployments without
 * a blob store; production uploads go straight to blob storage from the client.
 */
export async function POST(request: Request) {
  const seller = await getSeller();
  if (!seller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const listingId = String(form.get("listingId") ?? "");
  const file = form.get("file");

  if (!(file instanceof File) || !listingId) {
    return Response.json({ error: "Missing file or listing." }, { status: 400 });
  }

  const [listing] = await db
    .select({ id: listings.id })
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.sellerId, seller.id)))
    .limit(1);
  if (!listing) return Response.json({ error: "Listing not found." }, { status: 404 });

  const candidate = {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
  const check = await checkUpload(listingId, seller.id, seller.plan, candidate);
  if (!check.ok) return Response.json({ error: check.error }, { status: 400 });

  const fileId = newFileId();
  const buffer = Buffer.from(await file.arrayBuffer());
  const blobPathname = await putObject(
    storagePaths.original(seller.id, fileId, candidate.fileName),
    buffer,
    candidate.mimeType,
  );

  const { previewError } = await registerUploadedFile({
    fileId,
    listingId,
    sellerId: seller.id,
    fileName: candidate.fileName,
    mimeType: candidate.mimeType,
    sizeBytes: candidate.sizeBytes,
    fileType: check.fileType,
    blobPathname,
    buffer,
  });

  return Response.json({
    id: fileId,
    fileName: candidate.fileName,
    fileType: check.fileType,
    previewError,
  });
}
