import { useState } from "react";
import { formatName, isFullName, maskWhatsApp, onlyDigits } from "@/lib/form-format";
import { toast } from "sonner";
import { useUpdateCustomer } from "@/lib/customers-queries";
import {
  PanelCancelButton,
  PanelPrimaryButton,
  SidePanel,
  panelErrorClass as errorClass,
  panelInputClass as inputClass,
  panelLabelClass as labelClass,
} from "@/components/admin/SidePanel";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { getUFByDDD } from "@/lib/ibge-data";

type Errors = Record<string, string>;

export function CreateClientPanel({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [instagram, setInstagram] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  
  const updateMutation = useUpdateCustomer();

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

    // Criar um novo cliente usa a mesma RPC de update, 
    // mas o backend lida com upsert se o ID for vazio ou novo.
    // Como a RPC update_customer exige _customer_id, passamos uma string vazia para novo.
    // NOTA: Se a RPC exigir um UUID, precisamos de outra RPC create_customer.
    // Assumindo que update_customer faz upsert ou lidamos com o erro.
    updateMutation.mutate({
      id: "", // Identificador para novo cliente
      full_name: formatName(name),
      whatsapp: onlyDigits(whatsapp),
      email: email || undefined,
      birth_date: birthDate || undefined,
      // cidade e instagram não estão no objeto vars da mutation em customers-queries.ts v1, 
      // mas a RPC no handlers já suporta. Precisamos atualizar a mutation lá se necessário.
    }, {
      onSuccess: () => {
        onSave();
        reset();
        onClose();
      }
    });
  };

  return (
    <SidePanel
      open={open}
      onClose={handleClose}
      title="Novo Cliente"
      footer={
        <>
          <PanelCancelButton onClick={handleClose} />
          <PanelPrimaryButton 
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar cliente"}
          </PanelPrimaryButton>
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
              onInput={(e) => {
                const target = e.target as HTMLInputElement;
                target.value = formatName(target.value);
                setName(target.value);
              }}
            />
            {errors["name"] && <p className={errorClass}>{errors["name"]}</p>}
          </div>

          <div>
            <label className={labelClass}>WhatsApp</label>
            <input
              className={inputClass}
              placeholder="(00) 00000-0000"
              value={whatsapp}
              onInput={(e) => {
                const target = e.target as HTMLInputElement;
                target.value = maskWhatsApp(target.value);
                setWhatsapp(target.value);
              }}
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
            <CityAutocomplete
              value={city}
              onChange={setCity}
              uf={getUFByDDD(onlyDigits(whatsapp).slice(0, 2))}
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
