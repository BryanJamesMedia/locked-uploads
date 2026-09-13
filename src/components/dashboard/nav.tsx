"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CreditCard,
  ExternalLink,
  Home,
  LayoutGrid,
  Lock,
  Receipt,
  Settings,
  UserRound,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/listings", label: "Listings", icon: LayoutGrid },
  { href: "/dashboard/sales", label: "Sales", icon: Receipt },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  { href: "/dashboard/subscription", label: "Plan", icon: CreditCard },
  { href: "/dashboard/notifications", label: "Alerts", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const mobileItems = items.filter((item) =>
  ["/dashboard", "/dashboard/listings", "/dashboard/sales", "/dashboard/wallet", "/dashboard/settings"].includes(
    item.href,
  ),
);

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function DesktopNav({ publicPageHref }: { publicPageHref: string }) {
  const pathname = usePathname();
  return (
    <nav className="hidden w-60 shrink-0 flex-col gap-1 border-r border-subtle bg-slate-50 p-4 md:flex">
      <Link href="/dashboard" className="mb-4 flex items-center gap-2 px-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-brand text-white">
          <Lock className="size-4" />
        </span>
        <span className="text-base font-semibold tracking-tight text-slate-900">
          Locked<span className="text-brand">Uploads</span>
        </span>
      </Link>
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Icon className={cn("size-4", active ? "text-brand" : "text-slate-400")} />
            {label}
          </Link>
        );
      })}
      <div className="mt-auto rounded-xl bg-brand-soft p-4">
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-white">
          <Lock className="size-4" />
        </span>
        <p className="mt-3 text-sm font-semibold text-slate-900">Create. Share. Sell.</p>
        <p className="mt-1 text-xs text-slate-500">
          Turn your content into income, on your terms.
        </p>
        <Link
          href={publicPageHref}
          target="_blank"
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-dark"
        >
          View your page
          <ExternalLink className="size-3.5" />
        </Link>
      </div>
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-subtle bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      {mobileItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex flex-col items-center gap-1 py-2 text-[11px] font-medium",
            isActive(pathname, href) ? "text-brand" : "text-slate-400",
          )}
        >
          <Icon className="size-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
