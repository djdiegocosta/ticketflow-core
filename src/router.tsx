import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Depois de cada novo deploy, o navegador pode ter em cache uma versão antiga
// do site que tenta buscar um "pedaço" (chunk) de código que já não existe mais
// no servidor (o deploy novo trocou os arquivos). Isso derruba a tela com "Ocorreu
// um erro ao exibir esta seção" — mesmo o código estando certo. O Vite avisa esse
// caso específico com o evento abaixo; a correção é recarregar a página uma vez
// pra buscar a versão atual. A trava de sessionStorage evita ficar recarregando
// em loop caso o erro seja outra coisa.
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", () => {
    const key = "ticketflow-reload-on-chunk-error";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    window.location.reload();
  });
  // Se chegamos até aqui sem erro, o bundle atual está bom — libera a trava
  // pra caso um novo deploy aconteça mais tarde nessa mesma sessão aberta.
  window.setTimeout(() => sessionStorage.removeItem("ticketflow-reload-on-chunk-error"), 5000);
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
