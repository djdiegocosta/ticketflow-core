import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonScreenProps {
  variant?: "admin" | "cliente";
}

interface WelcomeSplashProps {
  userName?: string | null;
  onComplete: () => void;
}

export function WelcomeSplash({ userName, onComplete }: WelcomeSplashProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-primary)] animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <div className="text-heading-1 font-bold text-[var(--text-primary)]">
          {userName ? `Olá, ${userName}!` : "Olá!"}
        </div>
        <div className="text-body text-[var(--text-secondary)]">
          Carregando sua conta...
        </div>
      </div>
    </div>
  );
}

export function SkeletonScreen({ variant = "cliente" }: SkeletonScreenProps) {
  if (variant === "admin") {
    return (
      <div className="space-y-6 p-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-[var(--radius-md)]" />
          ))}
        </div>
        {/* Chart */}
        <Skeleton className="h-80 rounded-[var(--radius-md)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Saudação */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <Skeleton className="h-8 w-40" />
      </div>
      {/* Banner 4:5 */}
      <div className="flex-1 min-h-0 px-4 pb-4">
        <Skeleton className="w-full h-full rounded-[var(--radius-md)]" style={{ aspectRatio: "4 / 5" }} />
      </div>
    </div>
  );
}
