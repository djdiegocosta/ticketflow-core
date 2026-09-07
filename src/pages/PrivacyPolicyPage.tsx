import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { MobileLayout } from "@/components/layouts/MobileLayout";

export default function PrivacyPolicyPage() {
  return (
    <MobileLayout showFooter={false} headerContent={<div className="text-center font-semibold text-small">Política de Privacidade</div>}>
      <main className="px-5 py-6 pb-16">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <article className="space-y-7 text-sm leading-6 text-[var(--text-secondary)]">
          <header>
            <h1 className="text-heading-2 font-bold text-[var(--text-primary)]">Política de Privacidade</h1>
            <p className="mt-2">Última atualização: 06/09/2026</p>
          </header>

          <section>
            <h2 className="text-heading-3 font-semibold text-[var(--text-primary)]">1. Quem trata seus dados</h2>
            <p className="mt-2">Os dados informados durante a compra são tratados pelo organizador responsável pelo evento, com o TicketFlow atuando como plataforma tecnológica para operação da venda e gestão dos ingressos.</p>
          </section>

          <section>
            <h2 className="text-heading-3 font-semibold text-[var(--text-primary)]">2. Dados coletados</h2>
            <p className="mt-2">Podemos coletar nome, WhatsApp, e-mail e nome dos participantes informados no checkout, além de dados necessários para identificar a venda, processar o pagamento e emitir os ingressos.</p>
          </section>

          <section>
            <h2 className="text-heading-3 font-semibold text-[var(--text-primary)]">3. Para que usamos os dados</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>processar e acompanhar a compra;</li>
              <li>gerar e entregar ingressos;</li>
              <li>validar o acesso ao evento;</li>
              <li>entrar em contato sobre a compra ou o evento;</li>
              <li>cumprir obrigações legais e prevenir fraudes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-heading-3 font-semibold text-[var(--text-primary)]">4. Compartilhamento</h2>
            <p className="mt-2">Quando necessário para concluir a compra, informações podem ser compartilhadas com prestadores envolvidos na operação, como o processador de pagamentos. Não vendemos dados pessoais.</p>
          </section>

          <section>
            <h2 className="text-heading-3 font-semibold text-[var(--text-primary)]">5. Segurança e retenção</h2>
            <p className="mt-2">Adotamos medidas técnicas e organizacionais para proteger os dados. As informações são mantidas pelo período necessário para cumprir as finalidades da compra, obrigações legais e defesa de direitos.</p>
          </section>

          <section>
            <h2 className="text-heading-3 font-semibold text-[var(--text-primary)]">6. Seus direitos</h2>
            <p className="mt-2">Nos termos da legislação aplicável, você pode solicitar informações sobre o tratamento de seus dados e exercer os direitos previstos na LGPD, observadas as hipóteses legais de retenção. Para isso, procure o organizador responsável pelo evento.</p>
          </section>

          <section>
            <h2 className="text-heading-3 font-semibold text-[var(--text-primary)]">7. Atualizações</h2>
            <p className="mt-2">Esta política pode ser atualizada para refletir mudanças no serviço, na legislação ou nas práticas de tratamento de dados. A versão vigente será publicada nesta página.</p>
          </section>

          <Link to="/termos" className="inline-block font-medium text-[var(--accent-text)] underline underline-offset-4">Ler Termos de Uso</Link>
        </article>
      </main>
    </MobileLayout>
  );
}
