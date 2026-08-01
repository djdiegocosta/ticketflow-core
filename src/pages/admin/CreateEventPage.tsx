import { useState } from "react";
import { ChevronLeft, ChevronRight, Layers, Tag, Upload, Calendar, Clock, MapPin, FastForward, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";

export function CreateEventPage() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handleNext = () => setStep((s) => Math.min(s + 1, 4));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const StepIndicator = ({ number, label }: { number: number; label: string }) => (
    <div className={cn("flex flex-col items-center gap-2", step === number ? "text-accent" : "text-text-disabled")}>
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold", step === number ? "bg-accent text-[#111111]" : "bg-bg-tertiary")}>
        {number}
      </div>
      <span className="text-small font-medium">{label}</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div className="flex justify-center gap-12 pt-4">
        {[ { n: 1, l: "Básico" }, { n: 2, l: "Modelo" }, { n: 3, l: "Vendas" }, { n: 4, l: "Revisão" } ].map(s => <StepIndicator key={s.n} number={s.n} label={s.l} />)}
      </div>

      <div className="bg-bg-secondary border border-border-default rounded-radius-lg p-8 shadow-sm">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-heading-1">Informações básicas</h2>
            <div className="space-y-2">
              <label className="text-small font-medium text-text-secondary">Nome do evento</label>
              <input type="text" className="w-full bg-bg-primary border border-border-default rounded-radius-sm p-2 outline-none focus:border-accent" />
            </div>
            {/* Additional inputs... */}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-heading-1 text-center">Como deseja vender?</h2>
            <div className="grid grid-cols-2 gap-6">
              <button onClick={handleNext} className="border-2 border-border-default hover:border-accent rounded-radius-lg p-6 text-left space-y-2 transition-all">
                <Layers className="w-8 h-8 text-accent" />
                <h3 className="text-heading-2">Trabalhar com lotes</h3>
                <p className="text-small text-text-secondary">Configure múltiplos lotes com preços e datas diferentes.</p>
              </button>
              <button onClick={handleNext} className="border-2 border-border-default hover:border-accent rounded-radius-lg p-6 text-left space-y-2 transition-all">
                <Tag className="w-8 h-8 text-accent" />
                <h3 className="text-heading-2">Preço único</h3>
                <p className="text-small text-text-secondary">Um único preço e quantidade para todo o evento.</p>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-heading-1">Configuração de vendas</h2>
            {/* Logic for Price / Lotes */}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-heading-1">Revisão e publicação</h2>
            {/* Summary cards */}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-bg-primary border-t border-border-subtle p-4 flex justify-between px-8">
        <button onClick={handleBack} disabled={step === 1} className="px-6 py-2 border border-border-default rounded-radius-md font-semibold text-text-primary">Voltar</button>
        <button onClick={handleNext} className="px-6 py-2 bg-accent text-[#111111] rounded-radius-md font-semibold">{step === 4 ? "Publicar evento" : "Continuar"}</button>
      </div>
    </div>
  );
}
