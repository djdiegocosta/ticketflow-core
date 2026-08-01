import { useState } from "react";
import { ChevronLeft, ChevronRight, Layers, Tag, Upload, Calendar, Clock, MapPin, FastForward, CheckCircle2, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";

export function EditEventPage() {
  const { id } = useParams({ from: '/admin/eventos/$id' });
  const [step, setStep] = useState(1);
  const [model, setModel] = useState<"lotes" | "unico">("lotes");
  const navigate = useNavigate();

  const handleNext = () => setStep((s) => Math.min(s + 1, 4));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));
  const handleSave = () => {
    toast.success("Alterações salvas com sucesso!");
    navigate({ to: "/admin/eventos" });
  };

  const StepIndicator = ({ number, label }: { number: number; label: string }) => (
    <button 
      onClick={() => setStep(number)}
      className={cn("flex flex-col items-center gap-2 transition-all", step === number ? "text-accent" : "text-text-disabled hover:text-text-secondary")}
    >
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all", step === number ? "bg-accent text-[#111111]" : "bg-bg-tertiary")}>
        {number}
      </div>
      <span className="text-small font-medium">{label}</span>
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-1 text-text-primary">Editar Evento</h1>
          <p className="text-small text-text-secondary">ID: {id} • Status: <span className="text-success font-bold">Publicado</span></p>
        </div>
        
        <button 
          onClick={() => {
            if(confirm("Tem certeza que deseja virar para o próximo lote agora? Esta ação não pode ser desfeita.")) {
              toast.success("Lote alterado com sucesso!");
            }
          }}
          className="inline-flex items-center gap-2 bg-bg-secondary border border-accent text-accent px-4 py-2 rounded-radius-md font-semibold hover:bg-accent-muted transition-colors"
        >
          <FastForward className="w-4 h-4" />
          Virada Expressa de Lote
        </button>
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
                <input type="text" defaultValue="Festa de Verão" className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-small font-medium text-text-secondary">Descrição</label>
                <textarea rows={4} className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent" defaultValue="O maior evento do verão chegou!"></textarea>
              </div>
              <div className="space-y-2">
                <label className="text-small font-medium text-text-secondary">Data</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-text-disabled" />
                  <input type="date" className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 pl-10 outline-none focus:border-accent" defaultValue="2026-08-15" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-small font-medium text-text-secondary">Horário</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 w-4 h-4 text-text-disabled" />
                  <input type="time" className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 pl-10 outline-none focus:border-accent" defaultValue="22:00" />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 text-center">
            <h2 className="text-heading-2">Modelo de venda</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <button 
                onClick={() => setModel("lotes")}
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
                onClick={() => setModel("unico")}
                className={cn(
                  "border-2 rounded-radius-lg p-8 text-left space-y-3 transition-all",
                  model === "unico" ? "border-accent bg-accent-muted" : "border-border-default hover:border-accent bg-bg-primary"
                )}
              >
                <Tag className={cn("w-10 h-10", model === "unico" ? "text-accent-text" : "text-text-disabled")} />
                <h3 className="text-heading-2 font-bold">Preço único</h3>
                <p className="text-small text-text-secondary">Um único preço e quantidade para todo o evento.</p>
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
                  <span className="text-small font-medium text-text-secondary">Lotes configurados</span>
                  <button className="text-small text-accent font-bold flex items-center gap-1 hover:underline">
                    <Plus className="w-4 h-4" /> Adicionar lote
                  </button>
                </div>
                <div className="space-y-3">
                  {[1, 2].map(l => (
                    <div key={l} className="flex items-center justify-between p-4 bg-bg-primary border border-border-subtle rounded-radius-md">
                      <div>
                        <div className="text-body font-bold">{l}º Lote</div>
                        <div className="text-small text-text-secondary">R$ {l * 90},00 • 100 unidades</div>
                      </div>
                      <button className="text-error hover:bg-error/10 p-2 rounded-full transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-md mx-auto space-y-4 pt-8">
                <div className="space-y-2">
                  <label className="text-small font-medium text-text-secondary">Preço do ingresso (R$)</label>
                  <input type="number" className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent" defaultValue="90" />
                </div>
                <div className="space-y-2">
                  <label className="text-small font-medium text-text-secondary">Quantidade total</label>
                  <input type="number" className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent" defaultValue="200" />
                </div>
                <p className="text-small text-text-secondary italic text-center">Isso será tratado internamente como um lote único chamado 'Ingresso único'.</p>
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
                <div className="text-body font-bold">Festa de Verão</div>
                <div className="text-small text-text-secondary">Praia Clube • 15/08 às 22:00</div>
              </div>
              <div className="p-4 bg-bg-primary border border-border-subtle rounded-radius-md space-y-2">
                <div className="text-micro font-bold text-text-disabled uppercase">Vendas</div>
                <div className="text-body font-bold">{model === "lotes" ? "Modelo por lotes" : "Preço único"}</div>
                <div className="text-small text-text-secondary">{model === "lotes" ? "2 lotes ativos" : "R$ 90,00 • 200 ingressos"}</div>
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
          <button 
            onClick={step === 4 ? handleSave : handleNext} 
            className="px-8 py-2 bg-accent text-[#111111] rounded-radius-md font-semibold hover:bg-accent-hover transition-colors shadow-sm"
          >
            {step === 4 ? "Salvar alterações" : "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}
