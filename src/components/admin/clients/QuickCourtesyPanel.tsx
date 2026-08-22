import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEvents } from "@/lib/events-queries";
import { formatName, isFullName } from "@/lib/form-format";
import {
  SidePanel,
  PanelCancelButton,
  PanelPrimaryButton,
  panelInputClass,
  panelLabelClass,
} from "@/components/admin/SidePanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface QuickCourtesyPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  onSuccess?: () => void;
}

export function QuickCourtesyPanel({
  open,
  onOpenChange,
  customerId,
  customerName,
  onSuccess,
}: QuickCourtesyPanelProps) {
  const { data: events = [] } = useEvents();
  const [selectedEvent, setSelectedEvent] = React.useState<string>("");
  const [selectedBatch, setSelectedBatch] = React.useState<string>("");
  const [batches, setBatches] = React.useState<any[]>([]);
  const [participantName, setParticipantName] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Reset participant name when panel opens
  React.useEffect(() => {
    if (open) {
      setParticipantName(customerName);
    }
  }, [open, customerName]);

  // Fetch courtesy batches when event changes
  React.useEffect(() => {
    if (selectedEvent) {
      supabase
        .from("ticket_batches")
        .select("*")
        .eq("event_id", selectedEvent)
        .eq("is_courtesy", true)
        .order("created_at")
        .then(({ data }) => {
          setBatches(data || []);
          if (data && data.length > 0 && data[0]) {
            setSelectedBatch(data[0].id as string);
          } else {
            setSelectedBatch("");
          }
        });
    } else {
      setBatches([]);
      setSelectedBatch("");
    }
  }, [selectedEvent]);

  const handleSubmit = async () => {
    if (!selectedEvent || !selectedBatch) {
      toast.error("Selecione um evento e um lote de cortesia.");
      return;
    }

    const formattedName = formatName(participantName);
    if (!isFullName(formattedName)) {
      toast.error("Nome do participante inválido. Mínimo 2 palavras.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc("create_courtesy", {
        _event_id: selectedEvent,
        _batch_id: selectedBatch,
        _participant_names: [formattedName],
        _customer_id: customerId,
      });

      if (error) throw error;

      toast.success("Cortesia emitida com sucesso!");
      onOpenChange(false);
      onSuccess?.();
      
      // Reset local state
      setSelectedEvent("");
      setSelectedBatch("");
    } catch (err: any) {
      toast.error("Erro ao emitir cortesia: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasNoCourtesyBatches = selectedEvent && batches.length === 0;

  return (
    <SidePanel
      open={open}
      onClose={() => onOpenChange(false)}
      title="Nova Cortesia Rápida"
      footer={
        <>
          <PanelCancelButton onClick={() => onOpenChange(false)} />
          <PanelPrimaryButton
            disabled={!selectedEvent || !selectedBatch || !participantName.trim() || loading}
            onClick={handleSubmit}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Emitindo...
              </>
            ) : (
              "Emitir cortesia"
            )}
          </PanelPrimaryButton>
        </>
      }
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <label className={panelLabelClass}>Evento</label>
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o evento" />
            </SelectTrigger>
            <SelectContent>
              {events.map((e: any) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedEvent && (
          <div className="space-y-2">
            <label className={panelLabelClass}>Lote de Cortesia</label>
            {hasNoCourtesyBatches ? (
              <p className="text-small text-warning bg-warning-muted p-3 rounded-[var(--radius-sm)] border border-warning/20">
                Este evento ainda não tem um lote de Cortesias. Crie um lote marcado como Cortesia na edição do evento primeiro.
              </p>
            ) : (
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o lote" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className={panelLabelClass}>Nome do Participante</label>
          <Input
            placeholder="Nome Sobrenome"
            className={panelInputClass}
            value={participantName}
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              target.value = formatName(target.value);
              setParticipantName(target.value);
            }}
          />
        </div>
      </div>
    </SidePanel>
  );
}
