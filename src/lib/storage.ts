import { createReadStream, existsSync } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { del as blobDel, get as blobGet, put as blobPut } from "@vercel/blob";

/**
 * Whether an object may be served without an authorization check. This is the
 * app's own rule, independent of the blob store's access mode: previews are
 * always streamed through /api/preview, never linked to directly.
 */
export type Access = "public" | "private";

/**
 * Originals live under {sellerId}/files, previews under {sellerId}/previews and
 * avatars under {sellerId}/profile. Only previews and avatars are ever served
 * without an authorization check.
 */
export const storagePaths = {
  original: (sellerId: string, fileId: string, fileName: string) =>
    `${sellerId}/files/${fileId}-${sanitize(fileName)}`,
  preview: (sellerId: string, fileId: string) => `${sellerId}/previews/${fileId}.jpg`,
  avatar: (sellerId: string, fileName: string) => `${sellerId}/profile/${sanitize(fileName)}`,
};

function sanitize(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/**
 * A blob store is created as either public or private and rejects operations
 * using the other mode, so every read and write has to use the store's own
 * setting. Defaults to private, which keeps originals unreachable by URL.
 */
const blobAccess = (): "public" | "private" =>
  process.env.BLOB_STORE_ACCESS === "public" ? "public" : "private";
const localRoot = () => process.env.STORAGE_LOCAL_DIR ?? path.join(process.cwd(), ".storage");

function localPath(pathname: string): string {
  const root = path.resolve(localRoot());
  const resolved = path.resolve(root, pathname);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("Invalid storage path");
  }
  return resolved;
}

/** Public reads may only ever resolve to generated previews or avatars. */
function isPublicPathname(pathname: string): boolean {
  return /^[^/]+\/(previews|profile)\/[^/]+$/.test(path.posix.normalize(pathname));
}

export async function putObject(
  pathname: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  if (blobEnabled()) {
    await blobPut(pathname, body, {
      access: blobAccess(),
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return pathname;
  }
  const target = localPath(pathname);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
  return pathname;
}

export type StoredObject = {
  stream: ReadableStream<Uint8Array>;
  contentType: string | null;
  size: number | null;
};

export async function getObject(pathname: string, access: Access): Promise<StoredObject | null> {
  if (access === "public" && !isPublicPathname(pathname)) return null;
  if (blobEnabled()) {
    // Uncached: previews are built right after upload, before the CDN has the object.
    const result = await blobGet(pathname, { access: blobAccess(), useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return { stream: result.stream, contentType: result.blob.contentType, size: result.blob.size };
  }
  const target = localPath(pathname);
  if (!existsSync(target)) return null;
  const info = await stat(target);
  return {
    stream: Readable.toWeb(createReadStream(target)) as ReadableStream<Uint8Array>,
    contentType: null,
    size: info.size,
  };
}

export async function getObjectBuffer(pathname: string, access: Access): Promise<Buffer | null> {
  const object = await getObject(pathname, access);
  if (!object) return null;
  const chunks: Uint8Array[] = [];
  const reader = object.stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function deleteObjects(pathnames: string[]): Promise<void> {
  if (pathnames.length === 0) return;
  if (blobEnabled()) {
    await blobDel(pathnames).catch((error) => console.error("[storage] delete failed", error));
    return;
  }
  await Promise.all(
    pathnames.map((pathname) => rm(localPath(pathname), { force: true }).catch(() => undefined)),
  );
}
