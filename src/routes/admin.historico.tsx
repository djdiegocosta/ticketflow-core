import { createFileRoute, redirect } from '@tanstack/react-router'
import { CheckinHistoryPage } from '@/pages/CheckinHistoryPage'

export const Route = createFileRoute('/admin/historico')({
  beforeLoad: ({ context }) => {
    const ctx = (context as any).auth;
    if (ctx?.role === 'colaborador') {
      throw redirect({ to: '/admin/vendas' });
    }
  },
  component: CheckinHistoryPage,
})
