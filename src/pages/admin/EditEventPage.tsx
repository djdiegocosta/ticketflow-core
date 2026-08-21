import { useEffect, useState } from "react";
import {
  Layers,
  Tag,
  Calendar,
  Clock,
  MapPin,
  FastForward,
  Trash2,
  Plus,
  ExternalLink,
  Upload,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/admin/DataTable";
import { useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  deleteBatch,
  updateEvent,
  upsertBatch,
  useEvent,
  slugify,
  type BatchRow,
  cancelEvent,
  deleteEvent,
} from "@/lib/events-queries";

type BatchDraft = {
  id?: string;
  nome: string;
  preco: string;
  quantidade: string;
  inicio: string;
  fim: string;
};

const toLocalInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");

const batchToDraft = (b: BatchRow): BatchDraft => ({
  id: b.id,
  nome: b.name,
  preco: String(b.price),
  quantidade: String(b.quantity),
  inicio: toLocalInput(b.starts_at),
  fim: toLocalInput(b.ends_at),
});

export function EditEventPage() {
  const { id } = useParams({ from: "/admin/eventos/$id" });
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();
  const { data, isLoading, error } = useEvent(id);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<"publicado" | "rascunho" | "cancelado">("rascunho");
  const [draft, setDraft] = useState<BatchDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const event = data?.event ?? null;
  const batches = data?.batches ?? [];
  const model: "lotes" | "unico" =
    batches.length === 1 && batches[0]?.name === "Ingresso único" ? "unico" : "lotes";

  useEffect(() => {
    if (!event) return;
    const d = new Date(event.event_date);
    setTitle(event.title);
    setSlug(event.slug);
    setDescription(event.description ?? "");
    setImageUrl(event.image_url ?? "");
    setDate(d.toISOString().slice(0, 10));
    setTime(d.toTimeString().slice(0, 5));
    setLocation(event.location);
    setStatus(event.status);
  }, [event]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["events"] });

  const handleSave = async () => {
    if (!title.trim() || !date || !time || !location.trim()) {
      toast.error("Preencha nome, data, horário e local");
      return;
    }
    setSaving(true);
    try {
      await updateEvent(id, {
        title: title.trim(),
        slug: slugify(slug || title),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        event_date: new Date(`${date}T${time}`).toISOString(),
        location: location.trim(),
        status,
      });
      await refresh();
      toast.success("Alterações salvas com sucesso!");
      navigate({ to: "/admin/eventos" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar evento");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBatch = async () => {
    if (!draft || !organizationId) return;
    if (!draft.nome.trim()) {
      toast.error("Informe o nome do lote");
      return;
    }
    try {
      await upsertBatch(organizationId, id, {
        ...(draft.id ? { id: draft.id } : {}),
        name: draft.nome.trim(),
        price: Number(draft.preco || 0),
        quantity: Number(draft.quantidade || 0),
        starts_at: draft.inicio ? new Date(draft.inicio).toISOString() : null,
        ends_at: draft.fim ? new Date(draft.fim).toISOString() : null,
      });
      setDraft(null);
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["events", id] });
      toast.success("Lote salvo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar lote");
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!window.confirm("Remover este lote?")) return;
    try {
      await deleteBatch(batchId);
      await queryClient.invalidateQueries({ queryKey: ["events", id] });
      await refresh();
      toast.success("Lote removido");
    } catch {
      toast.error("Não foi possível remover o lote (pode haver vendas vinculadas).");
    }
  };

  const handleExpressTurn = async () => {
    const now = new Date();
    const ordered = [...batches].sort(
      (a, b) => new Date(a.starts_at ?? a.created_at).getTime() - new Date(b.starts_at ?? b.created_at).getTime(),
    );
    const current = ordered.find((b) => !b.ends_at || new Date(b.ends_at) > now);
    const next = current ? ordered[ordered.indexOf(current) + 1] : undefined;

    if (!current || !next) {
      toast.error("Não há próximo lote configurado para a virada.");
      return;
    }
    if (!window.confirm(`Encerrar "${current.name}" e iniciar "${next.name}" agora?`)) return;

    const iso = now.toISOString();
    const { error: err1 } = await supabase
      .from("ticket_batches")
      .update({ ends_at: iso })
      .eq("id", current.id);
    const { error: err2 } = await supabase
      .from("ticket_batches")
      .update({ starts_at: iso })
      .eq("id", next.id);

    if (err1 || err2) {
      toast.error("Erro ao realizar a virada de lote");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["events", id] });
    toast.success("Lote alterado com sucesso!");
  };

  const StepIndicator = ({ number, label }: { number: number; label: string }) => (
    <button
      onClick={() => setStep(number)}
      className={cn(
        "flex flex-col items-center gap-2 transition-all",
        step === number ? "text-accent" : "text-text-disabled hover:text-text-secondary",
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all",
          step === number ? "bg-accent text-[#111111]" : "bg-bg-tertiary",
        )}
      >
        {number}
      </div>
      <span className="text-small font-medium">{label}</span>
    </button>
  );

  if (isLoading) {
    return <div className="text-small text-text-secondary">Carregando evento...</div>;
  }

  if (error || !event) {
    return <div className="text-small text-error">Evento não encontrado.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <h1 className="text-heading-1 text-text-primary">Editar Evento</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-small text-text-secondary">Status:</span>
            <StatusPill tone={status === 'rascunho' ? 'warning' : 'neutral'}>
              {status}
            </StatusPill>
          </div>
          <div className="mt-2">
            <a
              href={`/e/${event.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-small text-accent font-bold hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir página pública
            </a>
          </div>
        </div>

        <button
          onClick={handleExpressTurn}
          className="inline-flex items-center gap-2 bg-bg-secondary border border-accent text-accent px-4 py-2 rounded-radius-md font-semibold hover:bg-accent-muted transition-colors"
        >
          <FastForward className="w-4 h-4" />
          Virada Expressa de Lote
        </button>

        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (!window.confirm("Tem certeza que deseja cancelar este evento? Todos os ingressos serão invalidados e as vendas associadas serão marcadas como canceladas. Esta ação não pode ser desfeita.")) return;
              try {
                await cancelEvent(id);
                toast.success("Evento cancelado com sucesso");
                refresh();
              } catch (err: any) {
                toast.error("Erro ao cancelar evento: " + (err.message || "Tente novamente."));
              }
            }}
            className="inline-flex items-center gap-2 bg-bg-secondary border border-error/40 text-error px-4 py-2 rounded-radius-md font-semibold hover:bg-error/10 transition-colors"
          >
            Cancelar Evento
          </button>
          
          <button
            onClick={async () => {
              if (!window.confirm("Tem certeza que deseja excluir permanentemente este evento? Esta ação só é permitida se não houver vendas pagas.")) return;
              try {
                await deleteEvent(id);
                toast.success("Evento excluído com sucesso");
                navigate({ to: "/admin/eventos" });
              } catch (err: any) {
                toast.error("Erro ao excluir evento: " + (err.message || "Verifique se há vendas pagas vinculadas."));
              }
            }}
            className="inline-flex items-center gap-2 bg-error text-white px-4 py-2 rounded-radius-md font-semibold hover:opacity-90 transition-opacity"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>
      </div>

      <div className="flex justify-center gap-12 py-6 bg-bg-secondary rounded-radius-lg border border-border-subtle shadow-sm">
        {[
          { n: 1, l: "Básico" },
          { n: 2, l: "Modelo" },
          { n: 3, l: "Vendas" },
          { n: 4, l: "Revisão" },
        ].map((s) => (
          <StepIndicator key={s.n} number={s.n} label={s.l} />
        ))}
      </div>

      <div className="bg-bg-secondary border border-border-default rounded-radius-lg p-8 shadow-sm min-h-[400px]">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-heading-2">Informações básicas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-small font-medium text-text-secondary">Nome do evento</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-small font-medium text-text-secondary">Slug do evento</label>
                <div className="flex items-center gap-2 text-small">
                  <span className="text-text-disabled">/e/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    className="flex-1 bg-bg-primary border border-border-default rounded-radius-sm p-1 outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-small font-medium text-text-secondary">Descrição</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-small font-medium text-text-secondary">Imagem de capa</label>
                <div 
                  className={cn(
                    "relative border-2 border-dashed border-border-default rounded-radius-md p-8 text-center hover:border-accent transition-all cursor-pointer group overflow-hidden min-h-[160px] flex flex-col items-center justify-center",
                    imageUrl && "border-solid border-accent/20"
                  )}
                  onClick={() => document.getElementById("event-image-upload-edit")?.click()}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-accent animate-spin" />
                      <p className="text-small text-text-secondary">Enviando imagem...</p>
                    </div>
                  ) : imageUrl ? (
                    <>
                      <img src={imageUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                      <div className="relative z-10 flex flex-col items-center gap-1">
                        <Upload className="w-6 h-6 text-accent mb-1" />
                        <p className="text-small font-bold text-accent">Clique para alterar a imagem</p>
                        <p className="text-[10px] text-text-secondary">Imagem carregada com sucesso</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-text-disabled mx-auto mb-2 group-hover:text-accent" />
                      <p className="text-small text-text-secondary font-medium">Clique para fazer upload da imagem de capa</p>
                      <p className="text-[10px] text-text-tertiary mt-1 max-w-[280px]">
                        Tamanho recomendado: 1200×675px (16:9), até 2MB, JPG/PNG/WEBP.
                      </p>
                    </>
                  )}
                  <input
                    id="event-image-upload-edit"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      if (file.size > 2 * 1024 * 1024) {
                        toast.error("A imagem deve ter no máximo 2MB");
                        return;
                      }

                      setIsUploading(true);
                      try {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                        const filePath = `events/${fileName}`;

                        const { error: uploadError } = await supabase.storage
                          .from('event-images')
                          .upload(filePath, file);

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage
                          .from('event-images')
                          .getPublicUrl(filePath);

                        setImageUrl(publicUrl);
                        toast.success("Imagem enviada com sucesso!");
                      } catch (err: any) {
                        toast.error("Erro no upload: " + err.message);
                      } finally {
                        setIsUploading(false);
                      }
                    }}
                  />
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-[1px] flex-1 bg-border-subtle"></div>
                  <span className="text-[10px] text-text-disabled uppercase font-bold tracking-wider">Ou cole uma URL externa</span>
                  <div className="h-[1px] flex-1 bg-border-subtle"></div>
                </div>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 text-small outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-small font-medium text-text-secondary">Data</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-text-disabled" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 pl-10 outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-small font-medium text-text-secondary">Horário</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 w-4 h-4 text-text-disabled" />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 pl-10 outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-small font-medium text-text-secondary">Local / Endereço</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-text-disabled" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 pl-10 outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 text-center">
            <h2 className="text-heading-2">Status de publicação</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <button
                onClick={() => setStatus("publicado")}
                className={cn(
                  "border-2 rounded-radius-lg p-8 text-left space-y-3 transition-all",
                  status === "publicado"
                    ? "border-accent bg-accent-muted"
                    : "border-border-default hover:border-accent bg-bg-primary",
                )}
              >
                <Layers
                  className={cn(
                    "w-10 h-10",
                    status === "publicado" ? "text-accent-text" : "text-text-disabled",
                  )}
                />
                <h3 className="text-heading-2 font-bold">Publicado</h3>
                <p className="text-small text-text-secondary">
                  A página pública fica disponível e os ingressos entram em venda.
                </p>
              </button>
              <button
                onClick={() => setStatus("rascunho")}
                className={cn(
                  "border-2 rounded-radius-lg p-8 text-left space-y-3 transition-all",
                  status === "rascunho"
                    ? "border-accent bg-accent-muted"
                    : "border-border-default hover:border-accent bg-bg-primary",
                )}
              >
                <Tag
                  className={cn(
                    "w-10 h-10",
                    status === "rascunho" ? "text-accent-text" : "text-text-disabled",
                  )}
                />
                <h3 className="text-heading-2 font-bold">Rascunho</h3>
                <p className="text-small text-text-secondary">
                  Somente sua equipe vê o evento. Nenhuma venda é permitida.
                </p>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-heading-2">Lotes</h2>
              <button
                onClick={() =>
                  setDraft({ nome: "", preco: "", quantidade: "", inicio: "", fim: "" })
                }
                className="text-small text-accent font-bold flex items-center gap-1 hover:underline"
              >
                <Plus className="w-4 h-4" /> Adicionar lote
              </button>
            </div>

            {batches.length === 0 && !draft && (
              <div className="text-center py-8 border border-dashed border-border-subtle rounded-radius-md text-text-disabled text-small">
                Nenhum lote configurado.
              </div>
            )}

            <div className="space-y-3">
              {batches.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-4 bg-bg-primary border border-border-subtle rounded-radius-md"
                >
                  <div className="min-w-0">
                    <div className="text-body font-bold truncate">{b.name}</div>
                    <div className="text-small text-text-secondary">
                      R$ {Number(b.price).toFixed(2)} • {b.quantity} unidades
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => setDraft(batchToDraft(b))}
                      className="text-small text-accent font-semibold hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteBatch(b.id)}
                      aria-label={`Remover ${b.name}`}
                      className="text-error hover:bg-error/10 p-2 rounded-full transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {draft && (
              <div className="p-4 bg-bg-primary border border-border-default rounded-radius-md space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-small font-medium text-text-secondary">Nome do lote</label>
                    <input
                      type="text"
                      value={draft.nome}
                      onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
                      className="w-full bg-bg-secondary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-small font-medium text-text-secondary">Preço (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.preco}
                      onChange={(e) => setDraft({ ...draft, preco: e.target.value })}
                      className="w-full bg-bg-secondary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-small font-medium text-text-secondary">Quantidade</label>
                    <input
                      type="number"
                      min="0"
                      value={draft.quantidade}
                      onChange={(e) => setDraft({ ...draft, quantidade: e.target.value })}
                      className="w-full bg-bg-secondary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-small font-medium text-text-secondary">Início das vendas</label>
                    <input
                      type="datetime-local"
                      value={draft.inicio}
                      onChange={(e) => setDraft({ ...draft, inicio: e.target.value })}
                      className="w-full bg-bg-secondary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-small font-medium text-text-secondary">Fim das vendas</label>
                    <input
                      type="datetime-local"
                      value={draft.fim}
                      onChange={(e) => setDraft({ ...draft, fim: e.target.value })}
                      className="w-full bg-bg-secondary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDraft(null)}
                    className="px-4 py-2 border border-border-default rounded-radius-md font-semibold text-text-primary hover:bg-bg-secondary transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveBatch}
                    className="px-4 py-2 bg-accent text-[#111111] rounded-radius-md font-semibold hover:bg-accent-hover transition-colors"
                  >
                    Salvar lote
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8">
            <h2 className="text-heading-2">Resumo do evento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-bg-primary border border-border-subtle rounded-radius-md space-y-2">
                <div className="text-micro font-bold text-text-disabled uppercase">Geral</div>
                <div className="text-body font-bold">{title}</div>
                <div className="text-small text-text-secondary">
                  {location} • {date && time ? new Date(`${date}T${time}`).toLocaleString("pt-BR") : "—"}
                </div>
              </div>
              <div className="p-4 bg-bg-primary border border-border-subtle rounded-radius-md space-y-2">
                <div className="text-micro font-bold text-text-disabled uppercase">Vendas</div>
                <div className="text-body font-bold">
                  {model === "lotes" ? "Modelo por lotes" : "Preço único"}
                </div>
                <div className="text-small text-text-secondary">
                  {batches.length} lote(s) •{" "}
                  {batches.reduce((acc, b) => acc + b.quantity, 0)} ingressos
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-bg-primary border-t border-border-subtle p-4 z-50">
        <div className="max-w-4xl mx-auto flex justify-between px-4">
          <button
            onClick={() => setStep((s) => Math.max(s - 1, 1))}
            disabled={step === 1}
            className="px-6 py-2 border border-border-default rounded-radius-md font-semibold text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-secondary transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={step === 4 ? handleSave : () => setStep((s) => Math.min(s + 1, 4))}
            disabled={saving}
            className="px-8 py-2 bg-accent text-[#111111] rounded-radius-md font-semibold hover:bg-accent-hover transition-colors shadow-sm"
          >
            {saving ? "Salvando..." : step === 4 ? "Salvar alterações" : "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}
