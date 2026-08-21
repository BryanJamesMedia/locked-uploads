"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await signOut();
        router.push("/login");
        router.refresh();
      }}
      className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
    >
      <LogOut className="size-4" />
      Sign out
    </button>
  );
}
