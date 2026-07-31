import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Pie, PieChart, Cell } from "recharts";
import { DollarSign, Ticket, Clock, Eye, TrendingUp } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

// --- Mock Data ---

const MOCK_EVENTS = [
  { id: "1", name: "Festa de Verão" },
  { id: "2", name: "Show do Ano" },
];

const MOCK_SALES_DATA = [
  { date: "17/07", value: 4 },
  { date: "18/07", value: 3 },
  { date: "19/07", value: 6 },
  { date: "20/07", value: 8 },
  { date: "21/07", value: 5 },
  { date: "22/07", value: 9 },
  { date: "23/07", value: 12 },
  { date: "24/07", value: 7 },
  { date: "25/07", value: 10 },
  { date: "26/07", value: 8 },
  { date: "27/07", value: 11 },
  { date: "28/07", value: 9 },
  { date: "29/07", value: 12 },
  { date: "30/07", value: 11 },
];

const MOCK_HOURLY_DATA = [
  { hour: "00h", value: 2 },
  { hour: "02h", value: 1 },
  { hour: "04h", value: 0 },
  { hour: "06h", value: 1 },
  { hour: "08h", value: 4 },
  { hour: "10h", value: 7 },
  { hour: "12h", value: 10 },
  { hour: "14h", value: 15 }, // Peak
  { hour: "16h", value: 12 },
  { hour: "18h", value: 14 },
  { hour: "20h", value: 16 }, // Peak
  { hour: "22h", value: 8 },
];

const MOCK_LAST_SALES = [
  { id: 1, name: "João Silva", event: "Festa de Verão", tickets: "2x", value: "R$ 180,00", status: "Pago", time: "há 3 min" },
  { id: 2, name: "Maria Souza", event: "Festa de Verão", tickets: "1x", value: "R$ 90,00", status: "Aguardando", time: "há 12 min" },
  { id: 3, name: "Carlos Mendes", event: "Show do Ano", tickets: "4x", value: "R$ 360,00", status: "Pago", time: "há 28 min" },
  { id: 4, name: "Ana Lima", event: "Festa de Verão", tickets: "2x", value: "R$ 180,00", status: "Pago", time: "há 45 min" },
  { id: 5, name: "Pedro Costa", event: "Show do Ano", tickets: "1x", value: "R$ 90,00", status: "Cancelado", time: "há 1h" },
  { id: 6, name: "Juliana Ramos", event: "Festa de Verão", tickets: "3x", value: "R$ 270,00", status: "Pago", time: "há 2h" },
  { id: 7, name: "Rafael Oliveira", event: "Show do Ano", tickets: "2x", value: "R$ 180,00", status: "Pago", time: "há 3h" },
  { id: 8, name: "Camila Ferreira", event: "Festa de Verão", tickets: "1x", value: "R$ 90,00", status: "Aguardando", time: "há 4h" },
];

// --- Components ---

const MetricCard = ({ title, value, icon: Icon, trend, secondary, progress, gaugeValue, iconColor, subtext }: any) => {
  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-radius-md p-5 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <span className="text-small text-text-secondary">{title}</span>
        <Icon className={cn("w-5 h-5", iconColor)} />
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-heading-1 text-text-primary mb-1">{value}</div>
          {trend && <div className="text-small text-success">{trend}</div>}
          {secondary && <div className="text-small text-text-secondary">{secondary}</div>}
          {subtext && <div className="text-small text-text-secondary mt-1">{subtext}</div>}
        </div>
        
        {gaugeValue !== undefined && (
          <div className="w-20 h-20 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { value: gaugeValue },
                    { value: 100 - gaugeValue },
                  ]}
                  innerRadius={25}
                  outerRadius={35}
                  startAngle={180}
                  endAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="var(--warning)" />
                  <Cell fill="var(--bg-tertiary)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pt-4">
              <span className="text-small font-bold text-text-primary">{gaugeValue}%</span>
            </div>
          </div>
        )}
      </div>

      {progress !== undefined && (
        <div className="mt-4">
          <div className="h-1 w-full bg-bg-tertiary rounded-radius-full overflow-hidden">
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
  const [currentEvent, setCurrentEvent] = useState<string>("1");

  const isOverview = currentEvent === "overview";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-heading-1 text-text-primary mb-6">Dashboard</h1>
        
        {/* Context Selector */}
        <div className="flex border-b border-border-subtle gap-1">
          <button
            onClick={() => setCurrentEvent("overview")}
            className={cn(
              "px-4 py-2 text-body transition-all relative border-b-2",
              isOverview 
                ? "bg-accent-muted text-accent-text border-accent" 
                : "text-text-secondary hover:bg-bg-tertiary border-transparent"
            )}
          >
            Visão Geral
          </button>
          {MOCK_EVENTS.map((event) => (
            <button
              key={event.id}
              onClick={() => setCurrentEvent(event.id)}
              className={cn(
                "px-4 py-2 text-body transition-all relative border-b-2",
                currentEvent === event.id 
                  ? "bg-accent-muted text-accent-text border-accent" 
                  : "text-text-secondary hover:bg-bg-tertiary border-transparent"
              )}
            >
              {event.name}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Receita Total"
          value="R$ 4.230,00"
          icon={DollarSign}
          trend="+12% vs. semana anterior"
          iconColor="text-accent"
        />
        <MetricCard
          title="Ingressos Vendidos"
          value="89"
          secondary="de 200 disponíveis"
          icon={Ticket}
          progress={(89 / 200) * 100}
          iconColor="text-accent"
        />
        <MetricCard
          title="Aguardando Pagamento"
          icon={Clock}
          gaugeValue={18}
          subtext="7 pedidos pendentes"
          iconColor="text-warning"
        />
        <MetricCard
          title="Visitas na Página do Evento"
          value="1.247"
          secondary="7,1% converteram"
          icon={Eye}
          iconColor="text-info"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Sales Evolution */}
        <div className="lg:col-span-6 bg-bg-secondary border border-border-subtle rounded-radius-md p-6">
          <h2 className="text-heading-2 text-text-primary mb-6">Vendas diárias</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_SALES_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  strokeWidth={1.5} 
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Peaks */}
        <div className="lg:col-span-4 bg-bg-secondary border border-border-subtle rounded-radius-md p-6">
          <h2 className="text-heading-2 text-text-primary mb-6">Pico de vendas por horário</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={MOCK_HOURLY_DATA} 
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
                  {MOCK_HOURLY_DATA.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.value >= 15 ? "var(--accent)" : "var(--accent)"} 
                      className={entry.value >= 15 ? "opacity-100" : "opacity-60"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Last Sales Table-like List */}
      <div className="bg-bg-secondary border border-border-subtle rounded-radius-md p-6">
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
          {MOCK_LAST_SALES.map((sale) => (
            <div key={sale.id} className="py-4 flex items-center gap-4 group">
              <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-text-primary text-small font-semibold">
                {sale.name.split(' ').map(n => n[0]).join('')}
              </div>
              
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 items-center">
                <div>
                  <div className="text-body text-text-primary font-medium">{sale.name}</div>
                  <div className="text-small text-text-secondary">{sale.event}</div>
                </div>
                
                <div className="hidden md:block text-small text-text-secondary">
                  {sale.tickets}
                </div>
                
                <div className="text-body font-semibold text-text-primary">
                  {sale.value}
                </div>
                
                <div className="flex items-center justify-between gap-4">
                  <div className={cn(
                    "text-micro px-2 py-0.5 rounded-radius-full font-bold uppercase",
                    sale.status === "Pago" && "bg-accent-muted text-accent-text",
                    sale.status === "Aguardando" && "bg-warning/10 text-warning",
                    sale.status === "Cancelado" && "bg-error/10 text-error",
                  )}>
                    {sale.status}
                  </div>
                  <div className="text-small text-text-disabled whitespace-nowrap">
                    {sale.time}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
