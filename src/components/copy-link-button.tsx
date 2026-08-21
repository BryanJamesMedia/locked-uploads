"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function CopyLinkButton({
  url,
  label = "Copy link",
  ...props
}: { url: string; label?: string } & Omit<ButtonProps, "onClick" | "children">) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      {...props}
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}
