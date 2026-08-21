import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { fileDownloads, files, listings, sellers } from "@/db/schema";
import { Countdown } from "@/components/countdown";
import { EmailGate } from "@/components/email-gate";
import { Card, CardTitle } from "@/components/ui/card";
import { hasAccess, loadToken } from "@/lib/download-access";
import { formatBytes } from "@/lib/files";
import { DOWNLOADS_PER_FILE, ZIP_DOWNLOADS_PER_SALE, ZIP_SIZE_LIMIT_BYTES } from "@/lib/plans";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileTile } from "@/components/file-tile";
import { Button } from "@/components/ui/button";

export default async function DownloadPage(props: PageProps<"/download/[token]">) {
  const { token } = await props.params;
  const result = await loadToken(token);
  if (result.state !== "valid") redirect("/expired");
  const sale = result.sale;

  const [row] = await db
    .select({ listing: listings, seller: sellers })
    .from(listings)
    .innerJoin(sellers, eq(sellers.id, listings.sellerId))
    .where(eq(listings.id, sale.listingId))
    .limit(1);
  if (!row) redirect("/expired");

  const unlocked = await hasAccess(sale);

  if (!unlocked) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-12">
        <h1 className="text-xl font-semibold text-slate-900">Your files are ready</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter the email you used at checkout to open your download.
        </p>
        <Card className="mt-6">
          <EmailGate token={token} />
        </Card>
      </main>
    );
  }

  const saleFiles = await db
    .select({
      id: files.id,
      fileName: files.fileName,
      fileType: files.fileType,
      sizeBytes: files.sizeBytes,
      previewPathname: files.previewPathname,
      downloadCount: fileDownloads.downloadCount,
    })
    .from(files)
    .leftJoin(
      fileDownloads,
      and(eq(fileDownloads.fileId, files.id), eq(fileDownloads.saleId, sale.id)),
    )
    .where(eq(files.listingId, sale.listingId))
    .orderBy(files.sortOrder);

  const zipRemaining = ZIP_DOWNLOADS_PER_SALE - sale.zipDownloadCount;
  const zipTooLarge = row.listing.totalSizeBytes > ZIP_SIZE_LIMIT_BYTES;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-900">{row.listing.title}</h1>
      <p className="mt-1 text-sm text-slate-500">
        From {row.seller.name} · {formatDate(sale.createdAt)} · {formatCurrency(sale.amount)}
      </p>
      <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
        This link expires in <Countdown expiresAt={sale.tokenExpiresAt.toISOString()} />. Save your
        files before then.
      </p>

      <Card className="mt-6">
        <CardTitle>Download everything</CardTitle>
        <p className="mt-1 text-sm text-slate-500">
          {zipTooLarge
            ? "This purchase is too large to zip — download the files individually below."
            : `ZIP downloads remaining: ${Math.max(zipRemaining, 0)} of ${ZIP_DOWNLOADS_PER_SALE}`}
        </p>
        <a href={`/api/download/${token}/zip`} className="mt-3 inline-block">
          <Button disabled={zipTooLarge || zipRemaining <= 0}>Download all as ZIP</Button>
        </a>
      </Card>

      <div className="mt-6 space-y-3">
        {saleFiles.map((file) => {
          const used = file.downloadCount ?? 0;
          const remaining = DOWNLOADS_PER_FILE - used;
          return (
            <Card key={file.id} className="flex items-center gap-3">
              <FileTile {...file} className="size-16 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{file.fileName}</p>
                <p className="text-xs text-slate-500">
                  {formatBytes(file.sizeBytes)} · {Math.max(remaining, 0)} of {DOWNLOADS_PER_FILE}{" "}
                  downloads left
                </p>
              </div>
              <a href={`/api/download/${token}/${file.id}`}>
                <Button size="sm" variant="secondary" disabled={remaining <= 0}>
                  Download
                </Button>
              </a>
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-slate-500">
        Need a new link or having trouble? Contact {row.seller.name} — they can re-issue your
        download instantly.
      </p>
    </main>
  );
}
