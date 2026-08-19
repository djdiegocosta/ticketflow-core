import React, { useState, useRef, useEffect } from "react";
import { ClipboardList, CheckCircle, Trash2, Check, RotateCcw, X, Loader2 } from "lucide-react";
import { ListPageHeader, PrimaryActionButton } from "@/components/admin/PrimaryActionButton";
import { MiniMetricCard, MiniMetricGrid } from "@/components/admin/MiniMetricCard";
import { SidePanel } from "@/components/admin/SidePanel";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useEvents } from "@/lib/events-queries";

interface Task {
  id: string;
  text: string;
  is_completed: boolean;
}

export function ChecklistPage() {
  const { organizationId } = useAuth();
  const { data: events = [] } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      const firstEvent = events[0];
      if (firstEvent) setSelectedEventId(firstEvent.id);
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    if (selectedEventId && organizationId) {
      fetchTasks();
    }
  }, [selectedEventId, organizationId]);

  const fetchTasks = async () => {
    if (!selectedEventId || !organizationId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("event_checklist_items")
        .select("*")
        .eq("event_id", selectedEventId)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Erro ao buscar tarefas:", error);
      toast.error("Erro ao carregar checklist");
    } finally {
      setIsLoading(false);
    }
  };

  const activeTasks = tasks.filter(t => !t.is_completed);
  const completedTasks = tasks.filter(t => t.is_completed);
  
  const completedCount = completedTasks.length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const handleAddTask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTaskText.trim() || !selectedEventId || !organizationId) return;

    try {
      const { data, error } = await supabase
        .from("event_checklist_items")
        .insert({
          event_id: selectedEventId,
          organization_id: organizationId,
          text: newTaskText.trim(),
          is_completed: false
        })
        .select()
        .single();

      if (error) throw error;
      
      setTasks([...tasks, data]);
      setNewTaskText("");
      toast.success("Tarefa adicionada");
      setIsPanelOpen(false);
    } catch (error) {
      toast.error("Erro ao adicionar tarefa");
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      const { error } = await supabase
        .from("event_checklist_items")
        .update({ 
          is_completed: !task.is_completed,
          completed_at: !task.is_completed ? new Date().toISOString() : null
        })
        .eq("id", task.id);

      if (error) throw error;
      
      setTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: !t.is_completed } : t));
    } catch (error) {
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const removeTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from("event_checklist_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setTasks(tasks.filter(t => t.id !== id));
      toast.info("Tarefa removida");
    } catch (error) {
      toast.error("Erro ao remover tarefa");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <ListPageHeader 
        title="Checklist do Evento" 
        action={
          <div className="flex gap-3">
            {events.length > 1 && (
              <select
                aria-label="Selecionar evento"
                className="border border-border-default bg-bg-secondary px-3 py-2 text-small outline-none focus:border-accent"
                value={selectedEventId || ""}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            )}
            <PrimaryActionButton onClick={() => setIsPanelOpen(true)}>
              Nova Tarefa
            </PrimaryActionButton>
          </div>
        }
      />

      <MiniMetricGrid>
        <MiniMetricCard 
          title="Total de Tarefas" 
          value={tasks.length} 
          icon={ClipboardList}
          iconColor="text-accent"
        />
        <MiniMetricCard 
          title="Concluídas" 
          headerRight={<CheckCircle className="w-4 h-4 text-success" />}
          gaugeValue={progress}
        >
          <div className="text-heading-1 text-text-primary">{completedCount} de {tasks.length}</div>
          <div className="mt-2 h-1 w-full bg-bg-tertiary overflow-hidden rounded-none">
            <div 
              className="h-full bg-success transition-all duration-500" 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </MiniMetricCard>
      </MiniMetricGrid>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : (
        <Tabs defaultValue="tarefas" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-border-subtle bg-transparent p-0 h-auto mb-6">
            <TabsTrigger 
              value="tarefas" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-6 py-3 text-heading-3 text-text-secondary data-[state=active]:text-text-primary transition-all"
            >
              Tarefas ({activeTasks.length})
            </TabsTrigger>
            <TabsTrigger 
              value="concluidas" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent px-6 py-3 text-heading-3 text-text-secondary data-[state=active]:text-text-primary transition-all"
            >
              Concluídas ({completedTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tarefas" className="space-y-6 outline-none">
            <div className="bg-bg-secondary border border-border-subtle p-6 space-y-4">
              {activeTasks.length === 0 ? (
                <div className="text-center py-12 text-text-secondary">
                  Nenhuma tarefa pendente.
                </div>
              ) : (
                activeTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between gap-4 p-4 border border-border-subtle hover:border-accent transition-colors group"
                  >
                    <span className="text-heading-3 text-text-primary truncate flex-1">
                      {task.text}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleTask(task)}
                        className="p-2 text-text-secondary hover:text-success transition-colors"
                        title="Concluir"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => removeTask(task.id)}
                        className="p-2 text-text-secondary hover:text-error transition-colors"
                        title="Remover"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="concluidas" className="outline-none">
            <div className="bg-bg-secondary border border-border-subtle p-6 space-y-4">
              {completedTasks.length === 0 ? (
                <div className="text-center py-12 text-text-secondary">
                  Nenhuma tarefa concluída ainda.
                </div>
              ) : (
                completedTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between gap-4 p-4 border border-border-subtle hover:border-accent transition-colors group"
                  >
                    <span className="text-heading-3 text-text-disabled truncate flex-1">
                      {task.text}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleTask(task)}
                        className="p-2 text-text-secondary hover:text-accent transition-colors"
                        title="Restaurar"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => removeTask(task.id)}
                        className="p-2 text-text-secondary hover:text-error transition-colors"
                        title="Remover"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <SidePanel
        open={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setNewTaskText("");
        }}
        title="Nova Tarefa"
      >
        <form onSubmit={handleAddTask} className="space-y-6">
          <div className="space-y-2">
            <label className="text-small font-medium text-text-secondary">Descrição da tarefa</label>
            <Input 
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Ex: Checar iluminação do palco"
              className="rounded-none border-border-default focus-visible:ring-accent"
              autoFocus
              ref={inputRef}
            />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setIsPanelOpen(false)}
              className="flex-1 px-4 py-2.5 text-body font-medium text-text-primary hover:bg-bg-tertiary transition-colors border border-border-subtle rounded-none"
            >
              Cancelar
            </button>
            <PrimaryActionButton type="submit" className="flex-1">
              Salvar tarefa
            </PrimaryActionButton>
          </div>
        </form>
      </SidePanel>
    </div>
  );
}
