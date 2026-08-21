import { createFileRoute } from '@tanstack/react-router';
import VitrinePage from '@/pages/admin/VitrinePage';

export const Route = createFileRoute('/admin/ferramentas/vitrine')({
  component: VitrinePage,
});
