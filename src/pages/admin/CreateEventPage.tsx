import { useState } from "react";
import { Layers, Tag, Upload, Calendar, Clock, MapPin, Plus, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { createEventWithBatches, slugify, type BatchInput } from "@/lib/events-queries";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Lote = {
  id: string;
  nome: string;
  preco: string;
  quantidade: string;
  inicio: string;
  fim: string;
  is_courtesy: boolean;
};

const emptyLote = (): Lote => ({
  id: crypto.randomUUID(),
  nome: "",
  preco: "",
  quantidade: "",
  inicio: "",
  fim: "",
  is_courtesy: false,
});

export function CreateEventPage() {
  const [step, setStep] = useState(1);
  const [model, setModel] = useState<"lotes" | "unico" | null>(null);
  const [name, setName] = useState("");
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [draft, setDraft] = useState<Lote | null>(null);
  const [slugValue, setSlugValue] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [singlePrice, setSinglePrice] = useState("");
  const [singleQuantity, setSingleQuantity] = useState("");
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, organizationId } = useAuth();

  const openNewLote = () => setDraft(emptyLote());
  const updateDraft = (patch: Partial<Lote>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  const saveLote = () => {
    if (!draft) return;
    if (!draft.nome.trim()) {
      toast.error("Informe o nome do lote");
      return;
    }
    setLotes((prev) => {
      const exists = prev.some((l) => l.id === draft.id);
      const next = exists ? prev.map((l) => (l.id === draft.id ? draft : l)) : [...prev, draft];
      return [...next].sort((a, b) => (a.inicio || "").localeCompare(b.inicio || ""));
    });
    setDraft(null);
    toast.success("Lote salvo");
  };

  const removeLote = (id: string) => {
    if (!window.confirm("Remover este lote?")) return;
    setLotes((prev) => prev.filter((l) => l.id !== id));
    if (draft?.id === id) setDraft(null);
  };

  const handleNext = () => setStep((s) => Math.min(s + 1, 4));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));
  const buildBatches = (): BatchInput[] => {
    if (model === "unico") {
      return [
        {
          name: "Ingresso único",
          price: Number(singlePrice || 0),
          quantity: Number(singleQuantity || 0),
          starts_at: null,
          ends_at: null,
          is_courtesy: false,
        },
      ];
    }
    return lotes.map((l) => ({
      name: l.nome,
      price: l.is_courtesy ? 0 : Number(l.preco || 0),
      quantity: l.quantidade ? Number(l.quantidade) : null,
      starts_at: l.inicio ? new Date(l.inicio).toISOString() : null,
      ends_at: l.fim ? new Date(l.fim).toISOString() : null,
      is_courtesy: l.is_courtesy,
    }));
  };

  const handleSave = async (status: "publicado" | "rascunho") => {
    if (!organizationId || !user) {
      toast.error("Sessão inválida. Faça login novamente.");
      return;
    }
    if (!name.trim()) {
      toast.error("Informe o nome do evento");
      return;
    }
    if (!date || !time) {
      toast.error("Informe data e horário do evento");
      return;
    }
    if (!location.trim()) {
      toast.error("Informe o local do evento");
      return;
    }

    const batches = buildBatches();
    if (batches.length === 0 || batches.some((b) => !b.is_courtesy && (b.quantity === null || b.quantity <= 0))) {
      toast.error("Configure ao menos um lote com quantidade válida");
      return;
    }

    setSaving(true);
    try {
      await createEventWithBatches(
        organizationId,
        user.id,
        {
          title: name.trim(),
          description: description.trim() || null,
          image_url: imageUrl.trim() || null,
          event_date: new Date(`${date}T${time}`).toISOString(),
          location: location.trim(),
          slug: slug,
          status,
        },
        batches,
      );
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success(status === "publicado" ? "Evento publicado com sucesso!" : "Evento salvo como rascunho");
      navigate({ to: "/admin/eventos" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar evento");
    } finally {
      setSaving(false);
    }
  };

  const StepIndicator = ({ number, label }: { number: number; label: string }) => (
    <div className={cn("flex flex-col items-center gap-2", step === number ? "text-accent" : "text-text-disabled")}>
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all", step === number ? "bg-accent text-[#111111]" : "bg-bg-tertiary")}>
        {number}
      </div>
      <span className="text-small font-medium">{label}</span>
    </div>
  );

  const slug = slugValue || slugify(name);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-1 text-text-primary">Novo Evento</h1>
        <p className="text-small text-text-secondary">Siga os passos abaixo para configurar seu evento.</p>
      </div>

      <div className="flex justify-center gap-12 py-6 bg-bg-secondary rounded-radius-lg border border-border-subtle shadow-sm">
        {[ { n: 1, l: "Básico" }, { n: 2, l: "Modelo" }, { n: 3, l: "Vendas" }, { n: 4, l: "Revisão" } ].map(s => <StepIndicator key={s.n} number={s.n} label={s.l} />)}
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Festa de Verão 2026"
                  className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent" 
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <label className="text-small font-medium text-text-secondary">Slug do evento</label>
                <div className="flex items-center gap-2 text-small">
                  <span className="text-text-disabled">ticketflow.com.br/e/</span>
                  <input 
                    type="text" 
                    value={slug}
                    onChange={(e) => setSlugValue(slugify(e.target.value))}
                    className="flex-1 bg-bg-primary border border-border-default rounded-radius-sm p-1 outline-none focus:border-accent" 
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-small font-medium text-text-secondary">Descrição</label>
                <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent" placeholder="Conte mais sobre o evento..."></textarea>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-small font-medium text-text-secondary">Imagem de capa</label>
                <div 
                  className={cn(
                    "relative border-2 border-dashed border-border-default rounded-radius-md p-8 text-center hover:border-accent transition-all cursor-pointer group overflow-hidden min-h-[160px] flex flex-col items-center justify-center",
                    imageUrl && "border-solid border-accent/20"
                  )}
                  onClick={() => document.getElementById("event-image-upload")?.click()}
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
                    id="event-image-upload"
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
                
                {/* Fallback URL input hidden but available for advanced use if needed, or we can just remove it */}
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
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 pl-10 outline-none focus:border-accent" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-small font-medium text-text-secondary">Horário</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 w-4 h-4 text-text-disabled" />
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 pl-10 outline-none focus:border-accent" />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-small font-medium text-text-secondary">Local / Endereço</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-text-disabled" />
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Arena Central, São Paulo - SP" className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 pl-10 outline-none focus:border-accent" />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 text-center">
            <h2 className="text-heading-2">Como deseja vender?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <button 
                onClick={() => { setModel("lotes"); handleNext(); }}
                className={cn(
                  "border-2 rounded-radius-lg p-8 text-left space-y-3 transition-all",
                  model === "lotes" ? "border-accent bg-accent-muted" : "border-border-default hover:border-accent bg-bg-primary"
                )}
              >
                <Layers className={cn("w-10 h-10", model === "lotes" ? "text-accent-text" : "text-text-disabled")} />
                <h3 className="text-heading-2 font-bold">Trabalhar com lotes</h3>
                <p className="text-small text-text-secondary">Configure múltiplos lotes com preços e datas diferentes.</p>
              </button>
              <button 
                onClick={() => { setModel("unico"); handleNext(); }}
                className={cn(
                  "border-2 rounded-radius-lg p-8 text-left space-y-3 transition-all",
                  model === "unico" ? "border-accent bg-accent-muted" : "border-border-default hover:border-accent bg-bg-primary"
                )}
              >
                <Tag className={cn("w-10 h-10", model === "unico" ? "text-accent-text" : "text-text-disabled")} />
                <h3 className="text-heading-2 font-bold">Preço único</h3>
                <p className="text-small text-text-secondary">Um único preço e quantidade para todo o evento. Ideal para eventos simples.</p>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-heading-2">Configuração de vendas</h2>
            {model === "lotes" ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-small font-medium text-text-secondary">Lotes adicionados</span>
                  <button
                    type="button"
                    onClick={openNewLote}
                    className="text-small text-accent font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-4 h-4" /> Adicionar lote
                  </button>
                </div>

                {lotes.length === 0 && !draft && (
                  <div className="text-center py-8 border border-dashed border-border-subtle rounded-radius-md text-text-disabled text-small">
                    Nenhum lote adicionado ainda. Adicione o primeiro lote para continuar.
                  </div>
                )}

                {lotes.length > 0 && (
                  <div className="space-y-2">
                    {lotes.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center justify-between gap-4 p-3 bg-bg-primary border border-border-subtle rounded-radius-md"
                      >
                        <div className="min-w-0">
                          <div className="text-body font-semibold text-text-primary truncate">{l.nome}</div>
                          <div className="text-small text-text-secondary">
                            R$ {l.preco || "0,00"} · {l.quantidade !== "" ? `${l.quantidade} ingressos` : "Sem limite"}
                            {l.is_courtesy && " · Cortesia"}
                            {l.inicio || l.fim ? ` · ${l.inicio || "—"} → ${l.fim || "—"}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            type="button"
                            onClick={() => setDraft(l)}
                            className="text-small text-accent font-semibold hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLote(l.id)}
                            aria-label="Remover lote"
                            className="text-text-disabled hover:text-error transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {draft && (
                  <div className="p-4 bg-bg-primary border border-border-default rounded-radius-md space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-small font-medium text-text-secondary">Nome do lote</label>
                        <input
                          type="text"
                          value={draft.nome}
                          onChange={(e) => updateDraft({ nome: e.target.value })}
                          placeholder="Ex: 1º Lote"
                          className="w-full bg-bg-secondary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={draft.is_courtesy}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              updateDraft({
                                is_courtesy: isChecked,
                                preco: isChecked ? "0.00" : draft.preco
                              });
                            }}
                            className="w-4 h-4 text-accent border-border-default rounded focus:ring-accent"
                          />
                          <span className="text-small font-medium text-text-secondary">Este lote é de Cortesias</span>
                        </label>
                      </div>
                      <div className="space-y-2">
                        <label className="text-small font-medium text-text-secondary">Preço (R$)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.is_courtesy ? "0.00" : draft.preco}
                          onChange={(e) => updateDraft({ preco: e.target.value })}
                          disabled={draft.is_courtesy}
                          placeholder="0,00"
                          className="w-full bg-bg-secondary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-small font-medium text-text-secondary">Quantidade</label>
                        <input
                          type="number"
                          min="0"
                          value={draft.quantidade}
                          onChange={(e) => updateDraft({ quantidade: e.target.value })}
                          placeholder={draft.is_courtesy ? "Deixe em branco para sem limite" : "0"}
                          className="w-full bg-bg-secondary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-small font-medium text-text-secondary">Início das vendas</label>
                        <input
                          type="datetime-local"
                          value={draft.inicio}
                          onChange={(e) => updateDraft({ inicio: e.target.value })}
                          className="w-full bg-bg-secondary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-small font-medium text-text-secondary">Fim das vendas</label>
                        <input
                          type="datetime-local"
                          value={draft.fim}
                          onChange={(e) => updateDraft({ fim: e.target.value })}
                          className="w-full bg-bg-secondary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setDraft(null)}
                        className="px-4 py-2 border border-border-default rounded-radius-md font-semibold text-text-primary hover:bg-bg-secondary transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={saveLote}
                        className="px-4 py-2 bg-accent text-[#111111] rounded-radius-md font-semibold hover:bg-accent-hover transition-colors"
                      >
                        Salvar lote
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-md mx-auto space-y-4 pt-8">
                <div className="space-y-2">
                  <label className="text-small font-medium text-text-secondary">Preço do ingresso (R$)</label>
                  <input type="number" value={singlePrice} onChange={(e) => setSinglePrice(e.target.value)} placeholder="0,00" className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent" />
                </div>
                <div className="space-y-2">
                  <label className="text-small font-medium text-text-secondary">Quantidade total disponível</label>
                  <input type="number" value={singleQuantity} onChange={(e) => setSingleQuantity(e.target.value)} placeholder="0" className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent" />
                </div>
                <p className="text-small text-text-secondary italic text-center">Isso será tratado internamente como um lote único chamado 'Ingresso único'.</p>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8">
            <h2 className="text-heading-2">Revisão e publicação</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-bg-primary border border-border-subtle rounded-radius-md space-y-2">
                  <div className="text-micro font-bold text-text-disabled uppercase">Geral</div>
                  <div className="text-body font-bold">{name || "Nome não definido"}</div>
                  <div className="text-small text-text-secondary">
                    {date && time ? `${new Date(`${date}T${time}`).toLocaleString("pt-BR")}` : "Data pendente"}
                    {location ? ` · ${location}` : ""}
                  </div>
                </div>
                <div className="p-4 bg-bg-primary border border-border-subtle rounded-radius-md space-y-2">
                  <div className="text-micro font-bold text-text-disabled uppercase">Vendas</div>
                  <div className="text-body font-bold">{model === "lotes" ? "Modelo por lotes" : "Preço único"}</div>
                  <div className="text-small text-text-secondary">
                    {model === "lotes"
                      ? `${lotes.length} lote(s) configurado(s)`
                      : `R$ ${singlePrice || "0,00"} · ${singleQuantity || 0} ingressos`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-bg-primary border-t border-border-subtle p-4 z-50">
        <div className="max-w-4xl mx-auto flex justify-between px-4">
          <button 
            onClick={handleBack} 
            disabled={step === 1} 
            className="px-6 py-2 border border-border-default rounded-radius-md font-semibold text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-secondary transition-colors"
          >
            Voltar
          </button>
          <div className="flex gap-3">
            {step === 4 && (
              <button 
                onClick={() => handleSave("rascunho")}
                disabled={saving}
                className="px-6 py-2 border border-border-default rounded-radius-md font-semibold text-text-primary hover:bg-bg-secondary transition-colors"
              >
                Salvar rascunho
              </button>
            )}
            <button 
              onClick={step === 4 ? () => handleSave("publicado") : handleNext}
              disabled={saving} 
              className="px-8 py-2 bg-accent text-[#111111] rounded-radius-md font-semibold hover:bg-accent-hover transition-colors shadow-sm"
            >
              {saving ? "Salvando..." : step === 4 ? "Publicar evento" : "Continuar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

