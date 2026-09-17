# Data de nascimento: input DD/MM/AAAA + calendário em popover (16/09/2026)

## Contexto

Em 06/09/2026 corrigimos um bug no componente de 3 seletores (Dia/Mês/Ano)
do campo de data de nascimento (commit `fbb1ea8`, ver
`docs/BUGFIX-DATA-NASCIMENTO-CADASTRO-2026-09-16.md`). Depois de usar essa
versão, Diego decidiu que a experiência ainda não era boa o suficiente: 3
seletores separados são mais lentos de preencher que digitar a data direto.

## Problema de UX do componente anterior

- 3 campos separados (Dia/Mês/Ano) exigem 3 toques mínimos, mesmo pra quem
  prefere digitar.
- Não permitia digitação corrida de uma data (ex: escrever "15111984" de
  uma vez, como em qualquer app de verdade).

## Solução adotada

Componente substituído: **input de texto com máscara DD/MM/AAAA** +
**ícone de calendário que abre um popover** com o componente `Calendar`
(react-day-picker) já usando `captionLayout="dropdown"` — mês e ano
diretamente selecionáveis por um menu, sem precisar clicar dezenas de
vezes na seta pra voltar de 2026 até 1984.

Nenhuma dependência nova foi adicionada — `react-day-picker` já estava no
`package.json` e o componente `Calendar`/`Popover` do shadcn já existiam
no projeto (`src/components/ui/calendar.tsx`, `src/components/ui/popover.tsx`),
só nunca tinham sido usados em nenhuma tela até agora.

## Formato interno

Sem mudança: o componente continua recebendo/emitindo o mesmo formato
`AAAA-MM-DD` (ISO) de antes, via as mesmas props `value`/`onChange`/
`minYear`/`maxYear`. Os dois pontos que usam o componente
(`src/pages/SignupPage.tsx` e `src/routes/cliente.perfil.tsx`) **não
precisaram de nenhuma alteração** — a troca ficou inteiramente contida em
`src/components/ui/birthdate-select.tsx`.

- Exibição pro usuário: `DD/MM/AAAA`.
- Valor salvo no banco: continua `AAAA-MM-DD`, na mesma coluna
  `data_nascimento` de sempre. Nenhuma migration, RPC ou estrutura de
  banco foi alterada.

## Comportamento de digitação

- A máscara insere as barras automaticamente conforme os dígitos são
  digitados (mesma técnica já usada em `maskWhatsApp`, `src/lib/form-format.ts`).
- Digitação parcial (`15/`, `15/11/`) **nunca é apagada automaticamente**
  — o valor só é convertido e propagado pro formulário quando a data está
  completa, existe de verdade (calendário real, sem 31/02) e não é uma
  data futura.
- Só nesses 2 casos o campo dispara `onChange`: data completa e válida
  (`onChange("AAAA-MM-DD")`), ou campo totalmente vazio (`onChange("")`,
  cobre o caso de limpar a data). Qualquer estado intermediário não altera
  o valor do formulário, só o texto visível no campo.

## Comportamento do calendário

- Abre num popover ancorado no ícone, sem ocupar a tela inteira nem criar
  uma etapa/modal separada.
- Mês e ano com menus de seleção direta (`captionLayout="dropdown"`) —
  não precisa navegar mês a mês.
- Datas futuras aparecem desabilitadas (não clicáveis).
- Selecionar uma data no calendário preenche o input com o texto formatado
  e fecha o popover.

## Validações aplicadas

- Data precisa existir de verdade (rejeita "31/02/1990", "29/02/2001" —
  ano não bissexto — etc).
- Data não pode ser futura (comparada até o fim do dia atual).
- Mantidas as validações de formulário já existentes em cada tela (campo
  obrigatório no Cadastro, opcional no Perfil) — nada disso foi tocado.

## Testes executados

Testes automatizados de lógica pura (máscara, parse, validação) rodados
via Node, cobrindo os cenários do documento de tarefa:

| Cenário | Resultado |
|---|---|
| A. Digitação direta `15111984` → `1984-11-15` | ✅ Passou |
| C. Carregar `1984-11-15` → exibe `15/11/1984` | ✅ Passou |
| D. Data futura rejeitada | ✅ Passou |
| E. Digitação parcial (`15`, `1511`, `151`) não quebra/não limpa | ✅ Passou |
| F. Ano antigo (1900) aceito sem restrição de navegação | ✅ Passou |
| J. Limpar o campo (string vazia) | ✅ Passou |
| Extras: bissexto, mês/dia inválido, limite "hoje" | ✅ Passou (14/14 no total) |

**Não testados nesta rodada** (exigem navegador real, não simuláveis neste
ambiente): B (seleção pelo calendário visualmente), G (experiência mobile
real), H (teclado/foco no desktop), I (edição de data já cadastrada
persistindo de ponta a ponta). Recomendo testar esses 4 cenários
manualmente antes de considerar a tarefa 100% encerrada.

Build de produção (`npx vite build`) e `tsc --noEmit` executados sem
nenhum erro novo. Lint limpo no arquivo alterado.

## Arquivo alterado

- `src/components/ui/birthdate-select.tsx` — reescrito por completo.
  Nenhum outro arquivo precisou de alteração.
