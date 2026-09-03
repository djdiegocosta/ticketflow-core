import React from "react";
import { useActiveBanner } from "@/lib/customer-queries";
import { Skeleton } from "@/components/ui/skeleton";

export function ClientVitrine() {
  const { data: banner, isLoading } = useActiveBanner();

  if (isLoading) {
    return <Skeleton className="aspect-[4/5] w-full rounded-[var(--radius-lg)]" />;
  }

  // Só renderizar se banner.image_url existir E banner.link_url existir
  if (!banner || !banner.image_url || !banner.link_url) return null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      {/* Cartaz: a imagem ocupa a largura toda, sem moldura, com cantos suaves.
          O botão flutua sobre a própria arte — não existe mais barra sólida colada embaixo. */}
      <div className="relative w-full shrink-0 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)]">
        <img
          src={banner.image_url}
          alt={banner.title || "Banner"}
          className="block w-full h-auto"
        />

        <div className="absolute inset-x-0 bottom-4 flex justify-center px-4 sm:bottom-6">
          <a
            href={banner.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-10 py-3 text-lg font-bold text-[#111111] shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Acessar
          </a>
        </div>
      </div>

      {banner.text_content ? (
        <div className="shrink-0 px-1">
          <p className="text-body text-[var(--text-secondary)]">{banner.text_content}</p>
        </div>
      ) : null}
    </div>
  );
}
