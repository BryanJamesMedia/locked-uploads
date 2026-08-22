"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Loader2, Trash2, UploadCloud } from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Input, Label, Textarea } from "@/components/ui/input";
import { CopyLinkButton } from "@/components/copy-link-button";
import { FileTile } from "@/components/file-tile";
import type { FileType, Plan } from "@/db/schema";
import { ACCEPTED_EXTENSIONS, formatBytes } from "@/lib/files";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import {
  createDraftListing,
  deleteListingFile,
  getUploadPrefix,
  listListingFiles,
  publishListing,
  saveListingDetails,
} from "@/app/dashboard/listings/actions";

export type WizardFile = {
  id: string;
  fileName: string;
  fileType: FileType;
  sizeBytes: number;
  previewPathname: string | null;
};

export type WizardListing = {
  id: string;
  title: string;
  description: string | null;
  price: string;
  linkType: "permanent" | "single_use";
  visibility: "public" | "private";
  slug: string;
  draft: boolean;
};

const steps = ["Upload", "Details", "Settings", "Review"] as const;

export function ListingWizard({
  plan,
  appUrl,
  listing: initialListing,
  files: initialFiles,
}: {
  plan: Plan;
  appUrl: string;
  listing?: WizardListing;
  files?: WizardFile[];
}) {
  const router = useRouter();
  const limits = PLANS[plan];
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [listingId, setListingId] = useState<string | null>(initialListing?.id ?? null);
  const [slug, setSlug] = useState(initialListing?.slug ?? "");
  const [files, setFiles] = useState<WizardFile[]>(initialFiles ?? []);
  const [uploading, setUploading] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);

  const [title, setTitle] = useState(initialListing?.title === "Untitled listing" ? "" : (initialListing?.title ?? ""));
  const [description, setDescription] = useState(initialListing?.description ?? "");
  const [price, setPrice] = useState(
    initialListing && Number(initialListing.price) > 0 ? initialListing.price : "",
  );
  const [linkType, setLinkType] = useState<WizardListing["linkType"]>(
    initialListing?.linkType ?? "permanent",
  );
  const [visibility, setVisibility] = useState<WizardListing["visibility"]>(
    initialListing?.visibility ?? "public",
  );

  const totalBytes = files.reduce((total, file) => total + file.sizeBytes, 0);
  const imageCount = files.filter((file) => file.fileType === "image").length;
  const shareUrl = `${appUrl}/l/${slug}`;

  const ensureListing = useCallback(async () => {
    if (listingId) return listingId;
    const result = await createDraftListing();
    if ("error" in result) throw new Error(result.error);
    setListingId(result.id);
    return result.id;
  }, [listingId]);

  /** Returns the reason the blurred preview could not be built, if any. */
  async function uploadOne(file: File, targetListingId: string): Promise<string | undefined> {
    if (process.env.NEXT_PUBLIC_UPLOAD_MODE === "blob") {
      const fileId = nanoid(16);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
      await upload(`${await getUploadPrefix()}/files/${fileId}-${safeName}`, file, {
        access: "private",
        handleUploadUrl: "/api/blob/upload",
        multipart: file.size > 20 * 1024 * 1024,
        clientPayload: JSON.stringify({
          listingId: targetListingId,
          fileId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });
      return undefined;
    }

    const body = new FormData();
    body.set("listingId", targetListingId);
    body.set("file", file);
    const response = await fetch("/api/upload", { method: "POST", body });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      previewError?: string;
    };
    if (!response.ok) throw new Error(payload.error ?? `Could not upload ${file.name}`);
    return payload.previewError;
  }

  // Uploads run one at a time so preview generation stays stable.
  async function onFilesChosen(selected: FileList | null) {
    if (!selected?.length) return;
    setError(null);
    let targetListingId: string;
    try {
      targetListingId = await ensureListing();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start listing.");
      return;
    }

    for (const file of Array.from(selected)) {
      setUploading((current) => [...current, file.name]);
      try {
        const previewError = await uploadOne(file, targetListingId);
        if (previewError) {
          setError(`Blurred preview not generated for ${file.name} — ${previewError}`);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : `Could not upload ${file.name}`);
      } finally {
        setUploading((current) => current.filter((name) => name !== file.name));
      }
      setFiles(await listListingFiles(targetListingId));
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  async function removeFile(fileId: string) {
    const result = await deleteListingFile(fileId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (listingId) setFiles(await listListingFiles(listingId));
  }

  async function saveAndAdvance(next: number) {
    if (!listingId) {
      setError("Add at least one file first.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await saveListingDetails(listingId, {
      title,
      description,
      price,
      linkType,
      visibility,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStep(next);
  }

  async function create() {
    if (!listingId) return;
    setBusy(true);
    setError(null);
    const saved = await saveListingDetails(listingId, {
      title,
      description,
      price,
      linkType,
      visibility,
    });
    if (!saved.ok) {
      setBusy(false);
      setError(saved.error);
      return;
    }
    const result = await publishListing(listingId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSlug(result.slug);
    setCreated(true);
    router.refresh();
  }

  if (created) {
    return (
      <Card className="p-6 text-center">
        <CardTitle>Listing is live</CardTitle>
        <p className="mt-1 text-sm text-slate-600">Share this link with your buyer.</p>
        <p className="mt-4 break-all rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{shareUrl}</p>
        <div className="mt-4 flex justify-center gap-2">
          <CopyLinkButton url={shareUrl} />
          <Button variant="secondary" onClick={() => router.push("/dashboard/listings")}>
            Back to listings
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <ol className="mb-6 flex items-center gap-2 text-xs font-medium">
        {steps.map((label, index) => (
          <li
            key={label}
            className={cn(
              "flex-1 rounded-full px-3 py-1 text-center",
              index === step
                ? "bg-slate-900 text-white"
                : index < step
                  ? "bg-slate-200 text-slate-700"
                  : "bg-slate-100 text-slate-400",
            )}
          >
            {label}
          </li>
        ))}
      </ol>

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {step === 0 ? (
        <Card>
          <CardTitle>Upload files</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Images, PDFs, Word documents and ZIP archives{limits.video ? ", plus video" : ""}. Up to{" "}
            {limits.imageCapPerListing} images and {formatBytes(limits.storagePerListingBytes)} per
            listing.
          </p>

          <label
            className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-slate-400"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void onFilesChosen(event.dataTransfer.files);
            }}
          >
            <UploadCloud className="size-6 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">
              Drag and drop, or choose files
            </span>
            <span className="text-xs text-slate-500">
              {formatBytes(totalBytes)} of {formatBytes(limits.storagePerListingBytes)} used ·{" "}
              {imageCount}/{limits.imageCapPerListing} images
            </span>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS.join(",")}
              className="hidden"
              onChange={(event) => void onFilesChosen(event.target.files)}
            />
          </label>

          {uploading.length > 0 ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="size-4 animate-spin" />
              Uploading {uploading[0]}
              {uploading.length > 1 ? ` and ${uploading.length - 1} more` : ""}…
            </p>
          ) : null}

          {files.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {files.map((file) => (
                <div key={file.id} className="group relative">
                  <FileTile
                    fileName={file.fileName}
                    fileType={file.fileType}
                    sizeBytes={file.sizeBytes}
                    previewPathname={file.previewPathname}
                  />
                  <button
                    type="button"
                    onClick={() => void removeFile(file.id)}
                    className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-600 shadow hover:text-red-600"
                    aria-label={`Remove ${file.fileName}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end">
            <Button onClick={() => setStep(1)} disabled={files.length === 0}>
              Continue
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardTitle>Listing details</CardTitle>
          <div className="mt-4">
            <Field label="Title" htmlFor="title">
              <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <Field label="Description" htmlFor="description" hint="Optional.">
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
            <Field label="Price (USD)" htmlFor="price">
              <Input
                id="price"
                type="number"
                min="0.5"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </Field>
          </div>
          <div className="mt-2 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button onClick={() => void saveAndAdvance(2)} disabled={busy}>
              Continue
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardTitle>Link and visibility</CardTitle>
          <div className="mt-4 space-y-4">
            <div>
              <Label>Link type</Label>
              <Choice
                selected={linkType}
                onSelect={(value) => setLinkType(value as WizardListing["linkType"])}
                options={[
                  {
                    value: "permanent",
                    label: "Permanent",
                    description: "Sells to as many buyers as you like until you delete it.",
                  },
                  {
                    value: "single_use",
                    label: "Single-use",
                    description: "Sells once, then turns private and is marked sold.",
                  },
                ]}
              />
            </div>
            <div>
              <Label>Visibility</Label>
              <Choice
                selected={visibility}
                onSelect={(value) => setVisibility(value as WizardListing["visibility"])}
                options={[
                  {
                    value: "public",
                    label: "Public",
                    description: "Shows on your public profile and works by direct link.",
                  },
                  {
                    value: "private",
                    label: "Private",
                    description: "Reachable by direct link only.",
                  },
                ]}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => void saveAndAdvance(3)} disabled={busy}>
              Continue
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardTitle>Review</CardTitle>
          <dl className="mt-4 divide-y divide-slate-100 text-sm">
            <Row label="Title" value={title} />
            <Row label="Description" value={description || "—"} />
            <Row label="Price" value={`$${Number(price || 0).toFixed(2)}`} />
            <Row label="Files" value={`${files.length} · ${formatBytes(totalBytes)}`} />
            <Row label="Link type" value={linkType === "permanent" ? "Permanent" : "Single-use"} />
            <Row label="Visibility" value={visibility === "public" ? "Public" : "Private"} />
          </dl>
          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={() => void create()} disabled={busy}>
              {busy ? "Creating…" : initialListing && !initialListing.draft ? "Save listing" : "Create listing"}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function Choice({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string; description: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSelect(option.value)}
          className={cn(
            "rounded-xl border p-3 text-left",
            selected === option.value
              ? "border-slate-900 bg-slate-50"
              : "border-slate-200 hover:border-slate-300",
          )}
        >
          <span className="block text-sm font-medium text-slate-900">{option.label}</span>
          <span className="mt-0.5 block text-xs text-slate-500">{option.description}</span>
        </button>
      ))}
    </div>
  );
}
