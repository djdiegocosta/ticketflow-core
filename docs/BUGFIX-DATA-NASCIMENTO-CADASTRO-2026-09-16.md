# Correção — Data de nascimento no cadastro

**Data:** 16/09/2026  
**Área:** `/cadastro` e componentes que utilizam `BirthdateSelect`  
**Status:** Correção implementada em branch de correção.

## Problema

O componente `BirthdateSelect` apagava o valor controlado sempre que dia, mês ou ano ainda não estavam completos.

Exemplo: ao selecionar o dia `15`, o componente chamava `onChange("")` porque mês e ano ainda estavam vazios. A seleção do dia era perdida no valor do formulário. O mesmo ocorria ao selecionar mês antes de completar o ano.

Na prática, o usuário conseguia abrir os seletores, mas não conseguia concluir de forma confiável a data de nascimento. Como esse campo é obrigatório no cadastro, o problema podia impedir a criação da conta.

## Causa

O componente era controlado diretamente pelo valor do formulário e tratava uma data parcialmente preenchida como se fosse uma data vazia.

## Correção

- `BirthdateSelect` agora mantém dia, mês e ano selecionados em estado local durante a interação.
- O formulário só recebe uma data no formato `AAAA-MM-DD` quando os três componentes estão preenchidos.
- Datas completas continuam sincronizadas com o valor externo.
- O ajuste automático de dias inválidos ao trocar mês/ano foi preservado.
- Nenhuma alteração foi feita na regra de validação do cadastro.

## Validação

Cenários que devem funcionar:

1. Selecionar dia → permanecer selecionado.
2. Selecionar mês → dia permanecer selecionado.
3. Selecionar ano → formulário receber `AAAA-MM-DD`.
4. Selecionar os campos em qualquer ordem.
5. Trocar mês depois de uma data completa.
6. Trocar ano depois de uma data completa.
7. Usar fevereiro com dia 31 e verificar ajuste para o último dia válido.
8. Recarregar a página depois de cadastro concluído e confirmar a data salva no perfil.
