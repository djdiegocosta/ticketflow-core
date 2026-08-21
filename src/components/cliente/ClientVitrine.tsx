import React from "react";
import { useActiveBanner } from "@/lib/customer-queries";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";

export function ClientVitrine() {
  const { data: banner, isLoading } = useActiveBanner();

  if (isLoading) {
    return <Skeleton className="w-full aspect-[9/16] max-h-[400px] rounded-none" />;
  }

  if (!banner) return null;

  const content = (
    <div className="relative w-full aspect-[9/16] max-h-[400px] bg-muted overflow-hidden border-b">
      {banner.image_url ? (
        <img 
          src={banner.image_url} 
          alt={banner.title || "Banner"} 
          className="w-full h-full object-cover"
        />
      ) : (

        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-accent/5">
          <h2 className="text-2xl font-bold mb-2">{banner.title}</h2>
          {banner.text_content && (
            <p className="text-muted-foreground">{banner.text_content}</p>
          )}
        </div>
      )}
      
      {/* Overlay para texto se houver imagem e texto */}
      {banner.image_url && (banner.title || banner.text_content) && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
          <h2 className="text-xl font-bold">{banner.title}</h2>
          {banner.text_content && (
            <p className="text-sm opacity-90 line-clamp-2 mt-1">{banner.text_content}</p>
          )}
        </div>
      )}

      {banner.link_url && (
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-2 rounded-full text-white">
          <ExternalLink size={16} />
        </div>
      )}
    </div>
  );

  if (banner.link_url) {
    return (
      <a 
        href={banner.link_url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block transition-opacity hover:opacity-95"
      >
        {content}
      </a>
    );
  }

  return content;
}
