import React from "react";
import { useActiveBanner } from "@/lib/customer-queries";
import { Skeleton } from "@/components/ui/skeleton";

export function ClientVitrine() {
  const { data: banner, isLoading } = useActiveBanner();

  if (isLoading) {
    return <Skeleton className="h-full w-full rounded-[var(--radius-md)]" />;
  }

  // Só renderizar se banner.image_url existir E banner.link_url existir
  if (!banner || !banner.image_url || !banner.link_url) return null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border border-[var(--border-subtle)] rounded-[var(--radius-md)] bg-[var(--bg-secondary)]">
      <div className="flex-1 min-h-0 flex items-center justify-center bg-[var(--bg-tertiary)]">
        <img
          src={banner.image_url}
          alt={banner.title || "Banner"}
          className="max-h-full max-w-full aspect-[4/5] object-contain"
        />
      </div>

      <a
        href={banner.link_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-14 shrink-0 w-full items-center justify-center bg-[var(--accent)] text-[#111111] font-bold text-lg hover:bg-[var(--accent-hover)] rounded-[var(--radius-sm)] transition-colors"
      >
        Acessar
      </a>

      {banner.text_content ? (
        <div className="min-h-0 max-h-32 shrink-0 overflow-y-auto p-4">
          <p className="text-body text-[var(--text-secondary)]">{banner.text_content}</p>
        </div>
      ) : null}
    </div>
  );
}