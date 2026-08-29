/* eslint-disable */
// @ts-nocheck

import { Route as rootRoute } from './routes/__root';
import { Route as IndexRoute } from './routes/index';
import { Route as LoginRoute } from './routes/login';
import { Route as CadastroRoute } from './routes/cadastro';
import { Route as RecuperarSenhaRoute } from './routes/recuperar-senha';
import { Route as RedefinirSenhaRoute } from './routes/redefinir-senha';
import { Route as MeusIngressosRoute } from './routes/meus-ingressos';
import { Route as IngressoRoute } from './routes/ingresso.$ticket_code';
import { Route as ESlugIndexRoute } from './routes/e.$slug.index';
import { Route as ESlugCheckoutRoute } from './routes/e.$slug.checkout';
import { Route as ESlugConfirmacaoSaleCodeRoute } from './routes/e.$slug.confirmacao.$sale_code';
import { Route as OrganizacaoPendenteRoute } from './routes/organizacao-pendente';
import { Route as PrimeiroAcessoRoute } from './routes/primeiro-acesso';
import { Route as AdminRoute } from './routes/admin.route';
import { Route as AdminIndexRoute } from './routes/admin.index';
import { Route as AdminCheckinRoute } from './routes/admin.checkin';
import { Route as AdminChecklistRoute } from './routes/admin.checklist';
import { Route as AdminHistoricoRoute } from './routes/admin.historico';
import { Route as AdminClientesIndexRoute } from './routes/admin.clientes.index';
import { Route as AdminClientesIdRoute } from './routes/admin.clientes.$id';
import { Route as AdminConfiguracoesIndexRoute } from './routes/admin.configuracoes.index';
import { Route as AdminConfiguracoesMercadoPagoRoute } from './routes/admin.configuracoes.mercado-pago';
import { Route as AdminCortesiasRoute } from './routes/admin.cortesias';
import { Route as AdminEventosIndexRoute } from './routes/admin.eventos.index';
import { Route as AdminEventosNovoRoute } from './routes/admin.eventos.novo';
import { Route as AdminEventosIdRoute } from './routes/admin.eventos.$id';
import { Route as AdminFerramentasIndexRoute } from './routes/admin.ferramentas.index';
import { Route as AdminFerramentasVitrineRoute } from './routes/admin.ferramentas.vitrine';
import { Route as AdminFerramentasDiagnosticRoute } from './routes/admin.ferramentas.diagnostic';
import { Route as AdminRelatoriosRoute } from './routes/admin.relatorios';
import { Route as AdminSimuladorRoute } from './routes/admin.simulador';
import { Route as AdminUsuariosRoute } from './routes/admin.usuarios';
import { Route as AdminVendasIndexRoute } from './routes/admin.vendas.index';
import { Route as AdminVendasIdRoute } from './routes/admin.vendas.$id';
import { Route as SuperadminRoute } from './routes/superadmin';
import { Route as SuperadminIndexRoute } from './routes/superadmin.index';
import { Route as SuperadminOrganizacoesRoute } from './routes/superadmin.organizacoes';
import { Route as SuperadminPlanosRoute } from './routes/superadmin.planos';
import { Route as ClienteRoute } from './routes/cliente';
import { Route as ClienteIndexRoute } from './routes/cliente.index';
import { Route as ClienteEventosRoute } from './routes/cliente.eventos';
import { Route as ClienteIngressosRoute } from './routes/cliente.ingressos';
import { Route as ClientePerfilRoute } from './routes/cliente.perfil';
import { Route as ClientePontosRoute } from './routes/cliente.pontos';
import { Route as CheckinIndexRoute } from './routes/checkin.index';
import { Route as CheckinHistoricoRoute } from './routes/checkin.historico';

const AdminFerramentasIndexRouteWithChildren = AdminFerramentasIndexRoute.addChildren([
  AdminFerramentasVitrineRoute,
  AdminFerramentasDiagnosticRoute,
]);

const AdminFerramentasRouteWithChildren = AdminRoute.addChildren([
  AdminIndexRoute,
  AdminCheckinRoute,
  AdminChecklistRoute,
  AdminHistoricoRoute,
  AdminClientesIndexRoute,
  AdminClientesIdRoute,
  AdminConfiguracoesIndexRoute,
  AdminConfiguracoesMercadoPagoRoute,
  AdminCortesiasRoute,
  AdminEventosIndexRoute,
  AdminEventosNovoRoute,
  AdminEventosIdRoute,
  AdminFerramentasIndexRouteWithChildren,
  AdminRelatoriosRoute,
  AdminSimuladorRoute,
  AdminUsuariosRoute,
  AdminVendasIndexRoute,
  AdminVendasIdRoute,
]);

const SuperadminRouteWithChildren = SuperadminRoute.addChildren([
  SuperadminIndexRoute,
  SuperadminOrganizacoesRoute,
  SuperadminPlanosRoute,
]);

const ClienteRouteWithChildren = ClienteRoute.addChildren([
  ClienteIndexRoute,
  ClienteEventosRoute,
  ClienteIngressosRoute,
  ClientePerfilRoute,
  ClientePontosRoute,
]);

const ESlugRouteWithChildren = ESlugIndexRoute.addChildren([
  ESlugCheckoutRoute,
  ESlugConfirmacaoSaleCodeRoute,
]);

const rootRouteWithChildren = rootRoute.addChildren([
  IndexRoute,
  LoginRoute,
  CadastroRoute,
  RecuperarSenhaRoute,
  RedefinirSenhaRoute,
  MeusIngressosRoute,
  IngressoRoute,
  ESlugRouteWithChildren,
  OrganizacaoPendenteRoute,
  PrimeiroAcessoRoute,
  AdminFerramentasRouteWithChildren,
  SuperadminRouteWithChildren,
  ClienteRouteWithChildren,
  CheckinIndexRoute,
  CheckinHistoricoRoute,
]);

export const routeTree = rootRouteWithChildren;

export interface FileRoutesToFilePathsAndExports {
  root: '/'
  index: '/';
  login: '/login';
  cadastro: '/cadastro';
  'recuperar-senha': '/recuperar-senha';
  'redefinir-senha': '/redefinir-senha';
  'meus-ingressos': '/meus-ingressos';
  'ingresso/$ticket_code': '/ingresso/$ticket_code';
  'e/$slug/': '/e/$slug';
  'e/$slug/checkout': '/e/$slug/checkout';
  'e/$slug/confirmacao/$sale_code': '/e/$slug/confirmacao/$sale_code';
  'organizacao-pendente': '/organizacao-pendente';
  'primeiro-acesso': '/primeiro-acesso';
  'admin/': '/admin';
  'admin/index': '/admin';
  'admin/checkin': '/admin/checkin';
  'admin/checklist': '/admin/checklist';
  'admin/historico': '/admin/historico';
  'admin/clientes/': '/admin/clientes';
  'admin/clientes/$id': '/admin/clientes/$id';
  'admin/configuracoes/': '/admin/configuracoes';
  'admin/configuracoes/mercado-pago': '/admin/configuracoes/mercado-pago';
  'admin/cortesias': '/admin/cortesias';
  'admin/eventos/': '/admin/eventos';
  'admin/eventos/novo': '/admin/eventos/novo';
  'admin/eventos/$id': '/admin/eventos/$id';
  'admin/ferramentas/': '/admin/ferramentas';
  'admin/ferramentas/vitrine': '/admin/ferramentas/vitrine';
  'admin/ferramentas/diagnostic': '/admin/ferramentas/diagnostic';
  'admin/relatorios': '/admin/relatorios';
  'admin/simulador': '/admin/simulador';
  'admin/usuarios': '/admin/usuarios';
  'admin/vendas/': '/admin/vendas';
  'admin/vendas/$id': '/admin/vendas/$id';
  'superadmin/': '/superadmin';
  'superadmin/index': '/superadmin';
  'superadmin/organizacoes': '/superadmin/organizacoes';
  'superadmin/planos': '/superadmin/planos';
  'cliente/': '/cliente';
  'cliente/index': '/cliente';
  'cliente/eventos': '/cliente/eventos';
  'cliente/ingressos': '/cliente/ingressos';
  'cliente/perfil': '/cliente/perfil';
  'cliente/pontos': '/cliente/pontos';
  'checkin/index': '/checkin';
  'checkin/historico': '/checkin/historico';
}

export interface FileRoutesByPath {
  'root': {
    filePath: 'routes/__root.tsx';
    id: 'root';
    path: '/';
  };
  'index': {
    filePath: 'routes/index.tsx';
    id: 'index';
    path: '/';
  };
  'login': {
    filePath: 'routes/login.tsx';
    id: 'login';
    path: '/login';
  };
  'cadastro': {
    filePath: 'routes/cadastro.tsx';
    id: 'cadastro';
    path: '/cadastro';
  };
  'recuperar-senha': {
    filePath: 'routes/recuperar-senha.tsx';
    id: 'recuperar-senha';
    path: '/recuperar-senha';
  };
  'redefinir-senha': {
    filePath: 'routes/redefinir-senha.tsx';
    id: 'redefinir-senha';
    path: '/redefinir-senha';
  };
  'meus-ingressos': {
    filePath: 'routes/meus-ingressos.tsx';
    id: 'meus-ingressos';
    path: '/meus-ingressos';
  };
  'ingresso/$ticket_code': {
    filePath: 'routes/ingresso.$ticket_code.tsx';
    id: 'ingresso/$ticket_code';
    path: '/ingresso/$ticket_code';
  };
  'e/$slug/': {
    filePath: 'routes/e.$slug.index.tsx';
    id: 'e/$slug/';
    path: '/e/$slug';
  };
  'e/$slug/checkout': {
    filePath: 'routes/e.$slug.checkout.tsx';
    id: 'e/$slug/checkout';
    path: '/e/$slug/checkout';
  };
  'e/$slug/confirmacao/$sale_code': {
    filePath: 'routes/e.$slug.confirmacao.$sale_code.tsx';
    id: 'e/$slug/confirmacao/$sale_code';
    path: '/e/$slug/confirmacao/$sale_code';
  };
  'organizacao-pendente': {
    filePath: 'routes/organizacao-pendente.tsx';
    id: 'organizacao-pendente';
    path: '/organizacao-pendente';
  };
  'primeiro-acesso': {
    filePath: 'routes/primeiro-acesso.tsx';
    id: 'primeiro-acesso';
    path: '/primeiro-acesso';
  };
  'admin/': {
    filePath: 'routes/admin.route.tsx';
    id: 'admin/';
    path: '/admin';
  };
  'admin/index': {
    filePath: 'routes/admin.index.tsx';
    id: 'admin/index';
    path: '/admin';
  };
  'admin/checkin': {
    filePath: 'routes/admin.checkin.tsx';
    id: 'admin/checkin';
    path: '/admin/checkin';
  };
  'admin/checklist': {
    filePath: 'routes/admin.checklist.tsx';
    id: 'admin/checklist';
    path: '/admin/checklist';
  };
  'admin/historico': {
    filePath: 'routes/admin.historico.tsx';
    id: 'admin/historico';
    path: '/admin/historico';
  };
  'admin/clientes/': {
    filePath: 'routes/admin.clientes.index.tsx';
    id: 'admin/clientes/';
    path: '/admin/clientes';
  };
  'admin/clientes/$id': {
    filePath: 'routes/admin.clientes.$id.tsx';
    id: 'admin/clientes/$id';
    path: '/admin/clientes/$id';
  };
  'admin/configuracoes/': {
    filePath: 'routes/admin.configuracoes.index.tsx';
    id: 'admin/configuracoes/';
    path: '/admin/configuracoes';
  };
  'admin/configuracoes/mercado-pago': {
    filePath: 'routes/admin.configuracoes.mercado-pago.tsx';
    id: 'admin/configuracoes/mercado-pago';
    path: '/admin/configuracoes/mercado-pago';
  };
  'admin/cortesias': {
    filePath: 'routes/admin.cortesias.tsx';
    id: 'admin/cortesias';
    path: '/admin/cortesias';
  };
  'admin/eventos/': {
    filePath: 'routes/admin.eventos.index.tsx';
    id: 'admin/eventos/';
    path: '/admin/eventos';
  };
  'admin/eventos/novo': {
    filePath: 'routes/admin.eventos.novo.tsx';
    id: 'admin/eventos/novo';
    path: '/admin/eventos/novo';
  };
  'admin/eventos/$id': {
    filePath: 'routes/admin.eventos.$id.tsx';
    id: 'admin/eventos/$id';
    path: '/admin/eventos/$id';
  };
  'admin/ferramentas/': {
    filePath: 'routes/admin.ferramentas.index.tsx';
    id: 'admin/ferramentas/';
    path: '/admin/ferramentas';
  };
  'admin/ferramentas/vitrine': {
    filePath: 'routes/admin.ferramentas.vitrine.tsx';
    id: 'admin/ferramentas/vitrine';
    path: '/admin/ferramentas/vitrine';
  };
  'admin/ferramentas/diagnostic': {
    filePath: 'routes/admin.ferramentas.diagnostic.tsx';
    id: 'admin/ferramentas/diagnostic';
    path: '/admin/ferramentas/diagnostic';
  };
  'admin/relatorios': {
    filePath: 'routes/admin.relatorios.tsx';
    id: 'admin/relatorios';
    path: '/admin/relatorios';
  };
  'admin/simulador': {
    filePath: 'routes/admin.simulador.tsx';
    id: 'admin/simulador';
    path: '/admin/simulador';
  };
  'admin/usuarios': {
    filePath: 'routes/admin.usuarios.tsx';
    id: 'admin/usuarios';
    path: '/admin/usuarios';
  };
  'admin/vendas/': {
    filePath: 'routes/admin.vendas.index.tsx';
    id: 'admin/vendas/';
    path: '/admin/vendas';
  };
  'admin/vendas/$id': {
    filePath: 'routes/admin.vendas.$id.tsx';
    id: 'admin/vendas/$id';
    path: '/admin/vendas/$id';
  };
  'superadmin/': {
    filePath: 'routes/superadmin.tsx';
    id: 'superadmin/';
    path: '/superadmin';
  };
  'superadmin/index': {
    filePath: 'routes/superadmin.index.tsx';
    id: 'superadmin/index';
    path: '/superadmin';
  };
  'superadmin/organizacoes': {
    filePath: 'routes/superadmin.organizacoes.tsx';
    id: 'superadmin/organizacoes';
    path: '/superadmin/organizacoes';
  };
  'superadmin/planos': {
    filePath: 'routes/superadmin.planos.tsx';
    id: 'superadmin/planos';
    path: '/superadmin/planos';
  };
  'cliente/': {
    filePath: 'routes/cliente.tsx';
    id: 'cliente/';
    path: '/cliente';
  };
  'cliente/index': {
    filePath: 'routes/cliente.index.tsx';
    id: 'cliente/index';
    path: '/cliente';
  };
  'cliente/eventos': {
    filePath: 'routes/cliente.eventos.tsx';
    id: 'cliente/eventos';
    path: '/cliente/eventos';
  };
  'cliente/ingressos': {
    filePath: 'routes/cliente.ingressos.tsx';
    id: 'cliente/ingressos';
    path: '/cliente/ingressos';
  };
  'cliente/perfil': {
    filePath: 'routes/cliente.perfil.tsx';
    id: 'cliente/perfil';
    path: '/cliente/perfil';
  };
  'cliente/pontos': {
    filePath: 'routes/cliente.pontos.tsx';
    id: 'cliente/pontos';
    path: '/cliente/pontos';
  };
  'checkin/index': {
    filePath: 'routes/checkin.index.tsx';
    id: 'checkin/index';
    path: '/checkin';
  };
  'checkin/historico': {
    filePath: 'routes/checkin.historico.tsx';
    id: 'checkin/historico';
    path: '/checkin/historico';
  };
}
