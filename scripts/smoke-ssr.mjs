// Teste de fumaça do servidor: abre páginas reais no servidor já montado no
// formato da Vercel (.vercel/output) e falha se alguma der erro 500 ou mostrar
// a tela "This page didn't load".
//
// Existe porque o site já caiu por completo (erro 500 em todas as páginas) por
// causa de versões de bibliotecas que a Vercel instalou, e os testes de tipos e
// de lógica não percebem isso: só o servidor rodando percebe.
//
// Uso: npm run smoke:ssr   (monta com VERCEL=1 e depois roda este arquivo)
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const entry = resolve(".vercel/output/functions/__server.func/index.mjs");
if (!existsSync(entry)) {
  console.error(`Servidor montado não encontrado: ${entry}\nRode antes: VERCEL=1 vite build`);
  process.exit(2);
}

const paths = [
  "/",
  "/login",
  "/links",
  "/e/modo-revoada",
  "/e/modo-revoada/checkout",
  "/cliente",
  "/admin",
  "/checkin",
];

const { default: handler } = await import(pathToFileURL(entry).href);

let failures = 0;
for (const path of paths) {
  let line;
  try {
    const response = await handler.fetch(new Request(`http://localhost${path}`, { redirect: "manual" }));
    const body = await response.text();
    const errorPage = body.includes("This page didn't load");
    if (errorPage || response.status >= 500) {
      failures++;
      line = `FALHOU ${response.status} ${path}${errorPage ? " (tela de erro)" : ""}`;
    } else {
      line = `ok     ${response.status} ${path}`;
    }
  } catch (error) {
    failures++;
    line = `FALHOU ${path}: ${error instanceof Error ? error.message : String(error)}`;
  }
  console.log(line);
}

if (failures > 0) {
  console.error(`\n${failures} página(s) com erro. NÃO publicar.`);
  process.exit(1);
}
console.log(`\nTodas as ${paths.length} páginas responderam.`);
process.exit(0);
