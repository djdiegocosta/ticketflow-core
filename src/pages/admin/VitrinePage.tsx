import React, { useState } from "react";
import { ListPageHeader } from "@/components/admin/ListPageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { 
  useBanners, 
  useCreateBanner, 
  useUpdateBanner, 
  useDeleteBanner 
} from "@/lib/settings-queries";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2, Image as ImageIcon, ExternalLink, Power } from "lucide-react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetFooter 
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/lib/settings-queries";

export default function VitrinePage() {
  const { data: banners, isLoading } = useBanners();
  const { data: organization } = useOrganization();
  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();
  const deleteBanner = useDeleteBanner();

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    text_content: "",
    image_url: "",
    link_url: "",
    is_active: false
  });

  const handleOpenPanel = (banner?: any) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        title: banner.title,
        text_content: banner.text_content || "",
        image_url: banner.image_url || "",
        link_url: banner.link_url || "",
        is_active: banner.is_active
      });
    } else {
      setEditingBanner(null);
      setFormData({
        title: "",
        text_content: "",
        image_url: "",
        link_url: "",
        is_active: false
      });
    }
    setIsPanelOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error("O título é obrigatório");
      return;
    }

    try {
      if (editingBanner) {
        await updateBanner.mutateAsync({
          id: editingBanner.id,
          ...formData
        });
      } else {
        await createBanner.mutateAsync(formData);
      }
      setIsPanelOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${organization.id}/banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast.success("Imagem enviada com sucesso");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar imagem");
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleActive = async (banner: any) => {
    try {
      // Se estiver ativando, desativar outros banners
      if (!banner.is_active) {
        const otherActiveBanners = banners?.filter(b => b.is_active && b.id !== banner.id);
        if (otherActiveBanners && otherActiveBanners.length > 0) {
          for (const b of otherActiveBanners) {
            await updateBanner.mutateAsync({ id: b.id, is_active: false });
          }
        }
      }
      
      await updateBanner.mutateAsync({
        id: banner.id,
        is_active: !banner.is_active
      });
    } catch (error) {
      console.error(error);
    }
  };

  const columns = [
    {
      header: "Status",
      accessorKey: "is_active",
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          <Switch 
            checked={row.is_active} 
            onCheckedChange={() => handleToggleActive(row)}
          />
          <span className={row.is_active ? "text-green-600 font-medium" : "text-muted-foreground"}>
            {row.is_active ? "Ativo" : "Inativo"}
          </span>
        </div>
      )
    },
    {
      header: "Banner",
      accessorKey: "title",
      cell: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-16 bg-muted flex items-center justify-center border overflow-hidden">
            {row.image_url ? (
              <img src={row.image_url} alt={row.title} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-medium">{row.title}</p>
            {row.link_url && (
              <a href={row.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1">
                Link externo <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      )
    },
    {
      header: "Conteúdo",
      accessorKey: "text_content",
      cell: (row: any) => (
        <p className="max-w-[300px] truncate text-sm text-muted-foreground">
          {row.text_content || "-"}
        </p>
      )
    },
    {
      header: "Ações",
      accessorKey: "id",
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleOpenPanel(row)}>
            <Edit2 size={16} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm("Tem certeza que deseja excluir este banner?")) {
                deleteBanner.mutate(row.id);
              }
            }}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      <ListPageHeader
        title="Vitrine de Banners"
        description="Gerencie os banners exibidos na área do cliente. Apenas um banner pode estar ativo por vez."
        action={{
          label: "Novo Banner",
          icon: <Plus size={18} />,
          onClick: () => handleOpenPanel()
        }}
      />

      <DataTable
        columns={columns}
        data={banners || []}
        isLoading={isLoading}
      />

      <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
        <SheetContent className="sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>{editingBanner ? "Editar Banner" : "Novo Banner"}</SheetTitle>
          </SheetHeader>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Banner</Label>
              <Input
                id="title"
                placeholder="Ex: Promoção de Verão"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="text_content">Texto Auxiliar (Opcional)</Label>
              <Textarea
                id="text_content"
                placeholder="Descreva brevemente a promoção ou aviso"
                value={formData.text_content}
                onChange={e => setFormData(prev => ({ ...prev, text_content: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Imagem do Banner (Proporção 9:16 recomendada)</Label>
              <div className="flex items-start gap-4">
                <div className="w-24 h-32 bg-muted border flex items-center justify-center overflow-hidden">
                  {formData.image_url ? (
                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="cursor-pointer"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Formatos: JPG, PNG, WebP. Máximo 2MB.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="link_url">Link de Destino (Opcional)</Label>
              <Input
                id="link_url"
                placeholder="https://exemplo.com"
                value={formData.link_url}
                onChange={e => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active" className="cursor-pointer">Ativar este banner imediatamente</Label>
            </div>

            <SheetFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsPanelOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isUploading}>
                {editingBanner ? "Salvar Alterações" : "Criar Banner"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
