import React, { useState, useRef } from "react";
import { ClipboardList, CheckCircle, Trash2, Check, RotateCcw, X } from "lucide-react";
import { ListPageHeader, PrimaryActionButton } from "@/components/admin/PrimaryActionButton";
import { MiniMetricCard, MiniMetricGrid } from "@/components/admin/MiniMetricCard";
import { SidePanel } from "@/components/admin/SidePanel";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

const INITIAL_TASKS: Task[] = [
  { id: "1", text: "Checar sistema de som e microfones", completed: true },
  { id: "2", text: "Validar lista de convidados/cortesias", completed: true },
  { id: "3", text: "Realizar briefing com equipe de segurança", completed: true },
  { id: "4", text: "Conferir estoque de bebidas no bar", completed: false },
  { id: "5", text: "Testar leitores de QR Code no check-in", completed: false },
  { id: "6", text: "Verificar iluminação da pista e palco", completed: false },
  { id: "7", text: "Posicionar sinalização de saídas de emergência", completed: false },
  { id: "8", text: "Confirmar horário de chegada dos artistas", completed: false },
];

export function ChecklistPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  
  const completedCount = completedTasks.length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const handleAddTask = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      text: newTaskText.trim(),
      completed: false,
    };

    setTasks([...tasks, newTask]);
    setNewTaskText("");
    toast.success("Tarefa adicionada com sucesso");
    
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    toast.info("Tarefa removida");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <ListPageHeader 
        title="Checklist do Evento" 
        action={
          <PrimaryActionButton onClick={() => setIsPanelOpen(true)}>
            Nova Tarefa
          </PrimaryActionButton>
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
          {/* Remote add task field removed as per requirements - using only the + Nova Tarefa button */}

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
                      onClick={() => toggleTask(task.id)}
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
                      onClick={() => toggleTask(task.id)}
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

      <SidePanel
        open={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setNewTaskText("");
        }}
        title="Nova Tarefa"
      >
        <form onSubmit={(e) => { handleAddTask(e); setIsPanelOpen(false); }} className="space-y-6">
          <div className="space-y-2">
            <label className="text-small font-medium text-text-secondary">Descrição da tarefa</label>
            <Input 
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Ex: Checar iluminação do palco"
              className="rounded-none border-border-default focus-visible:ring-accent"
              autoFocus
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
