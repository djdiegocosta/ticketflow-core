import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { DollarSign, Ticket, Clock, Flame, Thermometer, QrCode } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { useOperationalEvent } from "@/lib/events-queries";
import { useSales, useSalesStats, formatCurrency, type Sale } from "@/lib/sales-queries";
import { useHourlySalesStats, useAudienceStats, classifyTemperature, salesVelocity, type TemperatureLevel } from "@/lib/dashboard-queries";

const TEMPERATURE_META: Record<TemperatureLevel, { label: string; icon: any; color: string }> = {
  normal: { label: "Normal", icon: Thermometer, color: "text-success" },
  aquecendo: { label: "Aquecendo", icon: Thermometer, color: "text-warning" },
  quente: { label: "Quente", icon: Thermometer, color: "text-error" },
  explodindo: { label: "Explodindo", icon: Flame, color: "text-error" },
};

const MetricCard = ({ title, value, icon: Icon, trend, secondary, gaugeValue, iconColor, iconSize = "h-5 w-5" }: any) => (
  <div className="flex h-full flex-col rounded-[var(--radius-md)] border border-border-subtle bg-bg-secondary p-5 shadow-sm">
    <div className="mb-2 flex items-start justify-between"><span className="text-small text-text-secondary">{title}</span><Icon className={cn(iconSize, iconColor)} /></div>
    <div className="flex flex-1 items-end justify-between gap-3"><div><div className="text-heading-1 mb-1 text-text-primary">{value}</div>{trend && <div className="text-small text-success">{trend}</div>}{secondary && <div className="text-small text-text-secondary">{secondary}</div>}</div>{gaugeValue !== undefined && <div className="relative h-[50px] w-[90px] shrink-0"><svg viewBox="0 0 90 50" width="90" height="50" className="block"><path d="M 8 46 A 37 37 0 0 1 82 46" fill="none" stroke="var(--bg-tertiary)" strokeWidth={10} strokeLinecap="round" /><path d="M 8 46 A 37 37 0 0 1 82 46" fill="none" stroke="var(--warning)" strokeWidth={10} strokeLinecap="round" strokeDasharray={Math.PI * 37} strokeDashoffset={Math.PI * 37 * (1 - gaugeValue / 100)} /></svg><div className="absolute inset-x-0 bottom-0 flex items-end justify-center"><span className="text-heading-2 font-semibold leading-none text-text-primary">{gaugeValue}%</span></div></div>}</div>
  </div>
);

const Panel = ({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) => (
  <section className="flex h-full flex-col rounded-[var(--radius-md)] border border-border-subtle bg-bg-secondary p-6"><div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-heading-2 text-text-primary">{title}</h2>{action}</div><div className="flex-1">{children}</div></section>
);

export function AdminDashboard() {
  const { isLoading: eventsLoading, event: operationalEvent } = useOperationalEvent();
  const eventId = operationalEvent?.id;
  const { data: stats, isLoading: statsLoading } = useSalesStats(eventId);
  const { data: sales = [], isLoading: salesLoading } = useSales();
  const { data: hourlyData = [], isLoading: hourlyLoading } = useHourlySalesStats(eventId);
  const { data: audience } = useAudienceStats();

  const scopedSales = operationalEvent ? sales.filter((sale: any) => sale.event_id === operationalEvent.id) : sales;
  const lastSales = scopedSales.filter((sale: any) => !sale.is_courtesy).slice(0, 8);
  const eventStarted = operationalEvent ? new Date(operationalEvent.event_date).getTime() <= Date.now() : false;
  const velocity = salesVelocity(scopedSales as any);
  const temperatureMeta = TEMPERATURE_META[classifyTemperature(velocity)];

  if (eventsLoading || statsLoading || salesLoading || hourlyLoading) return <div className="flex min-h-[400px] items-center justify-center"><span className="mr-2 animate-spin"><Clock className="h-6 w-6" /></span>Carregando métricas...</div>;

  return <div className="space-y-6">
    <div><p className="text-small text-text-secondary">{operationalEvent ? "Evento atual" : "Visão consolidada"}</p><h1 className="text-heading-1 text-text-primary">{operationalEvent?.title ?? "Todos os eventos"}</h1></div>
    <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard title="Receita" value={formatCurrency(stats?.totalRevenue || 0)} icon={DollarSign} trend={stats?.paidSales ? `Baseado em ${stats.paidSales} vendas` : "Nenhuma venda paga"} iconColor="text-accent" />
      <MetricCard title="Ingressos" value={stats?.totalTickets || 0} icon={Ticket} secondary="ingressos confirmados" iconColor="text-accent" />
      {eventStarted ? <MetricCard title="Check-in" value={stats?.checkins || 0} icon={QrCode} secondary={stats?.validTickets ? `de ${stats.validTickets} ingressos válidos` : "nenhum ingresso válido"} gaugeValue={stats?.validTickets ? Math.round(((stats.checkins || 0) / stats.validTickets) * 100) : 0} iconColor="text-accent" /> : <MetricCard title="Pendentes" value={stats?.pendingSales || 0} icon={Clock} secondary={`${formatCurrency(stats?.pendingAmount || 0)} aguardando pagamento`} gaugeValue={stats?.totalSales ? Math.round((stats.pendingSales / stats.totalSales) * 100) : 0} iconColor="text-warning" />}
      <MetricCard title="Temperatura" value={temperatureMeta.label} icon={temperatureMeta.icon} iconColor={temperatureMeta.color} iconSize="h-16 w-16" secondary={`${velocity.toFixed(1)} vendas/hora (24h)`} />
    </div>
    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
      <Panel title="Vendas diárias (últimos 14 dias)"><div className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={stats?.last14Days || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><defs><linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15}/><stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-secondary)" }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-secondary)" }} /><Tooltip contentStyle={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-default)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }} itemStyle={{ color: "var(--accent)" }} /><Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={1} fillOpacity={1} fill="url(#colorSales)" /></AreaChart></ResponsiveContainer></div></Panel>
      <Panel title="Pico de vendas por horário"><div className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={hourlyData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }} barSize={6}><XAxis type="number" hide /><YAxis dataKey="hour" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} width={40} /><Tooltip cursor={{ fill: "transparent" }} contentStyle={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-default)", borderRadius: "var(--radius-sm)" }} /><Bar dataKey="value" radius={[0, 3, 3, 0]} background={{ fill: "var(--bg-tertiary)", radius: 3 }}>{hourlyData.map((entry, index) => <Cell key={`cell-${index}`} fill="var(--accent)" className="opacity-60 hover:opacity-100" />)}</Bar></BarChart></ResponsiveContainer></div></Panel>
    </div>
    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
      <Panel title="Últimas vendas" action={<Link to="/admin/vendas" className="text-small text-accent hover:underline">Ver todas →</Link>}><div className="divide-y divide-border-subtle">{lastSales.map((sale: Sale) => { const quantity = Number(sale.quantity) || 0; return <div key={sale.id} className="flex items-center gap-4 py-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-tertiary text-small font-semibold text-text-primary">{sale.buyer_name.split(" ").map((n: string) => n[0]).join("")}</div><div className="text-body text-text-primary"><span className="font-medium">{sale.buyer_name}</span> <span className="text-text-secondary">comprou {quantity} {quantity === 1 ? "ingresso" : "ingressos"}</span></div></div>; })}{lastSales.length === 0 && <div className="py-8 text-center text-text-secondary">Nenhuma venda registrada.</div>}</div></Panel>
      <Panel title="Dados do público"><div className="grid grid-cols-2 gap-4 lg:grid-cols-5"><div><div className="text-small text-text-secondary">Idade média</div><div className="text-heading-2 text-text-primary">{audience?.averageAge ? `${audience.averageAge} anos` : "—"}</div></div><div><div className="text-small text-text-secondary">Faixa predominante</div><div className="text-heading-2 text-text-primary">{audience?.topBracket ?? "—"}</div></div><div><div className="text-small text-text-secondary">Novos clientes (30d)</div><div className="text-heading-2 text-text-primary">{audience?.newCustomers ?? "—"}</div></div><div><div className="text-small text-text-secondary">Clientes recorrentes</div><div className="text-heading-2 text-text-primary">{audience?.recurringCustomers ?? "—"}</div></div><div className="col-span-2 lg:col-span-1"><div className="text-small text-text-secondary">Principais cidades</div>{audience?.topCities?.length ? <ul className="mt-1 space-y-0.5">{audience.topCities.map((c) => <li key={c.city} className="text-body text-text-primary">{c.city} <span className="text-small text-text-secondary">({c.count})</span></li>)}</ul> : <div className="text-heading-2 text-text-primary">—</div>}</div></div></Panel>
    </div>
  </div>;
}
