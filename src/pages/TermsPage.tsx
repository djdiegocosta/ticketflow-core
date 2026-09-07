import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { MobileLayout } from "@/components/layouts/MobileLayout";

export default function TermsPage() {
  return (
    <MobileLayout showFooter={false} headerContent={<div className="text-center font-semibold text-small">Termos de Uso</div>}>
      <main className="px-5 py-6 pb-16">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <article className="space-y-7 text-sm leading-6 text-[var(--text-secondary)]">
          <header>
            <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">Termos de Uso</h1>
            <p className="mt-2">Última atualização: 06/09/2026</p>
          </header>

          <section>
            <h2 className="text-heading-3 font-semibold text-[var(--text-primary)]">1. Sobre o serviço</h2>
            <p className="mt-2">O TicketFlow disponibiliza tecnologia para divulgação de eventos, venda e gestão de ingressos. As regras específicas do evento, incluindo data, local, classificação, cancelamento e reembolso, são definidas pelo organizador responsável.</p>
          </section>

          <section>
            <h2 className="text-heading-3 font-semibold text-[var(--text-primary)]">2. Compra de ingressos</h2>
            <p className="mt-2">Ao concluir uma compra, o comprador declara que os dados fornecidos são verdadeiros e que possui autorização para utilizar os dados dos participantes informados. A reserva de ingressos pode ter prazo de expiração informado durante o checkout.</p>
          </section>

          <section>
            <h2 className="text-heading-3 font-semibold text-[var(--text-primary)]">3. Pagamento e confirmação</h2>
            <p className="mt-2">O pagamento é processado por meio do provedor de pagamento disponibilizado no checkout. O ingresso somente é considerado confirmado após a aprovação do pagamento e a emissão correspondente pelo sistema.</p>
          </section>

          <section>
            <h2 className="text-heading-3 font-semibold text-[var(--text-primary)]">4. Ingressos e acesso</h2>
            <p className="mt-2">Cada ingresso possui identificação própria e pode conter um código de validação. O ingresso deve ser apresentado na entrada conforme as orientações do evento. O organizador poderá impedir o acesso quando houver irregularidade, cancelamento ou uso indevido do ingresso.</p>
          </section>

          <section>
            <h2 className="text-heading-3 font-semibold text-[var(--text-primary)]">5. Cancelamento e reembolso</h2>
            <p className="mt-2">Cancelamentos e reembolsos seguem a legislação aplicável e as condições informadas pelo organizador do evento. Quando houver política específica publicada para o evento, ela prevalece para aquela compra, respeitados os direitos do consumidor.</p>
          </section>

          <section>
            <h2 className="text-heading-3 font-semibold text-[var(--text-primary)]">6. Uso adequado</h2>
            <p className="mt-2">É proibido utilizar o serviço para fraude, tentativa de revenda irregular, manipulação de pagamentos, uso de dados de terceiros sem autorização ou qualquer atividade ilícita.</p>
          </section>

          <section>
            <h2 className="text-heading-3 font-semibold text-[var(--text-primary)]">7. Privacidade</h2>
            <p className="mt-2">O tratamento dos dados pessoais utilizados na compra é explicado na nossa Política de Privacidade.</p>
            <Link to="/privacidade" className="mt-2 inline-block font-medium text-[var(--accent-text)] underline underline-offset-4">Ler Política de Privacidade</Link>
          </section>

          <section>
            <h2 className="text-heading-3 font-semibold text-[var(--text-primary)]">8. Atualizações</h2>
            <p className="mt-2">Estes termos podem ser atualizados quando necessário. A versão vigente será publicada nesta página.</p>
          </section>
        </article>
      </main>
    </MobileLayout>
  );
}
