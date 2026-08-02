import { useState } from "react";
import { formatName, isFullName, maskWhatsApp, onlyDigits } from "@/lib/form-format";
import { toast } from "sonner";
import type { Client } from "@/lib/clients-data";
import {
  PanelCancelButton,
  PanelPrimaryButton,
  SidePanel,
  panelErrorClass as errorClass,
  panelInputClass as inputClass,
  panelLabelClass as labelClass,
} from "@/components/admin/SidePanel";

type Errors = Record<string, string>;

export function CreateClientPanel({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (client: Client) => void;
}) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [instagram, setInstagram] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const handleClose = () => {
    const hasData = name || whatsapp || email || city || birthDate || instagram;
    if (hasData) {
      if (confirm("Deseja descartar as informações preenchidas?")) {
        reset();
        onClose();
      }
    } else {
      reset();
      onClose();
    }
  };

  const reset = () => {
    setName("");
    setWhatsapp("");
    setEmail("");
    setCity("");
    setBirthDate("");
    setInstagram("");
    setErrors({});
  };

  const validate = () => {
    const next: Errors = {};
    if (!name.trim()) {
      next["name"] = "Nome completo obrigatório";
    } else if (!isFullName(name)) {
      next["name"] = "Informe nome e sobrenome (mínimo 2 palavras)";
    }

    if (!whatsapp.trim()) {
      next["whatsapp"] = "WhatsApp obrigatório";
    } else if (onlyDigits(whatsapp).length < 11) {
      next["whatsapp"] = "WhatsApp deve ter 11 dígitos";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const newClient: Client = {
      id: `c${Date.now()}`,
      name: formatName(name),
      whatsapp,
      age: birthDate ? calculateAge(birthDate) : 0,
      totalEvents: 0,
      totalTickets: 0,
      totalSpent: 0,
      lastEvent: "Nenhum",
      lastPurchaseAt: "N/A",
      registeredAt: new Date().toLocaleDateString("pt-BR"),
    };

    if (email) newClient.email = email;

    onSave(newClient);
    toast.success("Cliente cadastrado com sucesso");
    reset();
    onClose();
  };

  const calculateAge = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return 0;
    const birth = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <SidePanel
      open={open}
      onClose={handleClose}
      title="Novo Cliente"
      footer={
        <>
          <PanelCancelButton onClick={handleClose} />
          <PanelPrimaryButton onClick={handleSubmit}>Salvar cliente</PanelPrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
          <div>
            <label className={labelClass}>Nome completo</label>
            <input
              className={inputClass}
              placeholder="Nome Sobrenome"
              value={name}
              onChange={(e) => setName(formatName(e.target.value))}
            />
            {errors["name"] && <p className={errorClass}>{errors["name"]}</p>}
          </div>

          <div>
            <label className={labelClass}>WhatsApp</label>
            <input
              className={inputClass}
              placeholder="(00) 00000-0000"
              value={whatsapp}
              onChange={(e) => setWhatsapp(maskWhatsApp(e.target.value))}
            />
            {errors["whatsapp"] && <p className={errorClass}>{errors["whatsapp"]}</p>}
          </div>

          <div>
            <label className={labelClass}>E-mail (opcional)</label>
            <input
              type="email"
              className={inputClass}
              placeholder="exemplo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Cidade (opcional)</label>
            <input
              className={inputClass}
              placeholder="Ex: Uberlândia - MG"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Data de nascimento (opcional)</label>
            <input
              type="date"
              className={inputClass}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Instagram (opcional)</label>
            <input
              className={inputClass}
              placeholder="@usuario"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
          </div>
      </div>
    </SidePanel>
  );
}
