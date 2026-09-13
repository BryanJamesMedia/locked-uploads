import { DesktopNav, MobileNav } from "@/components/dashboard/nav";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { StripeBanner } from "@/components/dashboard/stripe-banner";
import { previewUrl } from "@/components/file-tile";
import { requireSeller } from "@/lib/session";

/** Up to two letters from the seller's name, shown when they have no avatar. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const seller = await requireSeller();

  return (
    <div className="flex min-h-dvh bg-slate-50">
      <DesktopNav publicPageHref={`/${seller.handle}`} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-subtle bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">@{seller.handle}</p>
            <p className="truncate text-xs text-slate-500">Welcome back!</p>
          </div>
          <div className="flex items-center gap-3">
            <SignOutButton />
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-xs font-semibold text-white">
              {seller.profileImagePathname ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl(seller.profileImagePathname)}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                initials(seller.name)
              )}
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-24 md:pb-8">
          {seller.stripeConnected ? null : <StripeBanner />}
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
