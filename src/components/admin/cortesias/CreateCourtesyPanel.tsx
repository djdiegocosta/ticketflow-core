import * as React from "react";
import { Upload, FileText, Keyboard, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  PanelCancelButton,
  PanelPrimaryButton,
  SidePanel,
} from "@/components/admin/SidePanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatName, isFullName } from "@/lib/form-format";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEvents } from "@/lib/events-queries";
import { Loader2 } from "lucide-react";

interface CreateCourtesyPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (count: number) => void;
}

interface ParticipantEntry {
  id: string;
  name: string;
  isValid: boolean;
}

export function CreateCourtesyPanel({
  open,
  onOpenChange,
  onSuccess,
}: CreateCourtesyPanelProps) {
  const { data: events = [] } = useEvents();
  const [selectedEvent, setSelectedEvent] = React.useState<string>("");
  const [selectedBatch, setSelectedBatch] = React.useState<string>("");
  const [batches, setBatches] = React.useState<any[]>([]);
  const [activeTab, setActiveTab] = React.useState("type");
  const [singleName, setSingleName] = React.useState("");
  const [bulkText, setBulkText] = React.useState("");
  const [participants, setParticipants] = React.useState<ParticipantEntry[]>([]);
  const [isDirty, setIsDirty] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (selectedEvent) {
      supabase.from("ticket_batches").select("*").eq("event_id", selectedEvent).order("created_at")
        .then(({ data }) => {
          setBatches(data || []);
          if (data && data.length > 0) setSelectedBatch(data[0]?.id || "");
        });
    }
  }, [selectedEvent]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const addParticipant = (name: string) => {
    if (!name.trim()) return;
    
    const formatted = formatName(name.trim());
    const valid = isFullName(formatted);
    
    const newEntry: ParticipantEntry = {
      id: Math.random().toString(36).substr(2, 9),
      name: formatted,
      isValid: valid,
    };
    
    setParticipants(prev => {
      const updated = [...prev, newEntry].sort((a, b) => a.name.localeCompare(b.name));
      return updated;
    });
    setIsDirty(true);
  };

  const handleSingleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!isFullName(singleName)) {
        toast.error("Nome inválido. Mínimo 2 palavras.");
        return;
      }
      addParticipant(singleName);
      setSingleName("");
    }
  };

  const processBulkText = () => {
    const lines = bulkText.split(/\r?\n/).filter(line => line.trim().length > 0);
    lines.forEach(line => addParticipant(line));
    setBulkText("");
    setActiveTab("type");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
      lines.forEach(line => addParticipant(line));
      toast.success(`${lines.length} nomes importados.`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const updateParticipantName = (id: string, newName: string) => {
    setParticipants(prev => prev.map(p => {
      if (p.id === id) {
        const formatted = formatName(newName);
        return {
          ...p,
          name: formatted,
          isValid: isFullName(formatted)
        };
      }
      return p;
    }));
  };

  const validCount = participants.filter(p => p.isValid).length;

  const handleSubmit = async () => {
    if (!selectedEvent || !selectedBatch) {
      toast.error("Selecione um evento e um lote primeiro.");
      return;
    }
    if (validCount === 0) {
      toast.error("Adicione pelo menos um nome válido.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('create_courtesy', {
        _event_id: selectedEvent,
        _batch_id: selectedBatch,
        _participant_names: participants.filter(p => p.isValid).map(p => p.name)
      });

      if (error) throw error;

      onSuccess(validCount);
      onOpenChange(false);
      // Reset state
      setParticipants([]);
      setSelectedEvent("");
      setSelectedBatch("");
      setIsDirty(false);
    } catch (err: any) {
      toast.error("Erro ao emitir cortesias: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open && isDirty && participants.length > 0) {
      if (confirm("Existem dados preenchidos. Deseja realmente sair?")) {
        onOpenChange(false);
        setParticipants([]);
        setSelectedEvent("");
        setIsDirty(false);
      }
    } else {
      onOpenChange(open);
    }
  };

  return (
    <SidePanel
      open={open}
      onClose={() => handleClose(false)}
      title="Nova Cortesia"
      footer={
        <>
          <PanelCancelButton onClick={() => handleClose(false)} />
          <PanelPrimaryButton
            disabled={!selectedEvent || !selectedBatch || validCount === 0 || loading}
            onClick={handleSubmit}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Emitindo...
              </>
            ) : (
              `Emitir ${validCount} cortesias`
            )}
          </PanelPrimaryButton>
        </>
      }
    >
          <div className="space-y-6">
            {/* Event Selection */}
            <div className="space-y-2">
              <label className="text-small font-medium text-[var(--text-secondary)]">
                Evento
              </label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o evento" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEvent && (
              <div className="space-y-2">
                <label className="text-small font-medium text-[var(--text-secondary)]">
                  Lote da Cortesia
                </label>
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o lote" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className={!selectedEvent ? "pointer-events-none opacity-50" : ""}>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="type" className="flex items-center gap-2 text-small">
                    <Keyboard className="h-4 w-4" /> Digitar
                  </TabsTrigger>
                  <TabsTrigger value="paste" className="flex items-center gap-2 text-small">
                    <FileText className="h-4 w-4" /> Colar lista
                  </TabsTrigger>
                  <TabsTrigger value="import" className="flex items-center gap-2 text-small">
                    <Upload className="h-4 w-4" /> Importar
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="type" className="pt-4">
                  <div className="space-y-2">
                    <label className="text-small font-medium text-[var(--text-secondary)]">
                      Nome do convidado
                    </label>
                    <Input
                      placeholder="Ex: João Silva (Pressione Enter)"
                      value={singleName}
                      onInput={(e) => {
                        const target = e.target as HTMLInputElement;
                        target.value = formatName(target.value);
                        setSingleName(target.value);
                      }}
                      onKeyDown={handleSingleNameKeyDown}
                      autoFocus
                    />

                    {!isFullName(singleName) && singleName.trim() !== "" && (
                      <p className="flex items-center gap-1 text-[10px] text-error">
                        <AlertCircle className="h-3 w-3" />
                        Mínimo 2 palavras
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="paste" className="pt-4">
                  <div className="space-y-2">
                    <label className="text-small font-medium text-[var(--text-secondary)]">
                      Cole a lista (um nome por linha)
                    </label>
                    <Textarea
                      placeholder="Nome Sobrenome&#10;Outro Nome Sobrenome"
                      className="min-h-[120px]"
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                    />
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={processBulkText}
                      disabled={!bulkText.trim()}
                    >
                      Processar lista
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="import" className="pt-4">
                  <div 
                    className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-subtle)] p-8 text-center"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mb-2 h-8 w-8 text-[var(--text-tertiary)]" />
                    <p className="text-small text-[var(--text-secondary)]">
                      Arraste ou clique para selecionar arquivo .txt
                    </p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".txt"
                      onChange={handleFileUpload}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Participants List */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-body font-semibold">{participants.length} nomes adicionados</h3>
                {participants.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-[var(--text-tertiary)]"
                    onClick={() => setParticipants([])}
                  >
                    Limpar tudo
                  </Button>
                )}
              </div>

              <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)]">
                {participants.length === 0 ? (
                  <div className="py-8 text-center text-small text-[var(--text-tertiary)]">
                    Nenhum nome adicionado ainda.
                  </div>
                ) : (
                  participants.map((p) => (
                    <div key={p.id} className="group flex items-center justify-between p-3 hover:bg-[var(--bg-tertiary)]">
                      <div className="flex flex-1 items-center gap-2">
                        {!p.isValid && (
                          <AlertCircle className="h-4 w-4 text-error" />
                        )}
                        <input
                          className={[
                            "w-full bg-transparent text-body outline-none",
                            !p.isValid && "text-error"
                          ].join(" ")}
                          value={p.name}
                          onInput={(e) => {
                            const target = e.target as HTMLInputElement;
                            target.value = formatName(target.value);
                            updateParticipantName(p.id, target.value);
                          }}
                        />

                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[var(--text-tertiary)] opacity-0 hover:text-error group-hover:opacity-100"
                        onClick={() => removeParticipant(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
    </SidePanel>
  );
}
