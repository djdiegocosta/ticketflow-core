import { useState } from "react";
import { Shield, Users, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { UserRoleType } from "@/lib/users-data";
import {
  PanelCancelButton,
  PanelDiscardDialog,
  PanelPrimaryButton,
  SidePanel,
  panelInputClass,
  panelLabelClass,
} from "@/components/admin/SidePanel";

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

  const handleSubmit = () => {
    if (!name || !email) {
      toast.error("Preencha todos os campos");
      return;
    }
    onInvite({ name, email, role });
    resetForm();
    onClose();
  };

  const roleOptions: { value: UserRoleType; icon: typeof Shield; description: string }[] = [
    { value: "Admin", icon: Shield, description: "Acesso completo a todas as áreas do sistema." },
    {
      value: "Colaborador",
      icon: Users,
      description: "Acesso a Vendas (somente leitura) e Check-in.",
    },
    {
      value: "Operador de Check-in",
      icon: ShieldCheck,
      description: "Acesso exclusivo ao Check-in — nenhuma outra área do sistema.",
    },
  ];

  return (
    <>
      <SidePanel
        open={open}
        onClose={handleClose}
        title="Convidar Usuário"
        footer={
          <>
            <PanelCancelButton onClick={handleClose} />
            <PanelPrimaryButton onClick={handleSubmit}>Enviar convite</PanelPrimaryButton>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className={panelLabelClass}>Nome completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Carlos Eduardo Oliveira"
              className={panelInputClass}
            />
          </div>

          <div>
            <label className={panelLabelClass}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@ticketflow.com"
              className={panelInputClass}
            />
          </div>

          <div>
            <label className={panelLabelClass}>Papel no sistema</label>
            <div className="grid grid-cols-1 gap-3">
              {roleOptions.map(({ value, icon: Icon, description }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className={cn(
                    "flex items-start gap-4 border p-4 text-left transition-all",
                    role === value
                      ? "border-accent bg-accent-muted ring-1 ring-accent"
                      : "border-border-default bg-bg-secondary hover:border-accent",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 rounded-full p-2",
                      role === value
                        ? "bg-accent text-[#111111]"
                        : "bg-bg-tertiary text-text-secondary",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-body font-semibold text-text-primary">{value}</p>
                    <p className="mt-0.5 text-small text-text-secondary">{description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SidePanel>

      <PanelDiscardDialog
        open={isClosing}
        title="Descartar convite?"
        description="Você preencheu alguns dados. Se sair agora, o convite não será enviado."
        onKeepEditing={() => setIsClosing(false)}
        onDiscard={() => {
          resetForm();
          onClose();
        }}
      />
    </>
  );
}