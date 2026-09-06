import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  MapPin,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";

type Metric = { label: string; value: string; note: string; tone?: "red" | "amber" };

const monthly = [
  { month: "Abr", venta: 1980, objetivo: 2100 },
  { month: "May", venta: 2240, objetivo: 2200 },
  { month: "Jun", venta: 2110, objetivo: 2250 },
  { month: "Jul", venta: 2480, objetivo: 2350 },
  { month: "Ago", venta: 2310, objetivo: 2400 },
  { month: "Sep", venta: 2840, objetivo: 2550 },
];

const requests = [
  { id: "SOL-2048", client: "Grupo Chávez", detail: "718 · 80 doc. · Contado", age: "19 h", amount: 118400, availability: 72, priority: "Alta" },
  { id: "SOL-2056", client: "Comercial Rivera", detail: "3 artículos · Letras", age: "7 h", amount: 74200, availability: 100, priority: "Media" },
  { id: "SOL-2061", client: "Distribuciones Lima Sur", detail: "642 · 22 doc. · Crédito", age: "4 h", amount: 39800, availability: 64, priority: "Media" },
];

const clients = [
  { client: "Grupo Chávez", channel: "Mayorista", last: 92400, change: -38, signal: "Recuperar" },
  { client: "Distribuciones Lima Sur", channel: "Mayorista", last: 47800, change: 12, signal: "Crece" },
  { client: "Comercial Rivera", channel: "Provincia", last: 31200, change: 24, signal: "Oportunidad" },
  { client: "Inversiones Mar Azul", channel: "Online", last: 28600, change: -8, signal: "Observar" },
];

function Metrics({ items }: { items: Metric[] }) {
  return (
    <section className="brand-metric-grid">
      {items.map((item) => (
        <article key={item.label} className="brand-metric">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small className={cn(item.tone === "red" && "text-brand-red", item.tone === "amber" && "text-amber-700")}>{item.note}</small>
        </article>
      ))}
    </section>
  );
}

function Status({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "green" | "amber" | "red" }) {
  return <span className={`brand-status brand-status-${tone}`}><i />{children}</span>;
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <header className="brand-page-heading">
      <div><p>{eyebrow}</p><h1>{title}</h1><span>{subtitle}</span></div>
      {action}
    </header>
  );
}

export function ClienteHome() {
  const [search, setSearch] = useState("");
  const products = [
    { code: "718", name: "Bikini deportivo", colors: "Negro · Acero · Azul", status: "Disponible", tone: "green" as const },
    { code: "879", name: "Bikini pack x3", colors: "Blanco · Rojo · Marino", status: "Parcial", tone: "amber" as const },
    { code: "642", name: "Bóxer corto a la cadera", colors: "Listado azul", status: "Bajo solicitud", tone: "red" as const },
  ].filter((p) => `${p.code} ${p.name}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="brand-page">
      <PageHeading eyebrow="Portal mayorista" title="Compra Boston para tu negocio." subtitle="Consulta, solicita y sigue tus pedidos desde un solo lugar." action={<Button asChild className="brand-primary"><Link to="/pedidos/nuevo"><Plus />Crear solicitud</Link></Button>} />
      <Metrics items={[{ label: "Pedido en preparación", value: "BO-01842", note: "Entrega estimada 12 SEP" }, { label: "Solicitudes abiertas", value: "02", note: "Respuesta prevista hoy" }, { label: "Compra del mes", value: "S/ 184K", note: "+12% frente a agosto" }, { label: "Siguiente beneficio", value: "S/ 16K", note: "para alcanzar el próximo tramo", tone: "amber" }]} />
      <div className="brand-two-columns">
        <section className="brand-panel">
          <div className="brand-panel-heading"><div><span>Pedido BO-01842</span><small>Actualizado hace 12 minutos</small></div><Status tone="green">En preparación</Status></div>
          <div className="brand-order-track">{["Confirmado", "Preparación", "Despacho", "En ruta", "Entregado"].map((step, index) => <div key={step} className={cn("brand-order-step", index < 2 && "done", index === 2 && "current")}><i>{index < 2 ? <Check /> : index + 1}</i><span>{step}</span></div>)}</div>
          <div className="brand-table-wrap"><table className="brand-table"><thead><tr><th>Artículo</th><th>Pedido</th><th>Atención</th></tr></thead><tbody><tr><td><strong>718</strong> · Bikini deportivo / Negro</td><td>48 doc.</td><td><Status tone="green">Completo</Status></td></tr><tr><td><strong>879</strong> · Pack x3 / Azul</td><td>18 doc.</td><td><Status tone="amber">12 + 6 pendientes</Status></td></tr><tr><td><strong>642</strong> · Bóxer corto / Marino</td><td>8 doc.</td><td><Status tone="green">Completo</Status></td></tr></tbody></table></div>
        </section>
        <section className="brand-panel">
          <div className="brand-panel-heading"><div><span>Catálogo rápido</span><small>Sin mostrar cantidades internas</small></div></div>
          <div className="relative px-4 pt-4"><Search className="absolute left-7 top-7 h-4 w-4 text-muted-foreground"/><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Artículo o código" className="pl-9" /></div>
          <div className="brand-product-list">{products.map((p) => <button key={p.code}><span className="brand-product-thumb"><ShoppingBag /></span><span><strong>{p.code} · {p.name}</strong><small>{p.colors}</small></span><Status tone={p.tone}>{p.status}</Status></button>)}</div>
        </section>
      </div>
    </div>
  );
}

export function VendedorHome() {
  return (
    <div className="brand-page">
      <PageHeading eyebrow="Gestión de ventas" title="Hay 7 oportunidades por cerrar." subtitle="Tu cartera y tus solicitudes, priorizadas para hoy." action={<Button asChild className="brand-primary"><Link to="/pedidos/nuevo"><Plus />Nuevo pedido</Link></Button>} />
      <Metrics items={[{ label: "Venta del mes", value: "S/ 486K", note: "81% de la meta" }, { label: "Solicitudes por validar", value: "07", note: "3 llegaron hoy" }, { label: "Clientes con caída", value: "04", note: "requieren contacto", tone: "red" }, { label: "Pedidos completos", value: "87%", note: "+6 puntos este mes" }]} />
      <div className="brand-two-columns">
        <section className="brand-panel"><div className="brand-panel-heading"><div><span>Clientes que requieren atención</span><small>Ordenados por oportunidad</small></div><Link to="/clientes">Ver cartera <ArrowRight /></Link></div><div className="brand-table-wrap"><table className="brand-table"><thead><tr><th>Cliente</th><th>Señal</th><th>Última compra</th><th></th></tr></thead><tbody>{clients.slice(0,3).map(c => <tr key={c.client}><td><strong>{c.client}</strong><small className="block">{c.channel}</small></td><td><Status tone={c.change < 0 ? "red" : "green"}>{c.change > 0 ? "+" : ""}{c.change}%</Status></td><td>{formatCurrency(c.last)}</td><td><button className="brand-link">Abrir <ChevronRight /></button></td></tr>)}</tbody></table></div></section>
        <section className="brand-panel"><div className="brand-panel-heading"><div><span>Solicitud rápida</span><small>Grupo Chávez · línea disponible S/ 86,500</small></div></div><div className="brand-quick-order"><div><span>718 · Negro</span><small>M 12 · L 18 · XL 12</small><strong>42 doc.</strong></div><div><span>642 · Marino</span><small>M 6 · L 8</small><strong>14 doc.</strong></div><aside><Sparkles /><span><strong>Próximo beneficio</strong><small>Faltan S/ 16,000 en productos atendibles.</small></span></aside><Button asChild className="brand-primary w-full"><Link to="/pedidos/nuevo">Continuar pedido <ArrowRight /></Link></Button></div></section>
      </div>
    </div>
  );
}

export function MesaHome() {
  const [selected, setSelected] = useState(requests[0]);
  return (
    <div className="brand-page">
      <PageHeading eyebrow="Mesa comercial" title="18 solicitudes esperan decisión." subtitle="Prioridad, disponibilidad y crédito en una sola vista." action={<Button className="brand-primary" onClick={() => setSelected(requests[(requests.indexOf(selected)+1)%requests.length])}>Revisar siguiente <ArrowRight /></Button>} />
      <Metrics items={[{ label: "Valor en cola", value: "S/ 624K", note: "18 solicitudes" }, { label: "Con riesgo de stock", value: "06", note: "3 SKU críticos", tone: "red" }, { label: "Retenido por crédito", value: "S/ 91K", note: "3 clientes", tone: "amber" }, { label: "Espera máxima", value: "19 h", note: "dentro del SLA" }]} />
      <div className="brand-two-columns mesa-columns">
        <section className="brand-panel"><div className="brand-panel-heading"><div><span>Cola de aprobación</span><small>Prioridad sugerida · decisión humana</small></div></div><div className="brand-request-list">{requests.map(r => <button key={r.id} onClick={() => setSelected(r)} className={cn(selected.id === r.id && "selected")}><i className={r.priority === "Alta" ? "high" : ""}/><span><strong>{r.id} · {r.client}</strong><small>{r.detail} · hace {r.age}</small></span><em>{formatCurrency(r.amount)}<small>{r.availability}% atendible</small></em></button>)}</div></section>
        <section className="brand-panel"><div className="brand-panel-heading"><div><span>{selected.id}</span><small>Evaluación de disponibilidad</small></div><Status tone={selected.availability === 100 ? "green" : "amber"}>{selected.availability}% atendible</Status></div><div className="brand-decision"><div className="brand-decision-client"><Users /><span><strong>{selected.client}</strong><small>Línea disponible S/ 142,000 · Sin deuda vencida</small></span></div><div className="brand-allocation"><span>Solicitado <strong>80 doc.</strong></span><span>Aprobar ahora <strong>{Math.round(80*selected.availability/100)} doc.</strong></span><span>Pendiente <strong>{80-Math.round(80*selected.availability/100)} doc.</strong></span></div><div className="brand-callout"><AlertTriangle /><span><strong>Regla aplicada</strong><small>Orden de llegada + capacidad de completar el pedido. Toda excepción queda registrada.</small></span></div><div className="grid grid-cols-2 gap-2"><Button variant="outline">Observar</Button><Button className="brand-primary">Aprobar asignación</Button></div></div></section>
      </div>
    </div>
  );
}

type ClientRow = typeof clients[number];
const columnHelper = createColumnHelper<ClientRow>();

export function ComercialHome() {
  const [sorting, setSorting] = useState<SortingState>([{ id: "change", desc: false }]);
  const columns = useMemo(() => [
    columnHelper.accessor("client", { header: "Cliente", cell: info => <strong>{info.getValue()}</strong> }),
    columnHelper.accessor("channel", { header: "Canal" }),
    columnHelper.accessor("last", { header: "Última compra", cell: info => formatCurrency(info.getValue()) }),
    columnHelper.accessor("change", { header: "Variación", cell: info => <Status tone={info.getValue() < 0 ? "red" : "green"}>{info.getValue() > 0 ? "+" : ""}{info.getValue()}%</Status> }),
    columnHelper.accessor("signal", { header: "Señal" }),
  ], []);
  const table = useReactTable({ data: clients, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });
  return (
    <div className="brand-page">
      <PageHeading eyebrow="Mercadeo Comercial S.A." title="Ventas, demanda y territorio." subtitle="Septiembre 2026 · Todos los canales · Comparación interanual" action={<Button variant="outline"><CalendarDays />Septiembre 2026</Button>} />
      <Metrics items={[{ label: "Venta neta", value: "S/ 2.84M", note: "+9.4% interanual" }, { label: "Demanda no atendida", value: "S/ 318K", note: "11.2% de lo solicitado", tone: "red" }, { label: "Clientes activos", value: "146", note: "8 reactivados" }, { label: "Pedidos completos", value: "84%", note: "meta 90%", tone: "amber" }]} />
      <div className="brand-two-columns commercial-top"><section className="brand-panel"><div className="brand-panel-heading"><div><span>Venta mensual por canal</span><small>Miles de soles</small></div><Status tone="green">+9.4%</Status></div><div className="brand-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthly} margin={{ top: 18, right: 20, left: -8, bottom: 0 }}><defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1a266a" stopOpacity={0.24}/><stop offset="95%" stopColor="#1a266a" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e7e7"/><XAxis dataKey="month" tickLine={false} axisLine={false}/><YAxis tickLine={false} axisLine={false}/><Tooltip formatter={(value) => [`S/ ${value}K`, "Venta"]}/><Area type="monotone" dataKey="objetivo" stroke="#b9bdcf" fill="none" strokeDasharray="5 5"/><Area type="monotone" dataKey="venta" stroke="#1a266a" strokeWidth={3} fill="url(#salesFill)"/></AreaChart></ResponsiveContainer></div></section><section className="brand-panel"><div className="brand-panel-heading"><div><span>Territorio de entrega</span><small>182 puntos activos</small></div><MapPin /></div><div className="brand-territory"><span className="district d1">Lima Centro<b>68</b></span><span className="district d2">Lima Sur<b>42</b></span><span className="district d3">Lima Norte<b>37</b></span><span className="district d4">Provincias<b>35</b></span></div></section></div>
      <section className="brand-panel mt-4"><div className="brand-panel-heading"><div><span>Señales por cliente</span><small>Haz clic en un encabezado para ordenar</small></div><button className="brand-link"><TrendingDown />Ver clientes inactivos</button></div><div className="brand-table-wrap"><table className="brand-table"><thead>{table.getHeaderGroups().map(group => <tr key={group.id}>{group.headers.map(header => <th key={header.id} onClick={header.column.getToggleSortingHandler()} className="cursor-pointer">{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map(row => <tr key={row.id}>{row.getVisibleCells().map(cell => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div></section>
    </div>
  );
}
