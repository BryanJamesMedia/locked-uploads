import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { sellers } from "@/db/schema";
import { classifyFile } from "@/lib/files";
import { generateAvatar, generatePageBackground } from "@/lib/preview";
import { getSeller } from "@/lib/session";
import { deleteObjects, putObject, storagePaths } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;

type Kind = "avatar" | "background";

function kindOf(request: Request): Kind {
  return new URL(request.url).searchParams.get("kind") === "background"
    ? "background"
    : "avatar";
}

/** Uploads the seller's avatar or page background. Images are re-encoded. */
export async function POST(request: Request) {
  const seller = await getSeller();
  if (!seller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const kind = kindOf(request);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return Response.json({ error: "Missing image." }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "Images must be under 8 MB." },
      { status: 400 },
    );
  }
  if (
    classifyFile(file.name, file.type || "application/octet-stream") !== "image"
  ) {
    return Response.json(
      { error: "Choose a JPG, PNG or WebP image." },
      { status: 400 },
    );
  }

  const original = Buffer.from(await file.arrayBuffer());
  let image: Buffer;
  try {
    image =
      kind === "background"
        ? await generatePageBackground(original)
        : await generateAvatar(original);
  } catch (error) {
    return Response.json(
      { error: `Could not read that image: ${error}` },
      { status: 400 },
    );
  }

  // A fresh name each time, so the CDN cannot serve the previous image.
  const name = `${nanoid(10)}.jpg`;
  const pathname = await putObject(
    kind === "background"
      ? storagePaths.pageImage(seller.id, name)
      : storagePaths.avatar(seller.id, name),
    image,
    "image/jpeg",
  );
  const previous =
    kind === "background"
      ? seller.pageBackgroundImagePathname
      : seller.profileImagePathname;
  await db
    .update(sellers)
    .set(
      kind === "background"
        ? { pageBackgroundImagePathname: pathname, updatedAt: new Date() }
        : { profileImagePathname: pathname, updatedAt: new Date() },
    )
    .where(eq(sellers.id, seller.id));
  if (previous) await deleteObjects([previous]);

  return Response.json({ pathname });
}

export async function DELETE(request: Request) {
  const seller = await getSeller();
  if (!seller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const kind = kindOf(request);

  const previous =
    kind === "background"
      ? seller.pageBackgroundImagePathname
      : seller.profileImagePathname;
  await db
    .update(sellers)
    .set(
      kind === "background"
        ? { pageBackgroundImagePathname: null, updatedAt: new Date() }
        : { profileImagePathname: null, updatedAt: new Date() },
    )
    .where(eq(sellers.id, seller.id));
  if (previous) await deleteObjects([previous]);

  return Response.json({ ok: true });
}
