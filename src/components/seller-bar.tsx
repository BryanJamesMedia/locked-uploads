import Link from "next/link";
import { previewUrl } from "@/components/file-tile";

/** Light grey bar shown above every public page belonging to a seller. */
export function SellerBar({
  name,
  handle,
  profileImagePathname,
  linkToProfile,
}: {
  name: string;
  handle: string;
  profileImagePathname: string | null;
  linkToProfile: boolean;
}) {
  const identity = (
    <>
      <span className="size-9 shrink-0 overflow-hidden rounded-full bg-slate-300">
        {profileImagePathname ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl(profileImagePathname)}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-sm font-semibold text-slate-600">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-900">{name}</span>
        <span className="block truncate text-xs text-slate-500">@{handle}</span>
      </span>
    </>
  );

  return (
    <header className="border-b border-slate-200 bg-slate-100">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
        {linkToProfile ? (
          <Link href={`/${handle}`} className="flex min-w-0 items-center gap-3">
            {identity}
          </Link>
        ) : (
          <span className="flex min-w-0 items-center gap-3">{identity}</span>
        )}
      </div>
    </header>
  );
}
