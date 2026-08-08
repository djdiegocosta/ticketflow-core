import { createFileRoute, redirect } from '@tanstack/react-router'
import { ChecklistPage } from '@/pages/admin/ChecklistPage'

export const Route = createFileRoute('/admin/checklist')({
  beforeLoad: () => {
    if (typeof window === 'undefined') return;
    const auth = window.localStorage.getItem('ticketflow_auth');
    if (!auth) throw redirect({ to: '/login' });
    
    const data = JSON.parse(auth);
    if (data.userRole === 'colaborador') {
      // Colaboradores podem acessar check-in, mas o checklist de ferramentas é admin
      // conforme o prompt anterior de ferramentas.
      throw redirect({ to: '/admin/vendas' });
    }
  },
  component: ChecklistPage,
})
