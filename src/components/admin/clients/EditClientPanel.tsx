import { useEffect, useState } from "react";
import { formatName, isFullName, maskWhatsApp, onlyDigits } from "@/lib/form-format";
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

type EditableClient = {
  id: string;
  full_name: string;
  whatsapp: string;
  email: string | null;
  cidade: string | null;
  data_nascimento: string | null;
  instagram: string | null;
  sexo: string | null;
};

/**
 * Painel de correção de cadastro pelo admin — para casos como e-mail
 * digitado errado ou ano de nascimento incorreto. A RPC update_customer já
 * confere que quem está editando é admin da mesma organização.
 */
export function EditClientPanel({
  open,
  onClose,
  onSave,
  client,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  client: EditableClient | null;
}) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [instagram, setInstagram] = useState("");
  const [sexo, setSexo] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const updateMutation = useUpdateCustomer();

  // Preenche o formulário com os dados atuais sempre que um cliente diferente é aberto
  useEffect(() => {
    if (client && open) {
      setName(client.full_name || "");
      setWhatsapp(maskWhatsApp(client.whatsapp || ""));
      setEmail(client.email || "");
      setCity(client.cidade || "");
      setBirthDate(client.data_nascimento || "");
      setInstagram(client.instagram || "");
      setSexo(client.sexo || "");
      setErrors({});
    }
  }, [client, open]);

  const handleClose = () => {
    onClose();
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

    if (!email.trim()) {
      next["email"] = "E-mail obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next["email"] = "Digite um e-mail válido";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!client || !validate()) return;

    updateMutation.mutate(
      {
        id: client.id,
        full_name: formatName(name),
        whatsapp: onlyDigits(whatsapp),
        email: email.trim(),
        cidade: city || "",
        birth_date: birthDate || "",
        instagram: instagram || "",
        sexo: sexo || "",
      },
      {
        onSuccess: () => {
          onSave();
          onClose();
        },
      },
    );
  };

  return (
    <SidePanel
      open={open}
      onClose={handleClose}
      title="Editar cliente"
      footer={
        <>
          <PanelCancelButton onClick={handleClose} />
          <PanelPrimaryButton onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Salvando..." : "Salvar alterações"}
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
          <label className={labelClass}>E-mail</label>
          <input
            type="email"
            className={inputClass}
            placeholder="exemplo@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors["email"] && <p className={errorClass}>{errors["email"]}</p>}
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

        <div>
          <label className={labelClass}>Sexo (opcional)</label>
          <select className={inputClass} value={sexo} onChange={(e) => setSexo(e.target.value)}>
            <option value="">Selecione...</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
            <option value="prefiro_nao_informar">Prefiro não informar</option>
          </select>
        </div>
      </div>
    </SidePanel>
  );
}
