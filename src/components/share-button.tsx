"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ShareButton({
  url,
  compact = false,
  label = "Compartir",
}: {
  url?: string;
  compact?: boolean;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    const target =
      url && /^https?:\/\//i.test(url)
        ? url
        : `${window.location.origin}${url ?? window.location.pathname + window.location.search}`;
    try {
      if (url && navigator.share) {
        await navigator.share({ url: target, title: "Evangelio de Hoy" });
        return;
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(target);
    } catch {
      const field = document.createElement("textarea");
      field.value = target;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void copyUrl()}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-sans text-sm font-medium text-fg shadow-border transition-[transform,opacity] duration-150 ease-out active:scale-[0.96]",
        compact
          ? "size-11 bg-surface text-muted"
          : "min-h-11 gap-2 bg-surface px-4",
      )}
      aria-label={copied ? "Enlace copiado" : "Compartir: copiar enlace"}
      title={copied ? "Enlace copiado" : "Copiar enlace"}
    >
      {copied ? (
        <Check className="size-4" strokeWidth={1.75} />
      ) : (
        <Share2 className="size-4" strokeWidth={1.75} />
      )}
      {compact ? null : copied ? "Copiado" : label}
    </button>
  );
}
