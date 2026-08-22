import { FileArchive, FileText, FileType2, Film, ImageIcon } from "lucide-react";
import type { FileType } from "@/db/schema";
import { formatBytes } from "@/lib/files";
import { cn } from "@/lib/utils";

const icons: Record<FileType, typeof FileText> = {
  image: ImageIcon,
  video: Film,
  pdf: FileText,
  document: FileType2,
  archive: FileArchive,
};

export function previewUrl(pathname: string): string {
  return `/api/preview/${pathname.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * Renders the irreversibly degraded preview (images) or a file-type icon, with
 * the file name and size beneath it. Never receives or references the original
 * file path.
 */
export function FileTile({
  fileName,
  fileType,
  sizeBytes,
  previewPathname,
  showCaption = true,
  className,
}: {
  fileName: string;
  fileType: FileType;
  sizeBytes: number;
  previewPathname?: string | null;
  /** Off where the surrounding layout already lists the name and size. */
  showCaption?: boolean;
  className?: string;
}) {
  const Icon = icons[fileType];

  return (
    <figure className={cn("flex flex-col gap-1.5", className)}>
      {fileType === "image" && previewPathname ? (
        <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl(previewPathname)}
            alt="Obscured preview"
            loading="lazy"
            className="size-full object-cover"
          />
          <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
            Locked
          </span>
        </div>
      ) : (
        <div className="flex aspect-square items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          <Icon className="size-7 text-slate-400" />
        </div>
      )}
      {showCaption ? (
        <figcaption className="px-0.5 text-center">
          <p className="line-clamp-2 break-all text-xs font-medium text-slate-700">{fileName}</p>
          <p className="text-[11px] text-slate-500">{formatBytes(sizeBytes)}</p>
        </figcaption>
      ) : null}
    </figure>
  );
}
