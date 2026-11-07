import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, CalendarDays, Check, ChevronRight, Download, Gift, Maximize2,
  Plus, Share2, Shuffle, Sparkles, Trash2, Trophy, Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOperationalEvent } from "@/lib/events-queries";
import { Brandmark } from "@/components/Brandmark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

type ParticipantSource =
  | "clientes_cadastrados"
  | "compradores_evento"
  | "checkins_evento"
  | "compradores_periodo"
  | "clientes_recorrentes";
type EntryMode = "pessoa" | "ingresso";
type PageMode = "list" | "create" | "draw";

type RaffleSummary = {
  id: string;
  title: string;
  participant_source: ParticipantSource;
  entry_mode: EntryMode;
  event_id: string | null;
  event_title: string | null;
  participant_count: number;
  entry_count: number;
  prize_count: number;
  winner_count: number;
  status: "ready" | "completed";
  created_at: string;
  completed_at: string | null;
};

type RafflePrize = {
  id: string;
  label: string;
  position: number;
  winner: { participant_name: string; drawn_at: string } | null;
};

type RaffleDetail = {
  id: string;
  title: string;
  participant_source: ParticipantSource;
  entry_mode: EntryMode;
  event_id: string | null;
  event_title: string | null;
  period_start: string | null;
  period_end: string | null;
  participant_count: number;
  entry_count: number;
  status: "ready" | "completed";
  created_at: string;
  completed_at: string | null;
  prizes: RafflePrize[];
  entries: string[];
};

type DrawResult = {
  winner_id: string;
  raffle_id: string;
  prize_id: string;
  prize_label: string;
  participant_name: string;
  drawn_at: string;
  round: number;
  total_rounds: number;
  completed: boolean;
};

const SOURCE_LABELS: Record<ParticipantSource, string> = {
  clientes_cadastrados: "Clientes cadastrados",
  compradores_evento: "Compradores do evento ativo",
  checkins_evento: "Público presente (check-in)",
  compradores_periodo: "Compradores no período",
  clientes_recorrentes: "Clientes recorrentes",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const candidate = line ? line + " " + word : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function exportStory(title: string, result: DrawResult, people: number, entries: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível montar a imagem.");

  const gradient = context.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, "#202026");
  gradient.addColorStop(1, "#080809");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1080, 1920);

  const accent =
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#8B5CF6";
  context.fillStyle = accent;
  context.fillRect(72, 92, 936, 8);

  context.strokeStyle = accent;
  context.lineWidth = 7;
  context.strokeRect(76, 150, 54, 42);
  context.fillStyle = "#F5F5F7";
  context.font = "600 38px Arial, sans-serif";
  context.textAlign = "left";
  context.fillText("TicketFlow", 156, 184);

  context.textAlign = "center";
  context.fillStyle = "#A1A1AA";
  context.font = "600 28px Arial, sans-serif";
  context.fillText("RESULTADO DO SORTEIO", 540, 410);

  context.fillStyle = "#F5F5F7";
  context.font = "700 48px Arial, sans-serif";
  wrapCanvasText(context, title, 850).slice(0, 2).forEach((line, index) => {
    context.fillText(line, 540, 510 + index * 62);
  });

  context.fillStyle = accent;
  context.font = "700 30px Arial, sans-serif";
  context.fillText("RODADA " + result.round + " DE " + result.total_rounds, 540, 740);

  context.fillStyle = "#A1A1AA";
  context.font = "600 26px Arial, sans-serif";
  context.fillText("PRÊMIO", 540, 870);

  context.fillStyle = "#F5F5F7";
  context.font = "700 56px Arial, sans-serif";
  wrapCanvasText(context, result.prize_label, 850).slice(0, 2).forEach((line, index) => {
    context.fillText(line, 540, 950 + index * 68);
  });

  context.fillStyle = accent;
  context.font = "700 28px Arial, sans-serif";
  context.fillText("GANHADOR(A)", 540, 1170);

  context.fillStyle = "#FFFFFF";
  const nameLines = wrapCanvasText(context, result.participant_name, 900).slice(0, 3);
  const nameSize = nameLines.length > 2 ? 56 : 76;
  context.font = "700 " + nameSize + "px Arial, sans-serif";
  nameLines.forEach((line, index) => {
    context.fillText(line, 540, 1280 + index * (nameSize + 18));
  });

  context.fillStyle = "#A1A1AA";
  context.font = "24px Arial, sans-serif";
  context.fillText(
    people.toLocaleString("pt-BR") + " participantes · " + entries.toLocaleString("pt-BR") + " chances",
    540,
    1580,
  );

  context.fillStyle = accent;
  context.fillRect(72, 1740, 936, 3);
  context.fillStyle = "#A1A1AA";
  context.font = "24px Arial, sans-serif";
  context.fillText("SORTEIO REALIZADO PELO TICKETFLOW", 540, 1805);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error("Falha ao gerar o PNG."));
    }, "image/png");
  });
  const file = new File([blob], "resultado-sorteio-ticketflow.png", { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (nav.share && nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file], title: "Resultado do sorteio: " + result.prize_label });
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SorteadorPage() {
  const queryClient = useQueryClient();
  const { event: operationalEvent, isLoading: eventLoading } = useOperationalEvent();

  const [pageMode, setPageMode] = useState<PageMode>("list");
  const [selectedRaffleId, setSelectedRaffleId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [source, setSource] = useState<ParticipantSource>("compradores_evento");
  const [entryMode, setEntryMode] = useState<EntryMode>("pessoa");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [prizes, setPrizes] = useState<string[]>([""]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [drawing, setDrawing] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [animatedName, setAnimatedName] = useState("Preparando participantes...");
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  const [showPreviousWinner, setShowPreviousWinner] = useState(true);
  const [sharing, setSharing] = useState(false);

  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawLockRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const rafflesQuery = useQuery({
    queryKey: ["raffles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("list_raffles");
      if (error) throw error;
      return (data ?? []) as RaffleSummary[];
    },
  });

  const detailQuery = useQuery({
    queryKey: ["raffle-detail", selectedRaffleId],
    enabled: pageMode === "draw" && Boolean(selectedRaffleId),
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_raffle_details", {
        _raffle_id: selectedRaffleId,
      });
      if (error) throw error;
      return data as RaffleDetail;
    },
  });

  const raffle = detailQuery.data;
  const requiresEvent = source === "compradores_evento" || source === "checkins_evento";
  const registeredOnly = source === "clientes_cadastrados";
  const names = useMemo(() => raffle?.entries?.filter(Boolean) ?? [], [raffle?.entries]);
  const nextPrize = raffle?.prizes?.find((prize) => !prize.winner) ?? null;

  const previousWinner = useMemo<DrawResult | null>(() => {
    if (!raffle) return null;
    const latest = [...raffle.prizes]
      .filter((prize) => prize.winner)
      .sort((a, b) =>
        new Date(b.winner!.drawn_at).getTime() - new Date(a.winner!.drawn_at).getTime(),
      )[0];
    if (!latest?.winner) return null;
    return {
      winner_id: latest.id,
      raffle_id: raffle.id,
      prize_id: latest.id,
      prize_label: latest.label,
      participant_name: latest.winner.participant_name,
      drawn_at: latest.winner.drawn_at,
      round: latest.position,
      total_rounds: raffle.prizes.length,
      completed: raffle.status === "completed",
    };
  }, [raffle]);

  const visibleWinner = drawResult ?? (showPreviousWinner ? previousWinner : null);

  useEffect(() => {
    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const resetForm = () => {
    setTitle("");
    setSource("compradores_evento");
    setEntryMode("pessoa");
    setPeriodStart("");
    setPeriodEnd("");
    setPrizes([""]);
    setAdvancedOpen(false);
    setFormError(null);
  };

  const openNewRaffle = () => {
    resetForm();
    setPageMode("create");
  };

  const openRaffle = (id: string) => {
    setSelectedRaffleId(id);
    setDrawResult(null);
    setShowPreviousWinner(true);
    setPageMode("draw");
  };

  const addPrize = () => {
    if (prizes.length >= 30) return;
    setPrizes((current) => [...current, ""]);
  };

  const createRaffle = async () => {
    setFormError(null);
    if (!title.trim()) {
      setFormError("Informe o nome do sorteio.");
      return;
    }
    if (requiresEvent && !operationalEvent?.id) {
      setFormError("Não existe um evento ativo para este critério.");
      return;
    }
    if (Boolean(periodStart) !== Boolean(periodEnd)) {
      setFormError("Preencha as duas datas do período ou deixe ambas vazias.");
      return;
    }
    if (periodStart && periodEnd && periodStart > periodEnd) {
      setFormError("A data final deve ser igual ou posterior à inicial.");
      return;
    }
    const cleanPrizes = prizes.map((value) => value.trim());
    if (!cleanPrizes.length || cleanPrizes.some((value) => !value)) {
      setFormError("Preencha todos os prêmios ou remova os campos vazios.");
      return;
    }
    if (cleanPrizes.some((value) => value.length > 160)) {
      setFormError("Cada prêmio deve ter até 160 caracteres.");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await (supabase as any).rpc("create_raffle", {
        _title: title.trim(),
        _source: source,
        _event_id: requiresEvent ? operationalEvent?.id ?? null : null,
        _period_start: periodStart || null,
        _period_end: periodEnd || null,
        _entry_mode: registeredOnly ? "pessoa" : entryMode,
        _prizes: cleanPrizes,
      });
      if (error) throw error;
      const id = data?.raffle_id as string | undefined;
      if (!id) throw new Error("O banco não retornou o identificador do sorteio.");

      await queryClient.invalidateQueries({ queryKey: ["raffles"] });
      setSelectedRaffleId(id);
      setDrawResult(null);
      setShowPreviousWinner(false);
      setPageMode("draw");
      resetForm();
      toast.success(
        "Sorteio criado com " + Number(data.participant_count).toLocaleString("pt-BR") + " participantes.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível criar o sorteio.";
      setFormError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const startDraw = () => {
    if (!raffle || !nextPrize || drawing || drawLockRef.current || !names.length) return;

    drawLockRef.current = true;
    setDrawResult(null);
    setShowPreviousWinner(false);
    setDrawing(true);
    setCountdown(5);
    setAnimatedName(names[Math.floor(Math.random() * names.length)] ?? "Sorteando...");
    const startedAt = Date.now();

    animationRef.current = setInterval(() => {
      const remaining = Math.max(0, 5000 - (Date.now() - startedAt));
      setCountdown(Math.ceil(remaining / 1000));
      setAnimatedName(names[Math.floor(Math.random() * names.length)] ?? "Sorteando...");
      if (remaining <= 0 && animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    }, 85);

    timeoutRef.current = setTimeout(async () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      try {
        const { data, error } = await (supabase as any).rpc("draw_raffle_winner", {
          _raffle_id: raffle.id,
          _prize_id: nextPrize.id,
        });
        if (error) throw error;
        setDrawResult(data as DrawResult);
        setAnimatedName(data.participant_name);
        await detailQuery.refetch();
        await queryClient.invalidateQueries({ queryKey: ["raffles"] });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Não foi possível concluir o sorteio.";
        toast.error(message);
      } finally {
        setDrawing(false);
        drawLockRef.current = false;
        timeoutRef.current = null;
      }
    }, 5000);
  };

  const toggleFullscreen = async () => {
    if (!stageRef.current) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await stageRef.current.requestFullscreen();
      }
    } catch {
      toast.error("Não foi possível abrir o modo de apresentação.");
    }
  };

  const shareWinner = async () => {
    if (!raffle || !visibleWinner) return;
    setSharing(true);
    try {
      await exportStory(
        raffle.title,
        visibleWinner,
        raffle.participant_count,
        raffle.entry_count,
      );
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        toast.error(error instanceof Error ? error.message : "Falha ao exportar o resultado.");
      }
    } finally {
      setSharing(false);
    }
  };

  const backToList = () => {
    if (drawing) return;
    setPageMode("list");
    setSelectedRaffleId(null);
    setDrawResult(null);
  };

  const startNextRound = () => {
    setDrawResult(null);
    setShowPreviousWinner(false);
  };

  if (pageMode === "create") {
    return (
      <div className="mx-auto max-w-3xl space-y-5 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={() => setPageMode("list")} aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Novo sorteio</h1>
            <p className="text-sm text-[var(--text-secondary)]">Configure os participantes e os prêmios.</p>
          </div>
        </div>

        <div className="space-y-5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 md:p-6">
          <div className="space-y-2">
            <label htmlFor="raffle-title" className="text-sm font-medium text-[var(--text-primary)]">Nome do sorteio</label>
            <Input
              id="raffle-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Sorteio Halloween Fantasy 2026"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-primary)]">Quem poderá participar?</label>
            <Select value={source} onValueChange={(value) => setSource(value as ParticipantSource)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="clientes_cadastrados">Clientes cadastrados</SelectItem>
                <SelectItem value="compradores_evento">Compradores do evento ativo</SelectItem>
                <SelectItem value="checkins_evento">Público presente (check-in)</SelectItem>
                <SelectItem value="compradores_periodo">Compradores no período</SelectItem>
                <SelectItem value="clientes_recorrentes">Clientes recorrentes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-[var(--text-secondary)]">
              {source === "clientes_cadastrados" && "Contas criadas no período informado."}
              {source === "compradores_evento" && "Compras pagas e confirmadas no evento operacional."}
              {source === "checkins_evento" && "Somente ingressos utilizados e com check-in registrado no evento operacional."}
              {source === "compradores_periodo" && "Compras pagas de qualquer evento dentro do período selecionado."}
              {source === "clientes_recorrentes" && "Compradores com compras pagas em pelo menos dois eventos diferentes no período."}
            </p>
          </div>

          {requiresEvent && (
            <div className="flex items-start gap-3 border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
              <CalendarDays className="mt-0.5 h-4 w-4 text-[var(--text-secondary)]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">Evento considerado</p>
                {eventLoading ? (
                  <p className="text-xs text-[var(--text-secondary)]">Carregando evento operacional...</p>
                ) : operationalEvent ? (
                  <p className="text-sm text-[var(--text-secondary)]">
                    {operationalEvent.title} · {new Date(operationalEvent.event_date).toLocaleDateString("pt-BR")}
                  </p>
                ) : (
                  <p className="text-sm text-[var(--error)]">Nenhum evento ativo disponível para este critério.</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)]">Período de participação</label>
              <p className="text-xs text-[var(--text-secondary)]">Opcional. Deixe em branco para considerar todo o histórico.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="raffle-period-start" className="text-xs text-[var(--text-secondary)]">Data inicial</label>
                <Input id="raffle-period-start" type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
              </div>
              <div className="space-y-1">
                <label htmlFor="raffle-period-end" className="text-xs text-[var(--text-secondary)]">Data final</label>
                <Input id="raffle-period-end" type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">O sistema usa a data do cadastro, pagamento ou check-in, conforme o critério.</p>
          </div>

          <Accordion type="single" collapsible value={advancedOpen ? "advanced" : ""} onValueChange={(value) => setAdvancedOpen(value === "advanced")}>
            <AccordionItem value="advanced" className="border-t border-[var(--border-subtle)]">
              <AccordionTrigger className="py-3 text-sm text-[var(--text-primary)] hover:no-underline">
                Configurações avançadas
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]">Quantidade de chances</label>
                  {registeredOnly ? (
                    <p className="text-sm text-[var(--text-secondary)]">Cada conta cadastrada participa uma vez.</p>
                  ) : (
                    <>
                      <Select value={entryMode} onValueChange={(value) => setEntryMode(value as EntryMode)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pessoa">Uma chance por pessoa</SelectItem>
                          <SelectItem value="ingresso">Uma chance por ingresso</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Cada ingresso elegível gera uma chance. Mesmo no modo por ingresso, o ganhador não se repete nas próximas rodadas.
                      </p>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Prêmios / Rodadas</h2>
                <p className="text-xs text-[var(--text-secondary)]">Adicione um campo para cada prêmio.</p>
              </div>
              <Badge variant="secondary">{prizes.length} {prizes.length === 1 ? "rodada" : "rodadas"}</Badge>
            </div>
            <div className="space-y-2">
              {prizes.map((prize, index) => (
                <div className="flex items-center gap-2" key={index}>
                  <span className="w-7 shrink-0 text-center text-xs text-[var(--text-secondary)]">{index + 1}.</span>
                  <Input
                    value={prize}
                    onChange={(event) => setPrizes((current) => current.map((item, i) => i === index ? event.target.value : item))}
                    placeholder={"Prêmio da " + (index + 1) + "ª rodada"}
                    maxLength={160}
                  />
                  {prizes.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setPrizes((current) => current.filter((_, i) => i !== index))}
                      aria-label={"Remover prêmio " + (index + 1)}
                    >
                      <Trash2 className="h-4 w-4 text-[var(--text-secondary)]" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addPrize} disabled={prizes.length >= 30}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar prêmio
            </Button>
          </div>

          {formError && (
            <div role="alert" className="border border-[var(--error)] bg-[var(--error-muted)] px-3 py-2 text-sm text-[var(--error-text)]">
              {formError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-[var(--border-subtle)] pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setPageMode("list")} disabled={creating}>Cancelar</Button>
            <Button type="button" onClick={createRaffle} disabled={creating || (requiresEvent && (eventLoading || !operationalEvent))}>
              {creating ? "Preparando participantes..." : "Criar sorteio"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (pageMode === "draw") {
    const stageStyle: CSSProperties = {
      "--text-primary": "#F5F5F7",
      "--text-secondary": "#A1A1AA",
      "--icon-brand": "var(--accent)",
    } as unknown as CSSProperties;

    return (
      <div className="mx-auto max-w-5xl space-y-5 animate-in fade-in duration-300">
        <style>{".sorteador-stage:fullscreen{width:100vw;height:100vh;max-width:none;aspect-ratio:auto;border:0;justify-content:space-between;padding:7vh 8vw}.sorteador-stage:fullscreen .sorteador-prize{margin-top:4vh}.sorteador-stage:fullscreen .sorteador-name{font-size:clamp(2rem,6vw,5rem)}"}</style>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="icon" onClick={backToList} disabled={drawing} aria-label="Voltar aos sorteios">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">{raffle?.title ?? "Sorteio"}</h1>
              <p className="text-xs text-[var(--text-secondary)]">Apresentação do sorteio</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={toggleFullscreen}>
              <Maximize2 className="mr-2 h-4 w-4" /> Tela cheia
            </Button>
            {visibleWinner && (
              <Button type="button" variant="outline" size="sm" onClick={shareWinner} disabled={sharing}>
                {sharing ? <Download className="mr-2 h-4 w-4 animate-pulse" /> : <Share2 className="mr-2 h-4 w-4" />}
                Compartilhar resultado
              </Button>
            )}
          </div>
        </div>

        {detailQuery.isLoading ? (
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-10 text-center text-sm text-[var(--text-secondary)]">
            Carregando sorteio...
          </div>
        ) : detailQuery.isError || !raffle ? (
          <div className="rounded-lg border border-[var(--error)] bg-[var(--error-muted)] p-4 text-sm text-[var(--error-text)]">
            Não foi possível carregar este sorteio.
            <Button type="button" variant="outline" size="sm" className="ml-3" onClick={backToList}>Voltar</Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Participantes", raffle.participant_count],
                ["Chances", raffle.entry_count],
                ["Prêmios", raffle.prizes.length],
                ["Realizados", raffle.prizes.filter((item) => item.winner).length],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
                  <p className="text-xs text-[var(--text-secondary)]">{label}</p>
                  <p className="text-xl font-semibold tabular-nums text-[var(--text-primary)]">{Number(value).toLocaleString("pt-BR")}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 md:p-6">
              <div
                ref={stageRef}
                style={stageStyle}
                className="sorteador-stage relative flex aspect-[9/16] w-full max-w-[380px] flex-col items-center overflow-hidden border border-white/10 bg-[radial-gradient(ellipse_at_50%_20%,rgba(255,255,255,0.10),transparent_55%),linear-gradient(155deg,#19191d_0%,#0b0b0d_100%)] px-6 py-8 text-center shadow-2xl"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-[var(--accent)]" />
                <Brandmark size="sm" className="mt-2 opacity-80" />
                <div className="mt-12 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span className="max-w-full truncate">{raffle.title}</span>
                </div>

                <div className="sorteador-prize mt-12 w-full">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">
                    {drawing
                      ? "Sorteio em andamento"
                      : visibleWinner
                        ? "Prêmio sorteado"
                        : nextPrize
                          ? "Rodada " + nextPrize.position + " de " + raffle.prizes.length
                          : "Sorteio concluído"}
                  </p>
                  <h2 className="mt-3 break-words text-2xl font-bold leading-tight text-white">
                    {drawing
                      ? nextPrize?.label
                      : visibleWinner?.prize_label ?? nextPrize?.label ?? "Todos os prêmios entregues"}
                  </h2>
                </div>

                <div className="my-auto flex w-full flex-col items-center">
                  {drawing ? (
                    <>
                      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--accent)]/50 bg-[var(--accent)]/10 text-3xl font-bold tabular-nums text-[var(--accent)]">
                        {countdown}
                      </div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">Sorteando...</p>
                      <div className="mt-8 flex min-h-[130px] w-full items-center justify-center overflow-hidden border-y border-white/10 py-7">
                        <p key={animatedName} className="sorteador-name animate-in fade-in zoom-in-95 break-words text-2xl font-semibold text-white duration-75">
                          {animatedName}
                        </p>
                      </div>
                    </>
                  ) : visibleWinner ? (
                    <>
                      <Trophy className="mb-5 h-12 w-12 text-[var(--accent)]" strokeWidth={1.4} />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Ganhador(a)</p>
                      <p className="sorteador-name mt-5 break-words text-3xl font-bold leading-tight text-white">
                        {visibleWinner.participant_name}
                      </p>
                      <div className="mt-6 h-px w-20 bg-[var(--accent)]/70" />
                      <p className="mt-5 text-sm text-white/50">Parabéns!</p>
                    </>
                  ) : (
                    <>
                      <Shuffle className="mb-5 h-12 w-12 text-[var(--accent)]" strokeWidth={1.3} />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Pronto para sortear</p>
                      <p className="mt-5 break-words text-2xl font-semibold text-white/85">
                        {names.length.toLocaleString("pt-BR")} chances restantes
                      </p>
                    </>
                  )}
                </div>

                <div className="mb-1 mt-6 w-full border-t border-white/10 pt-5 text-center">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Sorteio realizado com</p>
                  <p className="mt-1 text-sm font-semibold text-white/65">TicketFlow</p>
                </div>
              </div>

              <div className="w-full max-w-[380px]">
                {drawing ? (
                  <Button type="button" disabled>Contagem regressiva em andamento...</Button>
                ) : visibleWinner && nextPrize ? (
                  <Button type="button" onClick={startNextRound}>
                    Próxima rodada <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : nextPrize ? (
                  <Button type="button" onClick={startDraw} disabled={!names.length}>
                    <Shuffle className="mr-2 h-4 w-4" /> Iniciar sorteio
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={backToList}>
                    <Check className="mr-2 h-4 w-4" /> Sorteio concluído
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Prêmios e resultados</h2>
              <div className="divide-y divide-[var(--border-subtle)]">
                {raffle.prizes.map((prize) => (
                  <div key={prize.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 text-xs text-[var(--text-secondary)]">{prize.position}.</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{prize.label}</p>
                        {prize.winner && (
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {prize.winner.participant_name} · {formatDateTime(prize.winner.drawn_at)}
                          </p>
                        )}
                      </div>
                    </div>
                    {prize.winner ? <Badge>Concluído</Badge> : <Badge variant="secondary">Aguardando</Badge>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Sorteador</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Crie sorteios a partir dos dados reais dos clientes e eventos.</p>
        </div>
        <Button type="button" onClick={openNewRaffle}>
          <Plus className="mr-2 h-4 w-4" /> Novo sorteio
        </Button>
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
        <div className="mb-4 flex items-center gap-2">
          <Gift className="h-4 w-4 text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Histórico de sorteios</h2>
        </div>

        {rafflesQuery.isLoading ? (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">Carregando histórico...</p>
        ) : rafflesQuery.isError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm text-[var(--error)]">Não foi possível carregar o histórico.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => rafflesQuery.refetch()}>Tentar novamente</Button>
          </div>
        ) : !rafflesQuery.data?.length ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
              <Shuffle className="h-5 w-5 text-[var(--text-secondary)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Nenhum sorteio realizado</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Seus sorteios e resultados aparecerão aqui.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={openNewRaffle}>Criar primeiro sorteio</Button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {rafflesQuery.data.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openRaffle(item.id)}
                className="flex w-full flex-col gap-3 py-4 text-left transition-colors hover:bg-[var(--bg-tertiary)] sm:flex-row sm:items-center sm:justify-between sm:px-2"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                    {item.status === "completed" ? <Badge>Concluído</Badge> : <Badge variant="secondary">Em andamento</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {SOURCE_LABELS[item.participant_source]}{item.event_title ? " · " + item.event_title : ""}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{formatDateTime(item.created_at)}</p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                  <div className="flex gap-4 text-xs text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {item.participant_count}</span>
                    <span>{item.winner_count}/{item.prize_count} prêmios</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
        <Shuffle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>Os participantes são registrados no momento da criação. A escolha do ganhador ocorre no servidor e ninguém vence mais de uma rodada no mesmo sorteio.</p>
      </div>
    </div>
  );
}
