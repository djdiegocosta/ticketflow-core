import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ChevronDown, 
  Search,
  Maximize,
  CheckCircle,
  ScanLine,
  Keyboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CheckinStatus = "valid" | "already_used" | "invalid";

interface CheckinResult {
  status: CheckinStatus;
  participantName: string;
  eventName: string;
  time: string;
  previousTime?: string;
  reason?: string;
}

interface CheckinHistory {
  name: string;
  time: string;
  id: string;
}

const MOCK_EVENTS = [
  { id: "1", name: "Festival de Inverno 2026" },
  { id: "2", name: "Workshop Tech Leads" },
  { id: "3", name: "Show Case Bandas Locais" },
];

const INITIAL_HISTORY: CheckinHistory[] = [
  { id: "h1", name: "Alice Oliveira", time: "19:45" },
  { id: "h2", name: "Bruno Fernandes", time: "19:42" },
  { id: "h3", name: "Carla Mendes", time: "19:40" },
  { id: "h4", name: "Daniel Rocha", time: "19:35" },
  { id: "h5", name: "Elena Souza", time: "19:30" },
];

export function CheckinPage() {
  const { userRole, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState(MOCK_EVENTS[0]);
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [lastResult, setLastResult] = useState<CheckinResult | null>(null);
  const [history, setHistory] = useState<CheckinHistory[]>(INITIAL_HISTORY);
  const [overlay, setOverlay] = useState<{ type: CheckinStatus; visible: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (isAuthenticated) {
      if (userRole === 'operador_checkin') {
        // Correct place
      } else if (userRole === 'admin' || userRole === 'colaborador') {
        // Also allowed
      } else {
        navigate({ to: '/admin', replace: true });
      }
    } else {
      navigate({ to: '/login', replace: true });
    }
  }, [isAuthenticated, userRole, navigate]);

  // Wake Lock API
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      if (typeof window !== 'undefined' && 'wakeLock' in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.warn("Wake Lock failed", err);
        }
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock) wakeLock.release();
    };
  }, []);

  // Back button confirmation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const handlePopState = (e: PopStateEvent) => {
      if (!window.confirm("Tem certeza que deseja sair do Check-in?")) {
        window.history.pushState(null, "", window.location.href);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    window.history.pushState(null, "", window.location.href);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      // Clean up the history state if we didn't confirm leaving yet? 
      // Actually popstate handles it.
    };
  }, []);

  const triggerOverlay = useCallback((type: CheckinStatus) => {
    setIsProcessing(true);
    setOverlay({ type, visible: true });
    
    const duration = type === 'valid' ? 1000 : 2500;
    
    setTimeout(() => {
      setOverlay(prev => prev && prev.type === type ? { ...prev, visible: false } : prev);
      setIsProcessing(false);
    }, duration);
  }, []);

  const handleScanSuccess = useCallback((decodedText: string) => {
    if (isProcessing) return;
    processCheckin(decodedText);
  }, [isProcessing]);

  const processCheckin = (code: string) => {
    if (!selectedEvent || isProcessing) return;
    const rand = Math.random();
    let result: CheckinResult;

    if (rand < 0.6) {
      result = {
        status: "valid",
        participantName: "Usuário Sorteado",
        eventName: selectedEvent.name,
        time: new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }),
      };
      setHistory(prev => [{ id: Math.random().toString(), name: result.participantName, time: result.time }, ...prev]);
    } else if (rand < 0.8) {
      result = {
        status: "already_used",
        participantName: "Pedro Henrique",
        eventName: selectedEvent.name,
        time: "19:00",
        previousTime: "18:30"
      };
    } else {
      result = {
        status: "invalid",
        participantName: "Código: " + code,
        eventName: selectedEvent.name,
        time: "",
        reason: "Ingresso para outro evento ou cancelado."
      };
    }

    setLastResult(result);
    triggerOverlay(result.status);
    setManualCode("");
  };

  const initScanner = useCallback(() => {
    if (isManualInput || scannerRef.current) return;
    
    console.log("[Checkin] Starting camera initialization...");
    setIsInitializing(true);
    setCameraError(null);

    // 8 second safety timeout
    const globalTimeout = setTimeout(() => {
      // Re-check initializing state inside timeout
      setIsInitializing(current => {
        if (current) {
          console.error("[Checkin] Camera initialization timed out (8s)");
          setCameraError("Tempo esgotado ao iniciar a câmera. Verifique as permissões ou digite o código.");
          setIsManualInput(true);
          toast.error("Tempo de inicialização esgotado");
          return false;
        }
        return current;
      });
    }, 8000);

    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        videoConstraints: {
          facingMode: "environment"
        }
      },
      false
    );
    
    scannerRef.current = scanner;

    console.log("[Checkin] Rendering scanner...");
    scanner.render(
      (decodedText) => {
        if (!isProcessing) {
          handleScanSuccess(decodedText);
        }
      }, 

      (error) => {
        // Normal scanning noise, ignored
      }
    );

    // Watch for the video element to ensure Safari compatibility
    const checkInterval = setInterval(() => {
      const videoElement = document.querySelector("#reader video") as HTMLVideoElement;
      if (videoElement) {
        console.log("[Checkin] Video element detected, applying iOS attributes");
        videoElement.setAttribute("playsinline", "true");
        videoElement.muted = true;
        videoElement.setAttribute("autoplay", "true");
        // Explicitly set styles to ensure visibility
        videoElement.style.display = "block";
        videoElement.style.width = "100%";
        videoElement.style.height = "100%";
        videoElement.style.objectFit = "cover";
        
        // Ensure it actually plays
        videoElement.play().catch(e => console.warn("[Checkin] Auto-play failed:", e));
        
        setIsInitializing(false);
        clearTimeout(globalTimeout);
        clearInterval(checkInterval);
      }
    }, 100);

    // Global error listener for permission issues
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.name || event.reason?.message;
      console.error("[Checkin] Async error:", reason);
      if (reason === 'NotAllowedError' || reason === 'PermissionDeniedError') {
        setCameraError("Permissão de câmera negada. Habilite o acesso nas configurações do Safari.");
      } else {
        setCameraError("Erro ao acessar câmera: " + reason);
      }
      setIsInitializing(false);
      if (scannerRef.current) {
        scannerRef.current.clear().then(() => {
          scannerRef.current = null;
          setIsManualInput(true);
        });
      } else {
        setIsManualInput(true);
      }
      clearTimeout(globalTimeout);
      toast.error("Erro no acesso à câmera");
    };

    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      console.log("[Checkin] Scanner hook cleanup");
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("[Checkin] Error clearing scanner in hook", e));
      }
      clearInterval(checkInterval);
      clearTimeout(globalTimeout);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [isManualInput, handleScanSuccess, isInitializing]);

  useEffect(() => {
    const cleanup = initScanner();
    return () => {
      if (cleanup) cleanup();
    };
  }, [initScanner]);

  const requestFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    } else {
      toast.info("Para tela cheia no iPhone, instale o TicketFlow na tela inicial.");
    }
  };

  return (
    <MobileLayout
      showFooter={false}
      headerContent={
        <div className="flex w-full items-center justify-end gap-2">
          <div className="relative">
            <select 
              className="appearance-none bg-transparent pr-8 text-small font-semibold outline-none text-text-primary"
              value={selectedEvent?.id}
              onChange={(e) => setSelectedEvent(MOCK_EVENTS.find(ev => ev.id === e.target.value) || MOCK_EVENTS[0])}
            >
              {MOCK_EVENTS.map(ev => (
                <option key={ev.id} value={ev.id} className="bg-bg-primary">{ev.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-text-secondary" />
          </div>
          <Button variant="ghost" size="icon" onClick={requestFullscreen}>
            <Maximize className="h-5 w-5" />
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 pb-20 pt-4">
        {/* Scanner Area */}
        <div className="relative overflow-hidden border border-border-subtle bg-black aspect-square">
          {!isManualInput ? (
            <>
              <div id="reader" className="w-full h-full" />
              
              {isInitializing && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-secondary text-center p-4">
                  <div className="mb-4 h-8 w-8 animate-spin border-4 border-accent border-t-transparent rounded-full" />
                  <p className="text-body text-text-secondary">Iniciando câmera...</p>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-secondary p-8 text-center">
                  <AlertTriangle className="mb-4 h-12 w-12 text-error" />
                  <h3 className="mb-2 text-heading-3">Erro na Câmera</h3>
                  <p className="mb-6 text-small text-text-secondary">{cameraError}</p>
                  <Button 
                    className="w-full bg-accent text-accent-text"
                    onClick={() => {
                      if (scannerRef.current) {
                        scannerRef.current.clear().then(() => {
                          scannerRef.current = null;
                          setIsManualInput(true);
                        });
                      } else {
                        setIsManualInput(true);
                      }
                    }}
                  >
                    Digitar Manualmente
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center bg-bg-secondary p-8 text-center animate-in fade-in duration-300">
              <Keyboard className="mb-4 h-12 w-12 text-text-disabled" />
              <h3 className="mb-2 text-heading-3">Digitar código</h3>
              <div className="flex w-full flex-col gap-3">
                <input 
                  type="text"
                  placeholder="Ex: TKT-123456"
                  className="w-full border border-border-subtle bg-bg-primary px-4 py-3 text-center text-heading-2 outline-none focus:border-accent"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  autoFocus
                />
                <Button 
                  className="w-full bg-accent text-accent-text"
                  onClick={() => processCheckin(manualCode)}
                  disabled={!manualCode.trim()}
                >
                  Confirmar
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setCameraError(null);
                    if (scannerRef.current) {
                      scannerRef.current.clear().then(() => {
                        scannerRef.current = null;
                        setIsManualInput(false);
                      });
                    } else {
                      setIsManualInput(false);
                    }
                  }}
                  className="text-text-secondary"
                >
                  Tentar câmera novamente
                </Button>
              </div>
            </div>
          )}
        </div>

        {!isManualInput && (
          <button 
            onClick={() => {
              if (scannerRef.current) {
                scannerRef.current.clear().then(() => {
                  scannerRef.current = null;
                  setIsManualInput(true);
                });
              } else {
                setIsManualInput(true);
              }
            }}
            className="flex items-center justify-center gap-2 text-small text-text-secondary hover:text-text-primary transition-colors"
          >
            <Keyboard className="h-4 w-4" />
            Digitar código manualmente
          </button>
        )}

        {/* Results Card */}
        {lastResult && (
          <div className={cn(
            "border p-6",
            lastResult.status === 'valid' ? "bg-accent-muted border-accent/20" :
            lastResult.status === 'already_used' ? "bg-warning/10 border-warning/20" :
            "bg-error/10 border-error/20"
          )}>
            <div className="flex items-center gap-3 mb-2">
              {lastResult.status === 'valid' ? <CheckCircle2 className="h-6 w-6 text-accent" /> :
               lastResult.status === 'already_used' ? <AlertTriangle className="h-6 w-6 text-warning" /> :
               <XCircle className="h-6 w-6 text-error" />}
              <h2 className="text-heading-2 leading-none">
                {lastResult.status === 'valid' ? "Válido" :
                 lastResult.status === 'already_used' ? "Já utilizado" :
                 "Inválido"}
              </h2>
            </div>
            
            <div className="space-y-1">
              <p className="text-heading-3">{lastResult.participantName}</p>
              <p className="text-small text-text-secondary">{lastResult.eventName}</p>
              {lastResult.status === 'valid' && (
                <p className="text-small font-medium text-accent">Entrada às {lastResult.time}</p>
              )}
              {lastResult.status === 'already_used' && (
                <p className="text-small font-medium text-warning">Utilizado anteriormente às {lastResult.previousTime}</p>
              )}
              {lastResult.status === 'invalid' && (
                <p className="text-small font-medium text-error">{lastResult.reason}</p>
              )}
            </div>
          </div>
        )}

        {/* Debug / Simulator */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => processCheckin("SIM-VALID")}>Valid</Button>
          <Button variant="outline" size="sm" onClick={() => processCheckin("SIM-USED")}>Used</Button>
          <Button variant="outline" size="sm" onClick={() => processCheckin("SIM-INVALID")}>Invalid</Button>
        </div>

        {/* History */}
        <div className="space-y-3">
          <h4 className="text-small font-bold uppercase tracking-wider text-text-disabled">Últimos Check-ins</h4>
          <div className="flex flex-col border border-border-subtle bg-bg-secondary overflow-hidden">
            {history.map((item, idx) => (
              <div 
                key={item.id} 
                className={cn(
                  "flex items-center justify-between px-4 py-3",
                  idx !== history.length - 1 && "border-b border-border-subtle"
                )}
              >
                <span className="text-body font-medium">{item.name}</span>
                <span className="text-small text-text-secondary">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay Feedback */}
      {overlay && (
        <div 
          className={cn(
            "fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-300 pointer-events-auto",
            overlay.visible ? "opacity-100" : "opacity-0 pointer-events-none",
            overlay.type === 'valid' ? "bg-accent" :
            overlay.type === 'already_used' ? "bg-warning" :
            "bg-error"
          )}
          onClick={() => {
            setOverlay(prev => prev ? { ...prev, visible: false } : null);
            setIsProcessing(false);
          }}
        >
          <div className="animate-in zoom-in duration-300">
            {overlay.type === 'valid' ? <CheckCircle2 className="h-48 w-48 text-white" /> :
             overlay.type === 'already_used' ? <AlertTriangle className="h-48 w-48 text-white" /> :
             <XCircle className="h-48 w-48 text-white" />}
          </div>
          <p className="mt-8 text-7xl font-bold text-white uppercase tracking-tighter">
            {overlay.type === 'valid' ? "Sucesso" :
             overlay.type === 'already_used' ? "Atenção" :
             "Recusado"}
          </p>
        </div>
      )}
    </MobileLayout>
  );
}