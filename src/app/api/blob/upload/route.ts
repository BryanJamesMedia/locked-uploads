import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { listings, type FileType } from "@/db/schema";
import { requireSeller } from "@/lib/session";
import { storagePaths } from "@/lib/storage";
import { checkUpload, registerUploadedFile } from "@/lib/uploads";

export const runtime = "nodejs";

type Payload = {
  listingId: string;
  sellerId: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  fileType: FileType;
};

/**
 * Issues scoped client upload tokens so large originals go straight to private
 * blob storage, bypassing the serverless request body limit.
 */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const seller = await requireSeller();
        const requested = JSON.parse(clientPayload ?? "{}") as {
          listingId?: string;
          fileId?: string;
          fileName?: string;
          mimeType?: string;
          sizeBytes?: number;
        };
        if (!requested.listingId || !requested.fileId || !requested.fileName) {
          throw new Error("Malformed upload request.");
        }
        if (pathname !== storagePaths.original(seller.id, requested.fileId, requested.fileName)) {
          throw new Error("Upload path is not allowed.");
        }

        const [listing] = await db
          .select({ id: listings.id })
          .from(listings)
          .where(and(eq(listings.id, requested.listingId), eq(listings.sellerId, seller.id)))
          .limit(1);
        if (!listing) throw new Error("Listing not found.");

        const candidate = {
          fileName: requested.fileName,
          mimeType: requested.mimeType ?? "application/octet-stream",
          sizeBytes: requested.sizeBytes ?? 0,
        };
        const check = await checkUpload(listing.id, seller.id, seller.plan, candidate);
        if (!check.ok) throw new Error(check.error);

        const payload: Payload = {
          listingId: listing.id,
          sellerId: seller.id,
          fileId: requested.fileId,
          fileName: candidate.fileName,
          mimeType: candidate.mimeType,
          sizeBytes: candidate.sizeBytes,
          fileType: check.fileType,
        };

        return {
          addRandomSuffix: false,
          allowOverwrite: false,
          maximumSizeInBytes: 5 * 1024 * 1024 * 1024,
          tokenPayload: JSON.stringify(payload),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = JSON.parse(tokenPayload ?? "{}") as Payload;
        await registerUploadedFile({
          fileId: payload.fileId,
          listingId: payload.listingId,
          sellerId: payload.sellerId,
          fileName: payload.fileName,
          mimeType: payload.mimeType,
          sizeBytes: payload.sizeBytes,
          fileType: payload.fileType,
          blobPathname: blob.pathname,
        });
      },
    });

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 },
    );
  }
}
