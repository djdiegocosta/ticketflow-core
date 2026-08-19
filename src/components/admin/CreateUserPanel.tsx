import { useState } from "react";
import { Shield, Users, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatName } from "@/lib/form-format";
import { useInviteUser } from "@/lib/users-queries";
import {
  PanelCancelButton,
  PanelDiscardDialog,
  PanelPrimaryButton,
  SidePanel,
  panelInputClass,
  panelLabelClass,
} from "@/components/admin/SidePanel";

type AppRole = "admin" | "colaborador" | "operador_checkin";

interface CreateUserPanelProps {
  open: boolean;
  onClose: () => void;
  onInvite: () => void;
}

export function CreateUserPanel({ open, onClose, onInvite }: CreateUserPanelProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("colaborador");
  const [isClosing, setIsClosing] = useState(false);
  const inviteMutation = useInviteUser();

  const hasData = email.length > 0;

  const handleClose = () => {
    if (hasData) {
      setIsClosing(true);
    } else {
      onClose();
    }
  };

  const resetForm = () => {
    setEmail("");
    setRole("colaborador");
    setIsClosing(false);
  };

  const handleSubmit = () => {
    if (!email) {
      toast.error("Preencha o e-mail");
      return;
    }

    inviteMutation.mutate({ email, role }, {
      onSuccess: () => {
        onInvite();
        resetForm();
      }
    });
  };

  const roleOptions: { value: AppRole; label: string; icon: typeof Shield; description: string }[] = [
    { value: "admin", label: "Admin", icon: Shield, description: "Acesso completo a todas as áreas do sistema." },
    {
      value: "colaborador",
      label: "Colaborador",
      icon: Users,
      description: "Acesso a Vendas (somente leitura) e Check-in.",
    },
    {
      value: "operador_checkin",
      label: "Operador de Check-in",
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
            <PanelPrimaryButton 
              onClick={handleSubmit}
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending ? "Enviando..." : "Enviar convite"}
            </PanelPrimaryButton>
          </>
        }
      >
        <div className="space-y-5">
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
              {roleOptions.map(({ value, label, icon: Icon, description }) => (
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
                    <p className="text-body font-semibold text-text-primary">{label}</p>
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
        description="Você preencheu o e-mail. Se sair agora, o convite não será enviado."
        onKeepEditing={() => setIsClosing(false)}
        onDiscard={() => {
          resetForm();
          onClose();
        }}
      />
    </>
  );
}
