import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { DollarSign, Ticket, Clock, Flame, Thermometer, QrCode, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { StatusPill } from "@/components/admin/DataTable";
import { useEvents } from "@/lib/events-queries";
import { useSales, useSalesStats, type Sale } from "@/lib/sales-queries";
import { formatCurrency } from "@/lib/sales-queries";

import {
  useHourlySalesStats,
  useAudienceStats,
  classifyTemperature,
  salesVelocity,
  type TemperatureLevel,
} from "@/lib/dashboard-queries";

const TEMPERATURE_META: Record<
  TemperatureLevel,
  { label: string; icon: any; color: string }
> = {
  normal: { label: "Normal", icon: Thermometer, color: "text-success" },
  aquecendo: { label: "Aquecendo", icon: Thermometer, color: "text-warning" },
  quente: { label: "Quente", icon: Thermometer, color: "text-error" },
  explodindo: { label: "Explodindo", icon: Flame, color: "text-error" },
};


// --- Components ---

const MetricCard = ({ title, value, icon: Icon, trend, secondary, progress, gaugeValue, iconColor, subtext }: any) => {
  return (
    <div className="bg-bg-secondary border border-border-subtle p-5 shadow-sm h-full flex flex-col rounded-[var(--radius-md)]">
      <div className="flex items-start justify-between mb-2">
        <span className="text-small text-text-secondary">{title}</span>
        <Icon className={cn("w-5 h-5", iconColor)} />
      </div>
      
      <div className="flex items-end justify-between gap-3">
        <div className="flex-1">
          {value !== undefined && <div className="text-heading-1 text-text-primary mb-1">{value}</div>}
          {trend && <div className="text-small text-success">{trend}</div>}
          {secondary && <div className="text-small text-text-secondary">{secondary}</div>}
          {subtext && <div className="text-small text-text-secondary mt-1">{subtext}</div>}
        </div>
        
        {gaugeValue !== undefined && (
          <div className="w-[90px] h-[50px] relative shrink-0">
            <svg viewBox="0 0 90 50" width="90" height="50" className="block">
              <path
                d="M 8 46 A 37 37 0 0 1 82 46"
                fill="none"
                stroke="var(--bg-tertiary)"
                strokeWidth={10}
                strokeLinecap="round"
              />
              <path
                d="M 8 46 A 37 37 0 0 1 82 46"
                fill="none"
                stroke="var(--warning)"
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={Math.PI * 37}
                strokeDashoffset={Math.PI * 37 * (1 - gaugeValue / 100)}
              />
            </svg>
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-center">
              <span className="text-heading-2 font-semibold text-text-primary leading-none">{gaugeValue}%</span>
            </div>
          </div>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-4">
          <div className="h-1 w-full bg-bg-tertiary rounded-[var(--radius-full)] overflow-hidden">
            <div 
              className="h-full bg-accent transition-all duration-500" 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export function AdminDashboard() {
  const [currentEvent, setCurrentEvent] = useState<string>("overview");
  const { data: events = [] } = useEvents();
  const { data: stats, isLoading: statsLoading } = useSalesStats(currentEvent);
  const { data: sales = [], isLoading: salesLoading } = useSales();
  const { data: hourlyData = [], isLoading: hourlyLoading } = useHourlySalesStats(currentEvent);
  const { data: audience } = useAudienceStats();


  const isOverview = currentEvent === "overview";

  const lastSales = sales.filter((s: any) => !s.is_courtesy).slice(0, 8);

  // Card 3 dinâmico: Pendentes antes do início do evento, Check-in a partir dele.
  const now = Date.now();
  const eventStarted = isOverview
    ? events.some((e) => !e.is_closed && new Date(e.event_date).getTime() <= now)
    : (() => {
        const ev = events.find((e) => e.id === currentEvent);
        return !!ev && new Date(ev.event_date).getTime() <= now;
      })();

  const velocity = salesVelocity(
    (isOverview ? sales : sales.filter((s: any) => s.event_id === currentEvent)) as any,
  );
  const temperatureMeta = TEMPERATURE_META[classifyTemperature(velocity)];

  if (statsLoading || salesLoading || hourlyLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <span className="animate-spin mr-2"><Clock className="h-6 w-6" /></span>
        Carregando métricas...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-heading-1 text-text-primary mb-6"></h1>
        
        {/* Context Selector */}
        <div className="flex border-b border-border-subtle gap-1 overflow-x-auto pb-px">
          <button
            onClick={() => setCurrentEvent("overview")}
            className={cn(
              "px-4 py-2 text-body transition-all relative border-b-2 whitespace-nowrap",
              isOverview 
                ? "bg-accent-muted text-accent-text border-accent rounded-t-[var(--radius-sm)]" 
                : "text-text-secondary hover:bg-bg-tertiary border-transparent rounded-t-[var(--radius-sm)]"
            )}
          >
            Visão Geral
          </button>
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => setCurrentEvent(event.id)}
              className={cn(
                "px-4 py-2 text-body transition-all relative border-b-2 whitespace-nowrap",
                currentEvent === event.id 
                  ? "bg-accent-muted text-accent-text border-accent rounded-t-[var(--radius-sm)]" 
                  : "text-text-secondary hover:bg-bg-tertiary border-transparent rounded-t-[var(--radius-sm)]"
              )}
            >
              {event.title}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <MetricCard
          title="Receita"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={DollarSign}
          trend={stats?.paidSales ? `Baseado em ${stats.paidSales} vendas` : "Nenhuma venda paga"}
          iconColor="text-accent"
        />
        <MetricCard
          title="Ingressos"
          value={stats?.totalTickets || 0}
          secondary="ingressos confirmados"
          icon={Ticket}
          iconColor="text-accent"
        />
        {eventStarted ? (
          <MetricCard
            title="Check-in"
            value={stats?.checkins || 0}
            icon={QrCode}
            secondary={
              stats?.validTickets
                ? `de ${stats.validTickets} ingressos válidos`
                : "nenhum ingresso válido"
            }
            gaugeValue={
              stats?.validTickets
                ? Math.round(((stats.checkins || 0) / stats.validTickets) * 100)
                : 0
            }
            iconColor="text-accent"
          />
        ) : (
          <MetricCard
            title="Pendentes"
            value={stats?.pendingSales || 0}
            icon={Clock}
            secondary={`${formatCurrency(stats?.pendingAmount || 0)} aguardando pagamento`}
            gaugeValue={
              stats?.totalSales ? Math.round((stats.pendingSales / stats.totalSales) * 100) : 0
            }
            iconColor="text-warning"
          />
        )}
        <MetricCard
          title="Temperatura"
          value={temperatureMeta.label}
          icon={temperatureMeta.icon}
          iconColor={temperatureMeta.color}
          secondary={`${velocity.toFixed(1)} vendas/hora (24h)`}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Sales Evolution */}
        <div className="lg:col-span-6 bg-bg-secondary border border-border-subtle p-6 rounded-[var(--radius-md)]">
          <h2 className="text-heading-2 text-text-primary mb-6">Vendas diárias (últimos 14 dias)</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.last14Days || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "var(--text-secondary)" }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "var(--text-secondary)" }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "var(--bg-secondary)", 
                    borderColor: "var(--border-default)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)"
                  }}
                  itemStyle={{ color: "var(--accent)" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="var(--accent)" 
                  strokeWidth={1} 
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Peaks (Mocked for now) */}
        <div className="lg:col-span-4 bg-bg-secondary border border-border-subtle p-6 rounded-[var(--radius-md)]">
          <h2 className="text-heading-2 text-text-primary mb-6">Pico de vendas por horário</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={hourlyData} 

                layout="vertical" 
                margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                barSize={6}
              >
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="hour" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                  width={40}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ 
                    backgroundColor: "var(--bg-secondary)", 
                    borderColor: "var(--border-default)",
                    borderRadius: "var(--radius-sm)",
                  }}
                />
                <Bar 
                  dataKey="value" 
                  radius={[0, 3, 3, 0]} 
                  background={{ fill: 'var(--bg-tertiary)', radius: 3 }}
                >
                  {hourlyData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill="var(--accent)" 
                      className="opacity-60 hover:opacity-100"
                    />
                  ))}

                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Last Sales - simplified */}
      <div className="bg-bg-secondary border border-border-subtle p-6 rounded-[var(--radius-md)]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-heading-2 text-text-primary">Últimas vendas</h2>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-micro text-accent uppercase font-bold tracking-wider">tempo real</span>
            </div>
          </div>
          <Link to="/admin/vendas" className="text-small text-accent hover:underline">
            Ver todas →
          </Link>
        </div>

        <div className="divide-y divide-border-subtle">
          {lastSales.map((sale: Sale) => {
            const quantity = Number(sale.quantity) || 0;
            const ticketLabel = quantity === 1 ? "ingresso" : "ingressos";
            
            return (
              <div key={sale.id} className="py-3 flex items-center gap-4 group">
                <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-text-primary text-small font-semibold shrink-0">
                  {sale.buyer_name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                
                <div className="text-body text-text-primary">
                  <span className="font-medium">{sale.buyer_name}</span>{" "}
                  <span className="text-text-secondary">comprou {quantity} {ticketLabel}</span>
                </div>
              </div>
            );
          })}
          {lastSales.length === 0 && (
            <div className="py-8 text-center text-text-secondary">Nenhuma venda registrada.</div>
          )}
        </div>
      </div>

      {/* Dados do Público */}
      <div className="bg-bg-secondary border border-border-subtle p-6 rounded-[var(--radius-md)]">
        <div className="flex items-center gap-2 mb-6">
          <Users className="h-5 w-5 text-accent" />
          <h2 className="text-heading-2 text-text-primary">Dados do público</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <div className="text-small text-text-secondary">Idade média</div>
            <div className="text-heading-2 text-text-primary">
              {audience?.averageAge ? `${audience.averageAge} anos` : "—"}
            </div>
          </div>
          <div>
            <div className="text-small text-text-secondary">Faixa predominante</div>
            <div className="text-heading-2 text-text-primary">{audience?.topBracket ?? "—"}</div>
          </div>
          <div>
            <div className="text-small text-text-secondary">Novos clientes (30d)</div>
            <div className="text-heading-2 text-text-primary">{audience?.newCustomers ?? "—"}</div>
          </div>
          <div>
            <div className="text-small text-text-secondary">Clientes recorrentes</div>
            <div className="text-heading-2 text-text-primary">
              {audience?.recurringCustomers ?? "—"}
            </div>
          </div>
          <div className="col-span-2 lg:col-span-1">
            <div className="text-small text-text-secondary">Principais cidades</div>
            {audience?.topCities?.length ? (
              <ul className="mt-1 space-y-0.5">
                {audience.topCities.map((c) => (
                  <li key={c.city} className="text-body text-text-primary">
                    {c.city} <span className="text-small text-text-secondary">({c.count})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-heading-2 text-text-primary">—</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
