import { useState } from "react";
import { Copy, Link2, Plus } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/events-queries";
import {
  SALES_LINK_CHANNELS,
  channelLabel,
  eventDefaultUrl,
  salesLinkUrl,
  useCreateSalesLink,
  useSalesLinks,
} from "@/lib/sales-links-queries";

function CopyButton({ value }: { value: string }) {
  return (
    <button
      type="button"
      aria-label="Copiar link"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast.success("Link copiado");
        } catch {
          toast.error("Não foi possível copiar o link");
        }
      }}
      className="shrink-0 p-2 text-text-secondary transition-colors hover:text-accent"
    >
      <Copy className="h-4 w-4" />
    </button>
  );
}

/**
 * Seção "Links de Venda" da tela do evento: link padrão, criação de canais
 * e listagem somente leitura. Gestão completa fica em Ferramentas.
 */
export function SalesLinksSection({
  eventId,
  organizationId,
  slug,
}: {
  eventId: string;
  organizationId: string | null | undefined;
  slug: string;
}) {
  const { data: links = [] } = useSalesLinks(eventId);
  const createLink = useCreateSalesLink();

  const [name, setName] = useState("");
  const [channel, setChannel] = useState<string>("instagram");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleName = (value: string) => {
    setName(value);
    if (!codeTouched) setCode(slugify(value));
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome do canal");
      return;
    }
    const finalCode = slugify(code || name);
    if (!finalCode) {
      toast.error("Código inválido");
      return;
    }
    if (!organizationId) {
      toast.error("Organização não encontrada");
      return;
    }
    setSaving(true);
    try {
      await createLink({
        organization_id: organizationId,
        event_id: eventId,
        name,
        channel,
        code: finalCode,
      });
      toast.success("Link de venda criado");
      setName("");
      setCode("");
      setCodeTouched(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar link de venda");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 border-t border-border-subtle pt-6">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-accent" />
        <h2 className="text-heading-2">Links de Venda</h2>
      </div>

      {/* Link padrão */}
      <div className="flex items-center gap-3 rounded-md border border-border-subtle bg-bg-primary p-3">
        <div className="min-w-0 flex-1">
          <div className="text-small font-semibold text-text-primary">Link padrão</div>
          <div className="truncate text-small text-text-secondary">{eventDefaultUrl(slug)}</div>
        </div>
        <CopyButton value={eventDefaultUrl(slug)} />
      </div>

      {/* Formulário */}
      <div className="space-y-3 rounded-md border border-border-subtle bg-bg-primary p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-small font-medium text-text-secondary">Nome do canal</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleName(e.target.value)}
              placeholder="Ex.: Instagram do DJ"
              className="w-full rounded-sm border border-border-default bg-bg-secondary p-2 outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-2">
            <label className="text-small font-medium text-text-secondary">Canal</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded-sm border border-border-default bg-bg-secondary p-2 outline-none focus:border-accent"
            >
              {SALES_LINK_CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-small font-medium text-text-secondary">Código do link</label>
          <div className="flex items-center gap-2 text-small">
            <span className="truncate text-text-disabled">{`/e/${slug}?ref=`}</span>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCodeTouched(true);
                setCode(slugify(e.target.value));
              }}
              className="flex-1 rounded-sm border border-border-default bg-bg-secondary p-1 outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving}
            className="flex items-center gap-1 rounded-md bg-accent px-4 py-2 font-semibold text-[#111111] transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {saving ? "Adicionando..." : "Adicionar"}
          </button>
        </div>
      </div>

      {/* Lista somente leitura */}
      {links.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-subtle py-6 text-center text-small text-text-disabled">
          Nenhum link de venda criado.
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-3 rounded-md border border-border-subtle bg-bg-primary p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-small font-semibold text-text-primary">
                  {link.name}{" "}
                  <span className="font-normal text-text-secondary">
                    • {channelLabel(link.channel)}
                  </span>
                </div>
                <div className="truncate text-small text-text-secondary">
                  {salesLinkUrl(slug, link.code)}
                </div>
              </div>
              <CopyButton value={salesLinkUrl(slug, link.code)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
