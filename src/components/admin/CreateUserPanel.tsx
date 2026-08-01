import { useState, useEffect } from "react";
import { X, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserRoleType } from "@/lib/users-data";

interface CreateUserPanelProps {
  open: boolean;
  onClose: () => void;
  onInvite: (user: { name: string; email: string; role: UserRoleType }) => void;
}

export function CreateUserPanel({ open, onClose, onInvite }: CreateUserPanelProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRoleType>("Colaborador");
  const [isClosing, setIsClosing] = useState(false);

  const hasData = name.length > 0 || email.length > 0;

  const handleClose = () => {
    if (hasData) {
      setIsClosing(true);
    } else {
      onClose();
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setRole("Colaborador");
    setIsClosing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      toast.error("Preencha todos os campos");
      return;
    }
    onInvite({ name, email, role });
    resetForm();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden bg-[rgba(0,0,0,0.45)]">
      <div 
        className="h-full w-full max-w-[480px] border-l border-border-subtle bg-bg-primary shadow-[var(--shadow-lg)] animate-in slide-in-from-right duration-300"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-subtle p-6">
            <h2 className="text-heading-2 text-text-primary">Convidar Usuário</h2>
            <button
              onClick={handleClose}
              className="p-1 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
            <div className="space-y-4">
              <div>
                <label className="text-small font-medium text-text-secondary block mb-1.5">
                  Nome completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Oliveira"
                  className="w-full rounded-none border border-border-default bg-bg-secondary px-3 py-2.5 text-body text-text-primary outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-small font-medium text-text-secondary block mb-1.5">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@ticketflow.com"
                  className="w-full rounded-none border border-border-default bg-bg-secondary px-3 py-2.5 text-body text-text-primary outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-3">
                <label className="text-small font-medium text-text-secondary block">
                  Papel no sistema
                </label>
                
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("Admin")}
                    className={cn(
                      "flex items-start gap-4 border p-4 text-left transition-all",
                      role === "Admin"
                        ? "border-accent bg-accent-muted ring-1 ring-accent"
                        : "border-border-default bg-bg-secondary hover:border-border-strong"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 rounded-full p-2",
                      role === "Admin" ? "bg-accent text-[#111]" : "bg-bg-tertiary text-text-secondary"
                    )}>
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <p className={cn(
                        "text-body font-semibold",
                        role === "Admin" ? "text-text-primary" : "text-text-primary"
                      )}>Admin</p>
                      <p className="text-small text-text-secondary mt-0.5">
                        Acesso completo a todas as áreas do sistema.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("Colaborador")}
                    className={cn(
                      "flex items-start gap-4 border p-4 text-left transition-all",
                      role === "Colaborador"
                        ? "border-accent bg-accent-muted ring-1 ring-accent"
                        : "border-border-default bg-bg-secondary hover:border-border-strong"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 rounded-full p-2",
                      role === "Colaborador" ? "bg-accent text-[#111]" : "bg-bg-tertiary text-text-secondary"
                    )}>
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className={cn(
                        "text-body font-semibold",
                        role === "Colaborador" ? "text-text-primary" : "text-text-primary"
                      )}>Colaborador</p>
                      <p className="text-small text-text-secondary mt-0.5">
                        Acesso a Vendas (somente leitura) e Check-in.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="border-t border-border-subtle p-6">
            <button
              type="submit"
              onClick={handleSubmit}
              className="w-full bg-accent py-3 text-body font-bold text-[#111] hover:bg-accent-hover transition-colors"
            >
              Enviar convite
            </button>
          </div>
        </div>

        {/* Confirmation Modal */}
        {isClosing && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(0,0,0,0.6)] p-6">
            <div className="w-full max-w-[400px] border border-border-subtle bg-bg-primary p-6 shadow-[var(--shadow-lg)] animate-in zoom-in-95 duration-200">
              <h3 className="text-heading-2 text-text-primary">Descartar convite?</h3>
              <p className="mt-2 text-body text-text-secondary">
                Você preencheu alguns dados. Se sair agora, o convite não será enviado.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setIsClosing(false)}
                  className="px-4 py-2 text-body text-text-secondary hover:text-text-primary transition-colors"
                >
                  Continuar editando
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    onClose();
                  }}
                  className="bg-error px-4 py-2 text-body font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
