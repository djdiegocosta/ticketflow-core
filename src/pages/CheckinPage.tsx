import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { AlertTriangle, CheckCircle2, History, Keyboard, Maximize, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CHECKIN_EVENTS,
  CheckinStatus,
  addCheckinAttempt,
  resolveMockCheckin,
} from "@/lib/checkin-data";

interface OverlayState {
  status: CheckinStatus;
  name: string;
  visible: boolean;
}

export function CheckinPage() {
  const { userRole, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState(CHECKIN_EVENTS[0]!);
  const [showManual, setShowManual] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const pausedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventRef = useRef(selectedEvent);
  eventRef.current = selectedEvent;

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (!(userRole === "operador_checkin" || userRole === "admin" || userRole === "colaborador")) {
      navigate({ to: "/admin", replace: true });
    }
  }, [isAuthenticated, userRole, navigate]);

  // Wake Lock
  useEffect(() => {
    let wakeLock: any = null;
    (async () => {
      if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        } catch (err) {
          console.warn("[Checkin] Wake Lock indisponível", err);
        }
      }
    })();
    return () => {
      if (wakeLock) wakeLock.release?.();
    };
  }, []);

  // Interceptação de navegação
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const handlePopState = () => {
      if (!window.confirm("Tem certeza que deseja sair do Check-in?")) {
        window.history.pushState(null, "", window.location.href);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    window.history.pushState(null, "", window.location.href);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const closeOverlay = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOverlay(null);
    pausedRef.current = false;
  }, []);

  const processCheckin = useCallback((code: string) => {
    if (pausedRef.current || !code.trim()) return;
    pausedRef.current = true;

    const result = resolveMockCheckin(code, eventRef.current.name);
    addCheckinAttempt({
      name: result.name,
      eventName: result.eventName,
      time: result.time,
      status: result.status,
    });
    setOverlay({ status: result.status, name: result.name, visible: true });

    const duration = result.status === "valid" ? 1000 : 2500;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setOverlay(null);
      pausedRef.current = false;
    }, duration);
  }, []);

  // Câmera
  useEffect(() => {
    if (showManual) return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let videoWatch: ReturnType<typeof setInterval> | null = null;

    const scanner = new Html5Qrcode("reader", {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false,
    });
    scannerRef.current = scanner;
    setIsInitializing(true);
    setCameraError(null);

    timeout = setTimeout(() => {
      if (cancelled) return;
      setIsInitializing((current) => {
        if (current) {
          setCameraError("Tempo esgotado ao iniciar a câmera. Verifique as permissões ou digite o código.");
          toast.error("Tempo de inicialização esgotado");
          return false;
        }
        return current;
      });
    }, 8000);

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => processCheckin(decodedText),
        () => {},
      )
      .then(() => {
        if (cancelled) return;
        setIsInitializing(false);
        if (timeout) clearTimeout(timeout);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[Checkin] Falha ao iniciar câmera", err);
        const name = err?.name || String(err);
        setCameraError(
          name === "NotAllowedError" || name === "PermissionDeniedError"
            ? "Permissão de câmera negada. Habilite o acesso nas configurações do navegador."
            : "Não foi possível acessar a câmera. Digite o código manualmente.",
        );
        setIsInitializing(false);
        if (timeout) clearTimeout(timeout);
      });

    videoWatch = setInterval(() => {
      const video = document.querySelector("#reader video") as HTMLVideoElement | null;
      if (video) {
        video.setAttribute("playsinline", "true");
        video.setAttribute("autoplay", "true");
        video.muted = true;
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "cover";
        video.play().catch(() => {});
        if (videoWatch) clearInterval(videoWatch);
      }
    }, 100);

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      if (videoWatch) clearInterval(videoWatch);
      const active = scannerRef.current;
      scannerRef.current = null;
      if (active) {
        // Garantir que tentamos parar apenas se o scanner estiver rodando ou pausado.
        // O Html5Qrcode.stop() lança erro se o estado for NOT_STARTED (1).
        try {
          // A API do html5-qrcode às vezes é inconsistente entre versões; 
          // a forma mais segura de evitar o crash no unmount é capturar o erro silenciosamente
          // ou verificar se o elemento de vídeo ainda existe.
          if (document.getElementById("reader")?.hasChildNodes()) {
            active.stop().catch(() => {});
          }
        } catch (e) {
          // Ignora erros de "scanner not running" no cleanup
        }
      }
    };
  }, [showManual, processCheckin]);

  const requestFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen();
    else if ((elem as any).webkitRequestFullscreen) (elem as any).webkitRequestFullscreen();
    else toast.info("Para tela cheia no iPhone, instale o TicketFlow na tela inicial.");
  };

  return (
    <div className="fixed inset-0 z-0 flex flex-col bg-black">
      {/* Vídeo em tela cheia */}
      <div id="reader" className="absolute inset-0 h-full w-full [&>video]:h-full [&>video]:w-full [&>video]:object-cover" />

      {/* Header sobreposto */}
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between gap-2 bg-black/50 px-4 backdrop-blur-sm">
        {CHECKIN_EVENTS.length > 1 ? (
          <select
            className="max-w-[70%] appearance-none truncate bg-transparent text-small font-medium text-white outline-none"
            value={selectedEvent.id}
            onChange={(e) =>
              setSelectedEvent(CHECKIN_EVENTS.find((ev) => ev.id === e.target.value) || CHECKIN_EVENTS[0]!)
            }
          >
            {CHECKIN_EVENTS.map((ev) => (
              <option key={ev.id} value={ev.id} className="text-black">
                {ev.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="truncate text-small font-medium text-white/80">{selectedEvent.name}</span>
        )}
        <button
          onClick={requestFullscreen}
          aria-label="Tela cheia"
          className="p-2 text-white/70 transition-colors hover:text-white"
        >
          <Maximize className="h-5 w-5" />
        </button>
      </header>

      {/* Moldura de mira + instrução */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-8">
        {!cameraError && !isInitializing && (
          <>
            <div className="relative aspect-square w-full max-w-[280px]">
              <span className="absolute left-0 top-0 h-10 w-10 border-l-4 border-t-4 border-white" />
              <span className="absolute right-0 top-0 h-10 w-10 border-r-4 border-t-4 border-white" />
              <span className="absolute bottom-0 left-0 h-10 w-10 border-b-4 border-l-4 border-white" />
              <span className="absolute bottom-0 right-0 h-10 w-10 border-b-4 border-r-4 border-white" />
            </div>
            <p className="text-center text-small text-white/80">
              Aponte a câmera para o QR Code do ingresso
            </p>
          </>
        )}

        {isInitializing && !cameraError && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
            <p className="text-small text-white/80">Iniciando câmera...</p>
          </div>
        )}

        {cameraError && (
          <div className="flex flex-col items-center text-center">
            <AlertTriangle className="mb-4 h-12 w-12 text-[var(--warning)]" />
            <h2 className="mb-2 text-heading-3 text-white">Erro na câmera</h2>
            <p className="mb-6 text-small text-white/70">{cameraError}</p>
            <Button
              variant="outline"
              className="border-white/60 bg-transparent text-white hover:bg-white/10"
              onClick={() => setShowManual(true)}
            >
              Digitar Código
            </Button>
          </div>
        )}
      </div>

      {/* Rodapé com botões discretos */}
      <div
        className="relative z-20 grid shrink-0 grid-cols-2 gap-3 px-4 pb-6 pt-4"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={() => setShowManual(true)}
          className="flex items-center justify-center gap-2 border border-white/60 bg-black/30 px-4 py-3 text-small font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10"
        >
          <Keyboard className="h-4 w-4" />
          Digitar Código
        </button>
        <button
          onClick={() => navigate({ to: "/checkin/historico" })}
          className="flex items-center justify-center gap-2 border border-white/60 bg-black/30 px-4 py-3 text-small font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10"
        >
          <History className="h-4 w-4" />
          Histórico
        </button>
      </div>

      {/* Entrada manual sobreposta */}
      {showManual && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/85 px-8 backdrop-blur-sm">
          <h2 className="text-heading-3 text-white">Digitar código</h2>
          <input
            type="text"
            autoFocus
            placeholder="Ex: TKT-123456"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && manualCode.trim()) {
                processCheckin(manualCode);
                setManualCode("");
                setShowManual(false);
              }
            }}
            className="w-full border border-white/40 bg-transparent px-4 py-3 text-center text-heading-2 text-white outline-none focus:border-[var(--accent)]"
          />
          <div className="flex w-full flex-col gap-2">
            <Button
              className="w-full bg-[var(--accent)] text-[var(--accent-text)]"
              disabled={!manualCode.trim()}
              onClick={() => {
                processCheckin(manualCode);
                setManualCode("");
                setShowManual(false);
              }}
            >
              Confirmar
            </Button>
            <Button
              variant="ghost"
              className="w-full text-white/70 hover:text-white"
              onClick={() => {
                setManualCode("");
                setShowManual(false);
                setCameraError(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Sobreposição de resultado em tela cheia */}
      {overlay && (
        <div
          onClick={closeOverlay}
          className={cn(
            "fixed inset-0 z-50 flex flex-col items-center justify-center px-8 text-center",
            overlay.status === "valid"
              ? "bg-[var(--accent)]"
              : overlay.status === "already_used"
                ? "bg-[var(--warning)]"
                : "bg-[var(--error)]",
          )}
        >
          <div className="animate-in zoom-in duration-200">
            {overlay.status === "valid" ? (
              <CheckCircle2 className="h-40 w-40 text-white" />
            ) : overlay.status === "already_used" ? (
              <AlertTriangle className="h-40 w-40 text-white" />
            ) : (
              <XCircle className="h-40 w-40 text-white" />
            )}
          </div>
          <p className="mt-8 text-heading-1 font-bold text-white">
            {overlay.status === "valid"
              ? overlay.name
              : overlay.status === "already_used"
                ? "Ingresso já utilizado"
                : "Ingresso inválido"}
          </p>
        </div>
      )}
    </div>
  );
}
