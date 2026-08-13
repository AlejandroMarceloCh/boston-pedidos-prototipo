import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Plus, ChevronRight, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PedidoDrawer } from "@/features/pedidos/pedido-drawer";
import { usePedidos } from "@/store/hooks";
import { formatCurrency } from "@/lib/utils";

type Estado = "borrador" | "confirmado" | "facturado" | "entregado" | "anulado";

const estadoConfig: Record<Estado, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }> = {
  borrador: { label: "Borrador", variant: "secondary" },
  confirmado: { label: "Confirmado", variant: "success" },
  facturado: { label: "Facturado", variant: "default" },
  entregado: { label: "Entregado", variant: "default" },
  anulado: { label: "Anulado", variant: "destructive" },
};

type Filtro = "todos" | "borradores" | "confirmados" | "saldos" | "solicitudes";

export default function MisPedidosPage() {
  const { resumenes: PEDIDOS } = usePedidos();
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  // Filtro por estado desde las tarjetas del pie; convive con los tabs.
  const [estadoFiltro, setEstadoFiltro] = useState<Estado | null>(null);
  const [params, setParams] = useSearchParams();

  // ?estado=… — lo usan los KPI del dashboard para llegar ya filtrados.
  useEffect(() => {
    const e = params.get("estado");
    const tab = params.get("tab");
    if (!e && !tab) return;
    if (e && e in estadoConfig) setEstadoFiltro(e as Estado);
    if (tab === "solicitudes") setFiltro("solicitudes");
    params.delete("estado");
    params.delete("tab");
    setParams(params, { replace: true });
  }, [params, setParams]);
  const [selectedPedido, setSelectedPedido] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PEDIDOS.filter((p) => {
      const matches =
        !q || p.cliente.toLowerCase().includes(q) || p.nro.toLowerCase().includes(q);
      if (!matches) return false;
      if (estadoFiltro && p.estado !== estadoFiltro) return false;
      switch (filtro) {
        case "solicitudes":
          return p.tipo === "solicitud";
        case "borradores":
          return p.tipo === "pedido" && p.estado === "borrador";
        case "confirmados":
          return p.tipo === "pedido" && p.estado === "confirmado";
        case "saldos":
          return p.tipo === "pedido" && !!p.saldo;
        default:
          // "Todos" son los pedidos: las solicitudes tienen su propia pestaña
          // para que el contador y el importe del mes no se descuadren.
          return p.tipo === "pedido";
      }
    });
  }, [query, filtro, estadoFiltro, PEDIDOS]);

  // Solo compras en firme: una solicitud no es venta (RF-24).
  const soloPedidos = PEDIDOS.filter((p) => p.tipo === "pedido");
  const totalMes = soloPedidos
    .filter((p) => p.estado !== "anulado")
    .reduce((a, p) => a + p.total, 0);

  return (
    <div className="mx-auto max-w-7xl px-7 lg:px-12 py-10 animate-fade-in">
      {/* Header */}
      <header className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            {new Date()
              .toLocaleDateString("es-PE", { month: "long", year: "numeric" })
              .replace(/^\w/, (c) => c.toUpperCase())}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Mis pedidos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {soloPedidos.length} pedidos este mes · {formatCurrency(totalMes)} en total.
          </p>
        </div>
        <Link to="/pedidos/nuevo">
          <Button className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Nuevo pedido
          </Button>
        </Link>
      </header>

      {/* Filtros */}
      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por número o cliente…"
              className="pl-9"
            />
          </div>
          <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="borradores">Borradores</TabsTrigger>
              <TabsTrigger value="confirmados">Confirmados</TabsTrigger>
              <TabsTrigger value="saldos">Con saldo</TabsTrigger>
              <TabsTrigger value="solicitudes">
                Solicitudes
                {PEDIDOS.filter(
                  (p) => p.tipo === "solicitud" && p.estadoSolicitud === "pendiente"
                ).length > 0 && (
                  <span className="ml-1.5 tabular text-[10px] rounded-full bg-warning/15 text-warning px-1.5 py-0.5">
                    {
                      PEDIDOS.filter(
                        (p) => p.tipo === "solicitud" && p.estadoSolicitud === "pendiente"
                      ).length
                    }
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* Lista en móvil: la tabla de 7 columnas recortaba el número y el total */}
      <div className="sm:hidden space-y-2">
        {filtrados.map((p) => {
          const cfg = estadoConfig[p.estado];
          return (
            <button
              key={p.nro}
              onClick={() => setSelectedPedido(p.nro)}
              className="w-full text-left rounded-xl border border-border bg-surface shadow-card p-4 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="tabular text-[11.5px] text-muted-foreground">{p.nro}</p>
                  <p className="text-[14px] font-medium truncate mt-0.5">{p.cliente}</p>
                </div>
                {p.tipo === "solicitud" ? (
                  <Badge
                    variant={p.estadoSolicitud === "rechazada" ? "destructive" : "warning"}
                  >
                    Solicitud
                  </Badge>
                ) : (
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                )}
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <span className="text-[11.5px] text-muted-foreground tabular">
                  {p.items} und · {p.fecha.slice(0, 10)}
                </span>
                <span className="tabular text-[15px] font-semibold">
                  {formatCurrency(p.total)}
                </span>
              </div>
              {p.saldo && (
                <p className="mt-2 text-[11px] text-warning">Con saldo pendiente</p>
              )}
            </button>
          );
        })}
        {filtrados.length === 0 && (
          <Card className="py-12 text-center">
            <p className="text-sm font-medium">Sin resultados</p>
          </Card>
        )}
      </div>

      {/* Tabla, desde sm */}
      <Card className="overflow-hidden hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-muted-foreground">
              <th className="text-left font-medium uppercase tracking-widest text-[10px] px-5 py-2.5">
                Pedido
              </th>
              <th className="text-left font-medium uppercase tracking-widest text-[10px] py-2.5">
                Cliente
              </th>
              <th className="text-left font-medium uppercase tracking-widest text-[10px] py-2.5">
                Estado
              </th>
              <th className="text-right font-medium uppercase tracking-widest text-[10px] py-2.5">
                Items
              </th>
              <th className="text-right font-medium uppercase tracking-widest text-[10px] py-2.5">
                Fecha
              </th>
              <th className="text-right font-medium uppercase tracking-widest text-[10px] px-5 py-2.5">
                Total
              </th>
              <th className="w-8 px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => {
              const cfg = estadoConfig[p.estado];
              return (
                <tr
                  key={p.nro}
                  onClick={() => setSelectedPedido(p.nro)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedPedido(p.nro);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Ver pedido ${p.nro} de ${p.cliente}`}
                  className="border-b border-border last:border-0 hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring transition-colors group cursor-pointer"
                >
                  <td className="px-5 py-3.5">
                    <span className="tabular text-xs font-medium">{p.nro}</span>
                    {p.saldo && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-block">
                              <Badge variant="warning" className="ml-2 text-[10px]">
                                Con saldo
                              </Badge>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Pedido con unidades pendientes de entrega
                          </TooltipContent>
                        </Tooltip>
                    )}
                  </td>
                  <td className="py-3.5">
                    <p className="font-medium truncate max-w-[280px]">{p.cliente}</p>
                  </td>
                  <td className="py-3.5">
                    {p.tipo === "solicitud" ? (
                      <Badge
                        variant={p.estadoSolicitud === "rechazada" ? "destructive" : "warning"}
                      >
                        Solicitud
                      </Badge>
                    ) : (
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    )}
                  </td>
                  <td className="py-3.5 text-right">
                    <span className="tabular text-xs text-muted-foreground">{p.items}</span>
                  </td>
                  <td className="py-3.5 text-right">
                    <span className="tabular text-xs text-muted-foreground">{p.fecha}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="tabular text-sm font-semibold">
                      {formatCurrency(p.total)}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtrados.length === 0 && (
          <CardContent className="py-16 text-center">
            <Filter className="h-7 w-7 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">Sin resultados</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Prueba con otro número o cambia el filtro.
            </p>
            {(query || filtro !== "todos" || estadoFiltro) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setQuery("");
                  setFiltro("todos");
                  setEstadoFiltro(null);
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      <Separator className="my-6" />

      {/* Estados: cada tarjeta filtra la tabla de arriba */}
      <div className="grid sm:grid-cols-5 gap-2">
        {(Object.keys(estadoConfig) as Estado[]).map((e) => {
          const activo = estadoFiltro === e;
          const cuantos = PEDIDOS.filter((p) => p.estado === e).length;
          return (
            <button
              key={e}
              onClick={() => setEstadoFiltro(activo ? null : e)}
              aria-pressed={activo}
              title={activo ? "Quitar filtro" : `Ver solo ${estadoConfig[e].label}`}
              className={cn(
                "rounded-md border bg-card p-3 flex items-center justify-between text-left",
                "transition-all duration-150 ease-smooth hover:-translate-y-px hover:shadow-lifted",
                activo
                  ? "border-primary ring-1 ring-primary shadow-card"
                  : "border-border shadow-subtle hover:border-border-strong"
              )}
            >
              <span className="text-xs capitalize">{estadoConfig[e].label}</span>
              <Badge variant={estadoConfig[e].variant} className="text-[10px]">
                <span className="tabular">{cuantos}</span>
              </Badge>
            </button>
          );
        })}
      </div>

      <PedidoDrawer
        pedidoId={selectedPedido}
        onClose={() => setSelectedPedido(null)}
      />
    </div>
  );
}

