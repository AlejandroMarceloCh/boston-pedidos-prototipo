import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Send,
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
import { useStore } from "@/store/app-store";
import { useClientPortalStore, type ClientRequest } from "@/store/client-portal-store";

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

const catalogProducts = [
  { code: "PAPH", name: "Pack Pijama Hombre", category: "Hombre", detail: "Polo manga corta + pantalón", image: "/products/pijama-hombre.jpg", stock: "Disponible" },
  { code: "PAPM", name: "Pack Pijama Mujer", category: "Mujer", detail: "Polo manga corta + pantalón", image: "/products/pijama-mujer.jpg", stock: "Disponible" },
  { code: "642L", name: "Bóxer Corto a la Cadera", category: "Hombre", detail: "Listado azul", image: "/products/boxer-642l.jpg", stock: "Disponible" },
  { code: "135", name: "Medias Casuales Pack x3", category: "Medias", detail: "Box 1 · tres pares", image: "/products/medias-casuales.jpg", stock: "Disponible" },
  { code: "136", name: "Medias Deportivas Colores Pack x3", category: "Medias", detail: "Box 1 · tres pares", image: "/products/medias-deportivas.jpg", stock: "Disponible" },
  { code: "510V", name: "Pantalón Palazzo Mujer", category: "Mujer", detail: "Algodón viscosa · negro", image: "/products/palazzo-mujer.png", stock: "Bajo solicitud" },
  { code: "500V", name: "Camisón Oversize Mujer", category: "Mujer", detail: "Algodón viscosa · acero", image: "/products/camison-mujer.png", stock: "Disponible" },
  { code: "250", name: "Bikini Mujer Pack x3", category: "Mujer", detail: "Elástico visible · cobalto", image: "/products/bikini-mujer.png", stock: "Disponible" },
  { code: "718", name: "Bikini Deportivo Niños Pack x3", category: "Niños", detail: "Elástico visible · blanco", image: "/products/bikini-nino.png", stock: "Disponible" },
  { code: "720", name: "Camiseta Clásica Niños Pack x3", category: "Niños", detail: "Sin mangas · blanco", image: "/products/camiseta-nino.png", stock: "Disponible" },
  { code: "310", name: "Trusa Clásica Niñas Pack x3", category: "Niñas", detail: "Tejido rib · blanco", image: "/products/trusa-nina.png", stock: "Disponible" },
  { code: "320", name: "Camiseta sin Mangas Niñas", category: "Niñas", detail: "Algodón · blanco", image: "/products/camiseta-nina.png", stock: "Disponible" },
];
const emptyClientCart: Record<string, number> = {};
const emptyClientRequests: ClientRequest[] = [];

export function ClienteHome() {
  const { state } = useStore();
  const user = state.sesion ?? "cliente.boston";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const cart = useClientPortalStore((store) => store.carts[user] ?? emptyClientCart);
  const requests = useClientPortalStore((store) => store.requests[user] ?? emptyClientRequests);
  const setQuantity = useClientPortalStore((store) => store.setQuantity);
  const categories = ["Todos", "Hombre", "Mujer", "Niños", "Niñas", "Medias"];
  const products = catalogProducts.filter((product) => {
    const matchesCategory = category === "Todos" || product.category === category;
    const term = search.trim().toLowerCase();
    return matchesCategory && (!term || `${product.code} ${product.name} ${product.detail}`.toLowerCase().includes(term));
  });
  const cartCount = Object.values(cart).reduce((total, quantity) => total + quantity, 0);
  const updateCart = (code: string, change: number) => setQuantity(user, code, (cart[code] ?? 0) + change);

  return (
    <div className="brand-page client-catalog-page">
      <section className="client-catalog-head">
        <div><p>CATÁLOGO MAYORISTA</p><h1>¿Qué quieres comprar hoy?</h1><span>Elige tus productos y cantidades. Nosotros confirmaremos disponibilidad, precio y fecha de entrega.</span></div>
        {requests[0] && <div className="client-order-resume"><span><i /> {requests[0].id} · Solicitud enviada</span><small>Solo tú puedes consultar esta solicitud.</small></div>}
      </section>

      <section className="client-catalog-tools" aria-label="Buscar y filtrar productos">
        <div className="client-search"><Search /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por producto, código o color" /></div>
        <div className="client-categories">{categories.map((item) => <button key={item} className={cn(category === item && "active")} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <Button asChild className={cn("client-cart-button", cartCount > 0 && "has-items")}><Link to="/cliente/solicitud"><ShoppingCart /><span>Mi solicitud</span><b>{cartCount}</b></Link></Button>
      </section>

      <div className="client-results-row"><span><strong>{products.length}</strong> productos</span><small>Fotografías y nombres del catálogo oficial Boston</small></div>
      <section className="client-product-grid">
        {products.map((product) => {
          const quantity = cart[product.code] ?? 0;
          return <article key={product.code} className="client-product-card">
            <div className="client-product-image"><img src={product.image} alt={product.name} loading="lazy" /><span className={cn(product.stock !== "Disponible" && "limited")}>{product.stock}</span></div>
            <div className="client-product-copy"><small>{product.category} · Cód. {product.code}</small><h2>{product.name}</h2><p>{product.detail}</p></div>
            {quantity === 0 ? <button className="client-add-product" onClick={() => updateCart(product.code, 1)}><Plus /> Agregar a solicitud</button> : <div className="client-quantity"><button aria-label={`Quitar ${product.name}`} onClick={() => updateCart(product.code, -1)}><Minus /></button><label><input aria-label={`Cantidad de ${product.name}`} type="number" min="1" value={quantity} onChange={(event) => setQuantity(user, product.code, Number(event.target.value))} onDoubleClick={(event) => event.currentTarget.select()} /><small>unidades</small></label><button aria-label={`Agregar otro ${product.name}`} onClick={() => updateCart(product.code, 1)}><Plus /></button></div>}
          </article>;
        })}
      </section>
      {products.length === 0 && <div className="client-empty"><Search /><strong>No encontramos ese producto</strong><span>Prueba con otro nombre, código o categoría.</span></div>}
      {cartCount > 0 && <aside className="client-floating-cart"><div><ShoppingCart /><span><strong>{cartCount} {cartCount === 1 ? "unidad" : "unidades"}</strong><small>Doble clic sobre una cantidad para escribirla</small></span></div><Button asChild className="brand-primary"><Link to="/cliente/solicitud">Revisar solicitud <ArrowRight /></Link></Button></aside>}
    </div>
  );
}

export function ClienteCart() {
  const { state } = useStore();
  const user = state.sesion ?? "cliente.boston";
  const cart = useClientPortalStore((store) => store.carts[user] ?? emptyClientCart);
  const requests = useClientPortalStore((store) => store.requests[user] ?? emptyClientRequests);
  const setQuantity = useClientPortalStore((store) => store.setQuantity);
  const submitRequest = useClientPortalStore((store) => store.submitRequest);
  const [sentId, setSentId] = useState<string | null>(null);
  const selected = catalogProducts.filter((product) => (cart[product.code] ?? 0) > 0);
  const totalUnits = selected.reduce((sum, product) => sum + cart[product.code], 0);

  if (sentId) return <div className="client-request-page"><section className="client-request-success"><CheckCircle2 /><p>SOLICITUD ENVIADA</p><h1>{sentId}</h1><span>Tu vendedor revisará disponibilidad, precio y fechas de entrega.</span><div><strong>¿Qué sigue?</strong><p>Recibirás una cotización indicando qué productos pueden entregarse, en qué cantidades y para qué fecha. Nada se factura hasta que aceptes esa propuesta.</p></div><Button asChild className="brand-primary"><Link to="/cliente">Volver al catálogo <ArrowRight /></Link></Button></section></div>;

  return <div className="client-request-page">
    <Link to="/cliente" className="client-back"><ArrowLeft /> Seguir comprando</Link>
    <header className="client-request-head"><div><p>MI SOLICITUD</p><h1>Revisa antes de enviar</h1><span>Solicitud privada de Comercial Demo Norte</span></div><strong>{totalUnits}<small> unidades solicitadas</small></strong></header>
    {selected.length ? <div className="client-request-layout"><section className="client-request-list">{selected.map((product) => <article key={product.code}><img src={product.image} alt="" /><div><small>{product.category} · Cód. {product.code}</small><h2>{product.name}</h2><p>{product.detail}</p></div><label><span>Cantidad</span><input type="number" min="1" value={cart[product.code]} onChange={(event) => setQuantity(user, product.code, Number(event.target.value))} /></label><button aria-label={`Eliminar ${product.name}`} onClick={() => setQuantity(user, product.code, 0)}>Quitar</button></article>)}</section><aside className="client-request-summary"><p>RESUMEN</p><h2>{selected.length} productos</h2><div><span>Unidades solicitadas</span><strong>{totalUnits}</strong></div><div><span>Cliente</span><strong>Comercial Demo Norte</strong></div><div><span>Estado al enviar</span><strong>Pendiente de cotización</strong></div><p className="client-request-note">El precio final, la disponibilidad y las fechas serán confirmados por tu vendedor.</p><Button className="brand-primary w-full" onClick={() => { const request = submitRequest(user); setSentId(request.id); }}><Send /> Enviar solicitud de compra</Button></aside></div> : <section className="client-empty-cart"><ShoppingCart /><h1>Tu solicitud está vacía</h1><p>Agrega productos desde el catálogo para comenzar.</p><Button asChild className="brand-primary"><Link to="/cliente">Ver productos</Link></Button></section>}
    {!selected.length && requests[0] && <small className="client-last-request">Última solicitud: {requests[0].id} · {requests[0].createdAt}</small>}
  </div>;
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
