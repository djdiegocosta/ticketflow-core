import React, { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomeSplashProps {
  userName: string;
  onComplete: () => void;
}

export function WelcomeSplash({ userName, onComplete }: WelcomeSplashProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // 1. Simulate data loading / display for 2.5 seconds
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      
      // 2. Wait for fade-out animation to finish (e.g., 500ms)
      const fadeTimer = setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 500);

      return () => clearTimeout(fadeTimer);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--bg-primary)] transition-opacity duration-500 ease-in-out",
        isFadingOut ? "opacity-0" : "opacity-100"
      )}
    >
      <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-700">
        <div className="flex items-center gap-3">
          <Ticket className="h-12 w-12 text-[var(--accent)]" />
          <h1 className="text-[40px] font-bold tracking-tight text-[var(--text-primary)]">
            TicketFlow
          </h1>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <p className="text-heading-2 text-[var(--text-secondary)]">
            Bem-vindo(a), <span className="text-[var(--text-primary)] font-semibold">{userName}</span>
          </p>
          
          {/* Visual indicator of "loading" */}
          <div className="mt-4 h-1 w-32 overflow-hidden bg-[var(--bg-tertiary)] rounded-full">
            <div className="h-full w-full bg-[var(--accent)] animate-progress-indeterminate origin-left" />
          </div>
        </div>
      </div>
    </div>
  );
}
