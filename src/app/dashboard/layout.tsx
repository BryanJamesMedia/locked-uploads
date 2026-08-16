import { DesktopNav, MobileNav } from "@/components/dashboard/nav";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { StripeBanner } from "@/components/dashboard/stripe-banner";
import { requireSeller } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const seller = await requireSeller();

  return (
    <div className="flex min-h-dvh bg-slate-50">
      <DesktopNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <p className="text-sm font-semibold tracking-tight md:hidden">Locked Uploads</p>
          <p className="hidden text-sm text-slate-500 md:block">@{seller.handle}</p>
          <SignOutButton />
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
