import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Clock,
  AlertTriangle,
  FileText,
  ArrowUpRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CURRENT_USER, CLIENTES } from "@/lib/mock-data";
import { ClienteDrawer } from "@/features/clientes/cliente-drawer";
import { PedidoDrawer } from "@/features/pedidos/pedido-drawer";
import { usePedidos, useKpis } from "@/store/hooks";
import { formatCurrency } from "@/lib/utils";

const estadoVariant = {
  confirmado: "success",
  borrador: "secondary",
  facturado: "default",
  entregado: "default",
  anulado: "destructive",
} as const;

export default function DashboardPage() {
  const hoy = new Date().toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const [selectedCliente, setSelectedCliente] = useState<string | null>(null);
  const [selectedPedido, setSelectedPedido] = useState<string | null>(null);
  const { pedidos: resumenes } = usePedidos();
  const k = useKpis();

  // Pedidos de hoy de verdad: antes listaba los 5 más recientes de cualquier
  // fecha bajo el título "Pedidos de hoy". Si hoy no hubo, se muestran los
  // últimos y el título lo dice.
  const hoyISO = new Date().toISOString().slice(0, 10);
  const deHoy = resumenes.filter((p) => p.fecha.startsWith(hoyISO));
  const hayDeHoy = deHoy.length > 0;
  const PEDIDOS = (hayDeHoy ? deHoy : resumenes).slice(0, 5);

  // Cada KPI lleva a la vista que lo explica: un número que no se puede abrir
  // obliga a buscar a mano de dónde salió.
  const KPIs = [
    {
      label: "Pedidos hoy",
      value: String(k.pedidosHoy),
      delta: `${resumenes.length} en total`,
      icon: ShoppingCart,
      to: "/pedidos",
    },
    {
      label: "Solicitudes",
      value: String(k.solicitudesPendientes),
      delta: "sin stock, esperando respuesta",
      icon: Clock,
      to: "/pedidos?tab=solicitudes",
    },
    {
      label: "Stock crítico",
      value: String(k.skusCriticos),
      delta: "SKUs con menos de 1 docena",
      icon: AlertTriangle,
      to: "/catalogo",
    },
    {
      label: "Por facturar",
      value: formatCurrency(k.montoPorFacturar),
      delta: `${k.reservados} confirmados`,
      icon: FileText,
      to: "/pedidos?estado=confirmado",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-7 lg:px-12 py-10">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-end justify-between mb-9"
      >
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium capitalize flex items-center gap-2">
            {hoy}
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 uppercase tracking-widest text-muted-foreground/70">
              datos demo
            </Badge>
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            Hola, {CURRENT_USER.nombre}
          </h1>
        </div>
        <Link to="/pedidos/nuevo">
          <Button size="sm" className="gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" />
            Nuevo pedido
          </Button>
        </Link>
      </motion.header>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {KPIs.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
          >
            <Link to={kpi.to} className="block h-full group">
              <Card className="p-5 h-full transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-lifted hover:border-border-strong">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                    {kpi.label}
                  </p>
                  <kpi.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="tabular text-2xl font-semibold tracking-tight">{kpi.value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{kpi.delta}</p>
              </Card>
            </Link>
          </motion.div>
        ))}
      </section>

      {/* Pedidos recientes */}
      <Card>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <p className="text-[13px] font-semibold">
            {hayDeHoy ? "Pedidos de hoy" : "Últimos pedidos"}
          </p>
          <Link
            to="/pedidos"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver todos
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <ul>
          {PEDIDOS.map((p, i) => (
            <li
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
              className={`flex items-center gap-4 px-6 py-3.5 hover:bg-secondary/40 transition-colors cursor-pointer ${
                i !== PEDIDOS.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-[13px] font-medium">{p.cliente}</p>
                <p className="mt-0.5 tabular text-[10px] text-muted-foreground">{p.nro}</p>
              </div>
              <Badge variant={estadoVariant[p.estado]} className="text-[10px]">
                {p.estado}
              </Badge>
              <p className="tabular text-[13px] font-semibold w-24 text-right">
                {formatCurrency(p.total)}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Separator className="my-10" />

      {/* Clientes destacados */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-semibold">Mis clientes</p>
          <Link
            to="/clientes"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver los {CLIENTES.length}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CLIENTES.slice(0, 4).map((c) => (
            <button
              key={c.codigo}
              onClick={() => setSelectedCliente(c.codigo)}
              className="group text-left rounded-lg border border-border bg-surface shadow-card p-3.5 transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lifted"
            >
              <p className="text-[13px] font-medium truncate group-hover:text-primary transition-colors">
                {c.razonSocial}
              </p>
              <p className="mt-1 tabular text-[10px] text-muted-foreground">RUC {c.ruc}</p>
              <div className="mt-2 flex items-center gap-1.5">
                {c.preferencial && (
                  <Badge variant="success" className="text-[9px] px-1 py-0 h-4">
                    Preferencial
                  </Badge>
                )}
                {c.distribuidor && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                    Distribuidor
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      <ClienteDrawer
        clienteId={selectedCliente}
        onClose={() => setSelectedCliente(null)}
      />
      <PedidoDrawer
        pedidoId={selectedPedido}
        onClose={() => setSelectedPedido(null)}
      />
    </div>
  );
}
