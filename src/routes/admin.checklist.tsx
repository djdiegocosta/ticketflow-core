import { createFileRoute, redirect } from '@tanstack/react-router'
import { ChecklistPage } from '@/pages/admin/ChecklistPage'

export const Route = createFileRoute('/admin/checklist')({
  beforeLoad: ({ context }) => {
    const ctx = (context as any).auth;
    if (ctx?.role === 'colaborador') {
      throw redirect({ to: '/admin/vendas' });
    }
  },
  component: ChecklistPage,
})
