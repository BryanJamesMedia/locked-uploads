"use client";

import { useEffect, useState } from "react";

function remaining(target: number): string {
  const ms = target - Date.now();
  if (ms <= 0) return "expired";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

export function Countdown({ expiresAt }: { expiresAt: string }) {
  const target = new Date(expiresAt).getTime();
  const [label, setLabel] = useState(() => remaining(target));

  useEffect(() => {
    const timer = setInterval(() => setLabel(remaining(target)), 1000);
    return () => clearInterval(timer);
  }, [target]);

  return <span suppressHydrationWarning>{label}</span>;
}
