import { useState } from "react";
import { Calendar, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

// --- Mock Data ---

const MOCK_EVENTS = [
  {
    id: "1",
    name: "Festa de Verão",
    status: "Publicado",
    date: "15/08/2026",
    time: "22:00",
    location: "Praia Clube",
    sold: 142,
    capacity: 200,
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "2",
    name: "Show do Ano",
    status: "Publicado",
    date: "22/08/2026",
    time: "20:00",
    location: "Arena Central",
    sold: 34,
    capacity: 150,
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "3",
    name: "Festival Outono",
    status: "Rascunho",
    date: "05/09/2026",
    time: "14:00",
    location: "Parque Municipal",
    sold: 0,
    capacity: 300,
    image: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "4",
    name: "Workshop de Tech",
    status: "Encerrado",
    date: "10/07/2026",
    time: "09:00",
    location: "Centro de Inovação",
    sold: 50,
    capacity: 50,
    image: "https://images.unsplash.com/photo-1540575861501-7c00117ffefb?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "5",
    name: "Sunset Party",
    status: "Publicado",
    date: "18/08/2026",
    time: "17:00",
    location: "Terraço VIP",
    sold: 85,
    capacity: 100,
    image: "https://images.unsplash.com/photo-1514525253361-bee8718a74a2?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "6",
    name: "Jazz Night",
    status: "Rascunho",
    date: "12/09/2026",
    time: "21:00",
    location: "Blue Note",
    sold: 0,
    capacity: 80,
    image: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "7",
    name: "Corrida de Rua",
    status: "Publicado",
    date: "25/08/2026",
    time: "07:00",
    location: "Orla da Praia",
    sold: 450,
    capacity: 500,
    image: "https://images.unsplash.com/photo-1530549387631-f565c6344fd1?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "8",
    name: "Teatro Infantil",
    status: "Publicado",
    date: "30/08/2026",
    time: "15:00",
    location: "Teatro Municipal",
    sold: 120,
    capacity: 250,
    image: "https://images.unsplash.com/photo-1503095396549-807a8bc3667c?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: "9",
    name: "Gastronomia Local",
    status: "Encerrado",
    date: "05/07/2026",
    time: "12:00",
    location: "Praça da Matriz",
    sold: 1000,
    capacity: 1000,
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000&auto=format&fit=crop",
  },
];

export function EventsListPage() {
  const [filter, setFilter] = useState("Todos");
  const [pageSize, setPageSize] = useState(25);

  const filteredEvents = MOCK_EVENTS.filter(event => {
    if (filter === "Todos") return true;
    return event.status === filter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ListPageHeader
        title="Eventos"
        action={<PrimaryActionLink to="/admin/eventos/novo">Novo Evento</PrimaryActionLink>}
      />

      {/* Tabs Filter */}
      <FilterTabs
        tabs={["Todos", "Publicados", "Rascunhos", "Encerrados"]}
        value={filter}
        onChange={setFilter}
      />

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <Link 
            key={event.id}
            to="/admin/eventos/$id"
            params={{ id: event.id }}
            className="group bg-bg-secondary border border-border-subtle overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
          >
            <div className="h-[140px] w-full relative">
              <img 
                src={event.image} 
                alt={event.name} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className={cn(
                "absolute top-3 left-3 text-micro px-2 py-0.5 font-bold uppercase",
                event.status === "Publicado" && "bg-success text-[#111111]",
                event.status === "Rascunho" && "bg-bg-tertiary text-text-primary",
                event.status === "Encerrado" && "bg-error/20 text-error border border-error/20 backdrop-blur-sm",
              )}>
                {event.status}
              </div>
            </div>
            
            <div className="p-4 flex flex-col flex-1 gap-3">
              <h2 className="text-heading-2 text-text-primary group-hover:text-accent transition-colors">{event.name}</h2>
              
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-small text-text-secondary">
                  <Calendar className="w-4 h-4 text-accent" />
                  {event.date} às {event.time}
                </div>
                <div className="flex items-center gap-2 text-small text-text-secondary">
                  <MapPin className="w-4 h-4 text-accent" />
                  {event.location}
                </div>
              </div>

              <div className="mt-auto pt-2">
                <div className="flex items-center justify-between text-small text-text-secondary mb-1.5">
                  <span>{event.sold}/{event.capacity} vendidos</span>
                  <span>{Math.round((event.sold / event.capacity) * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-bg-tertiary overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-500" 
                    style={{ width: `${(event.sold / event.capacity) * 100}%` }} 
                  />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border-subtle">
        <div className="flex items-center gap-4 text-small text-text-secondary">
          <div className="flex items-center gap-2">
            Mostrar
            <select 
              value={pageSize} 
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-bg-secondary border border-border-default px-2 py-1 outline-none focus:border-accent"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <span>Mostrando 1–{filteredEvents.length} de {filteredEvents.length}</span>
        </div>

        <div className="flex items-center gap-2">
          <button disabled className="p-2 border border-border-default text-text-disabled cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="p-2 border border-border-default text-text-primary hover:border-accent transition-colors">
            1
          </button>
          <button disabled className="p-2 border border-border-default text-text-disabled cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
