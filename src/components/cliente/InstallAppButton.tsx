import { useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

/**
 * Convite discreto pra instalar o TicketFlow como app.
 * - Já instalado -> não renderiza nada.
 * - Dispensado pelo cliente -> não renderiza nada (guardado no navegador dele).
 * - Android/Chrome -> botão aciona a instalação nativa do navegador.
 * - iOS/Safari -> botão abre instruções (Compartilhar > Adicionar à Tela de Início).
 */
export function InstallAppButton() {
  const { shouldShow, canInstallDirectly, canShowIOSInstructions, promptInstall, dismiss } =
    usePwaInstall();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  if (!shouldShow) return null;

  const handleInstallClick = () => {
    if (canInstallDirectly) {
      promptInstall();
    } else if (canShowIOSInstructions) {
      setShowIOSInstructions(true);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--accent)] bg-[var(--accent-muted)] p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-[var(--accent)] text-[#111111]">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-small font-semibold text-[var(--text-primary)]">Instalar aplicativo</p>
          <p className="text-micro text-[var(--text-secondary)]">
            Acesse seus ingressos mais rápido, direto da tela inicial.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleInstallClick}
          className="shrink-0 bg-[var(--accent)] text-[#111111] hover:bg-[var(--accent-hover)]"
        >
          Instalar
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dispensar"
          className="shrink-0 text-[var(--text-disabled)] transition-colors hover:text-[var(--text-secondary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <Drawer open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Instalar aplicativo</DrawerTitle>
            <DrawerDescription>
              No iPhone, a instalação é feita direto pelo Safari, em 2 passos.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-4 px-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
                <Share className="h-4 w-4" />
              </div>
              <p className="text-small text-[var(--text-primary)]">
                Toque no ícone <strong>Compartilhar</strong>, na barra do Safari.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
                <SquarePlus className="h-4 w-4" />
              </div>
              <p className="text-small text-[var(--text-primary)]">
                Escolha <strong>"Adicionar à Tela de Início"</strong> e confirme.
              </p>
            </div>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Entendi
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
