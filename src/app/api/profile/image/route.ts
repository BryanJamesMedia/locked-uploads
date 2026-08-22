import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { sellers } from "@/db/schema";
import { classifyFile } from "@/lib/files";
import { generateAvatar } from "@/lib/preview";
import { getSeller } from "@/lib/session";
import { deleteObjects, putObject, storagePaths } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;

/** Uploads the seller's avatar. The image is re-encoded before it is stored. */
export async function POST(request: Request) {
  const seller = await getSeller();
  if (!seller) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Missing image." }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Images must be under 8 MB." }, { status: 400 });
  }
  if (classifyFile(file.name, file.type || "application/octet-stream") !== "image") {
    return Response.json({ error: "Choose a JPG, PNG or WebP image." }, { status: 400 });
  }

  let avatar: Buffer;
  try {
    avatar = await generateAvatar(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    return Response.json({ error: `Could not read that image: ${error}` }, { status: 400 });
  }

  // A fresh name each time, so the CDN cannot serve the previous avatar.
  const pathname = await putObject(
    storagePaths.avatar(seller.id, `${nanoid(10)}.jpg`),
    avatar,
    "image/jpeg",
  );
  await db
    .update(sellers)
    .set({ profileImagePathname: pathname, updatedAt: new Date() })
    .where(eq(sellers.id, seller.id));
  if (seller.profileImagePathname) await deleteObjects([seller.profileImagePathname]);

  return Response.json({ pathname });
}

export async function DELETE() {
  const seller = await getSeller();
  if (!seller) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await db
    .update(sellers)
    .set({ profileImagePathname: null, updatedAt: new Date() })
    .where(eq(sellers.id, seller.id));
  if (seller.profileImagePathname) await deleteObjects([seller.profileImagePathname]);

  return Response.json({ ok: true });
}
