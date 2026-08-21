import React from "react";
import { useActiveBanner } from "@/lib/customer-queries";
import { Skeleton } from "@/components/ui/skeleton";

export function ClientVitrine() {
  const { data: banner, isLoading } = useActiveBanner();

  if (isLoading) {
    return <Skeleton className="w-full aspect-[4/5] rounded-[var(--radius-md)]" />;
  }

  // Só renderizar se banner.image_url existir E banner.link_url existir
  if (!banner || !banner.image_url || !banner.link_url) return null;

  return (
    <div className="border border-[var(--border-subtle)] rounded-[var(--radius-md)] bg-[var(--bg-secondary)] overflow-hidden">
      {/* Container da imagem */}
      <div className="w-full aspect-[4/5] bg-[var(--bg-tertiary)] flex items-center justify-center">
        <img 
          src={banner.image_url} 
          alt={banner.title || "Banner"} 
          className="w-full h-full object-contain"
        />
      </div>
      
      {/* Padding com conteúdo */}
      <div className="p-4 flex flex-col gap-3">
        {banner.title && (
          <h2 className="text-heading-2 font-bold text-[var(--text-primary)]">
            {banner.title}
          </h2>
        )}
        
        {banner.text_content && (
          <p className="text-body text-[var(--text-secondary)] line-clamp-3">
            {banner.text_content}
          </p>
        )}
        
        {/* Botão Acessar - Estilo do Checkout */}
        <a 
          href={banner.link_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center h-14 w-full bg-[var(--accent)] text-[#111111] font-bold text-lg hover:bg-[var(--accent-hover)] rounded-[var(--radius-sm)] transition-colors"
        >
          Acessar
        </a>
      </div>
    </div>
  );
}