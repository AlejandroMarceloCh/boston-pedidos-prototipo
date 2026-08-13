// RF-24 + RF-64 · Lo que el sistema sabe y nadie estaba mirando.
//
//   *"se tiene que generar información de las ventas, del almacén, de todo"*
//
// Dos lecturas distintas sobre los mismos datos:
//   · Demanda no atendida — qué se pidió y no se pudo vender. Es lo que el
//     split pedido/solicitud (RF-20) hace posible registrar, y lo que la
//     reunión conecta con producción.
//   · Ventas y almacén — cómo viene el mes y qué SKUs están por quebrar.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PackageSearch, TrendingDown, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COLORS, SKUS } from "@/lib/mock-data";
import { cn, formatCurrency } from "@/lib/utils";
import { useStore } from "@/store/app-store";
import { useStock } from "@/store/hooks";
import {
  demandaNoAtendida,
  demandaPorArticulo,
  resumenesPedidos,
} from "@/store/selectors";
import { condicionLabel } from "@/features/pedidos/pedido-data";

type Vista = "demanda" | "ventas" | "almacen";

export default function InformesPage() {
  const { state } = useStore();
  const { disponible } = useStock();
  const [vista, setVista] = useState<Vista>("demanda");

  const demanda = useMemo(() => demandaNoAtendida(state), [state]);
  const porArticulo = useMemo(() => demandaPorArticulo(state), [state]);
  const pedidos = useMemo(() => resumenesPedidos(state), [state]);

  const totalDemanda = demanda.reduce((a, d) => a + d.unidades, 0);
  const montoDemanda = demanda.reduce((a, d) => a + d.monto, 0);

  return (
    <div className="mx-auto max-w-7xl px-7 lg:px-12 py-10 animate-fade-in">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Informes
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Qué se vendió y qué no se pudo vender
        </h1>
      </header>

      <Tabs value={vista} onValueChange={(v) => setVista(v as Vista)} className="mb-5">
        <TabsList>
          <TabsTrigger value="demanda">Demanda no atendida</TabsTrigger>
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
          <TabsTrigger value="almacen">Almacén</TabsTrigger>
        </TabsList>
      </Tabs>

      {vista === "demanda" && (
        <DemandaNoAtendida
          demanda={demanda}
          porArticulo={porArticulo}
          totalUnidades={totalDemanda}
          monto={montoDemanda}
        />
      )}
      {vista === "ventas" && <Ventas pedidos={pedidos} state={state} />}
      {vista === "almacen" && <Almacen disponible={disponible} demanda={demanda} />}
    </div>
  );
}

// ===== RF-24 · Demanda no atendida =====

function DemandaNoAtendida({
  demanda,
  porArticulo,
  totalUnidades,
  monto,
}: {
  demanda: ReturnType<typeof demandaNoAtendida>;
  porArticulo: ReturnType<typeof demandaPorArticulo>;
  totalUnidades: number;
  monto: number;
}) {
  if (demanda.length === 0) {
    return (
      <Card className="py-16 text-center">
        <PackageSearch className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium">No hay demanda sin atender</p>
        <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
          Cuando un pedido incluya más unidades de las que hay en stock, el excedente
          queda registrado como solicitud y aparece acá.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            Unidades pedidas sin stock
          </p>
          <p className="mt-1 tabular text-2xl font-semibold tracking-tight">
            {totalUnidades.toLocaleString("es-PE")}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {Math.floor(totalUnidades / 12).toLocaleString("es-PE")} docenas
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            Venta no realizada
          </p>
          <p className="mt-1 tabular text-2xl font-semibold tracking-tight">
            {formatCurrency(monto)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">A precio de lista</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            SKUs involucrados
          </p>
          <p className="mt-1 tabular text-2xl font-semibold tracking-tight">
            {demanda.length}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            en {porArticulo.length} {porArticulo.length === 1 ? "artículo" : "artículos"}
          </p>
        </Card>
      </div>

      {/* Por artículo: es la unidad en la que se produce */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="text-[13px] font-semibold">Qué reponer primero</p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            Agrupado por artículo, que es como se fabrica.
          </p>
        </div>
        <ul>
          {porArticulo.map((a, i) => {
            const maximo = porArticulo[0].unidades;
            return (
              <li
                key={a.articulo}
                className={cn(
                  "px-6 py-3.5",
                  i !== porArticulo.length - 1 && "border-b border-border"
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="tabular shrink-0 h-8 w-10 rounded-md bg-secondary flex items-center justify-center text-[12px] font-medium text-foreground/70">
                      {a.articulo}
                    </span>
                    <span className="text-[13px] truncate">
                      {SKUS.find((s) => s.articulo === a.articulo)?.descripcion ??
                        `Artículo ${a.articulo}`}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="tabular text-[14px] font-semibold">
                      {a.unidades.toLocaleString("es-PE")} und
                    </p>
                    <p className="tabular text-[10.5px] text-muted-foreground">
                      {formatCurrency(a.monto)} · {a.skus} SKUs
                    </p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-warning"
                    style={{ width: `${(a.unidades / maximo) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Detalle por SKU */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="text-[13px] font-semibold">Detalle por variante</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                <th className="text-left font-medium uppercase tracking-widest text-[10px] px-6 py-2.5">
                  Variante
                </th>
                <th className="text-right font-medium uppercase tracking-widest text-[10px] py-2.5">
                  Pedidas
                </th>
                <th className="text-right font-medium uppercase tracking-widest text-[10px] py-2.5">
                  Hay hoy
                </th>
                <th className="text-right font-medium uppercase tracking-widest text-[10px] py-2.5">
                  Clientes
                </th>
                <th className="text-right font-medium uppercase tracking-widest text-[10px] px-6 py-2.5">
                  Venta perdida
                </th>
              </tr>
            </thead>
            <tbody>
              {demanda.map((d) => (
                <tr key={d.sku} className="border-b border-border last:border-0">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-5 w-5 rounded-md border border-black/10 shrink-0"
                        style={{ backgroundColor: COLORS[d.color]?.hex }}
                        aria-hidden="true"
                      />
                      <span>
                        <span className="block text-[13px]">
                          {COLORS[d.color]?.name ?? d.color} · Talla {d.talla}
                        </span>
                        <span className="block font-mono text-[10.5px] text-muted-foreground">
                          {d.sku}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-right tabular font-semibold text-warning">
                    {d.unidades}
                  </td>
                  <td className="py-3 text-right tabular text-muted-foreground">
                    {d.disponible}
                  </td>
                  <td className="py-3 text-right tabular text-muted-foreground">
                    {d.clientes.length}
                  </td>
                  <td className="px-6 py-3 text-right tabular font-medium">
                    {formatCurrency(d.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ===== RF-64 · Ventas =====

function Ventas({
  pedidos,
  state,
}: {
  pedidos: ReturnType<typeof resumenesPedidos>;
  state: ReturnType<typeof useStore>["state"];
}) {
  const vivos = pedidos.filter((p) => p.estado !== "anulado");
  const facturado = vivos
    .filter((p) => p.estado === "facturado" || p.estado === "entregado")
    .reduce((a, p) => a + p.total, 0);
  const comprometido = vivos
    .filter((p) => p.estado === "confirmado")
    .reduce((a, p) => a + p.total, 0);

  // Por cliente, para saber quién sostiene el mes.
  const porCliente = new Map<string, { cliente: string; pedidos: number; monto: number }>();
  for (const p of vivos) {
    const previo = porCliente.get(p.cliente);
    if (previo) {
      previo.pedidos += 1;
      previo.monto += p.total;
    } else {
      porCliente.set(p.cliente, { cliente: p.cliente, pedidos: 1, monto: p.total });
    }
  }
  const ranking = [...porCliente.values()].sort((a, b) => b.monto - a.monto);

  // Por condición de venta: cuánto entra al contado y cuánto queda a crédito.
  const porCondicion = new Map<string, number>();
  for (const r of vivos) {
    const p = state.pedidos[r.nro];
    const cond = condicionLabel(p?.condicion);
    porCondicion.set(cond, (porCondicion.get(cond) ?? 0) + r.total);
  }

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            Facturado
          </p>
          <p className="mt-1 tabular text-2xl font-semibold tracking-tight">
            {formatCurrency(facturado)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            Comprometido sin facturar
          </p>
          <p className="mt-1 tabular text-2xl font-semibold tracking-tight">
            {formatCurrency(comprometido)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            Pedidos vivos
          </p>
          <p className="mt-1 tabular text-2xl font-semibold tracking-tight">
            {vivos.length}
          </p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <p className="text-[13px] font-semibold">Por cliente</p>
          </div>
          <ul>
            {ranking.map((c, i) => (
              <li
                key={c.cliente}
                className={cn(
                  "flex items-center justify-between gap-3 px-6 py-3",
                  i !== ranking.length - 1 && "border-b border-border"
                )}
              >
                <span className="text-[13px] truncate">{c.cliente}</span>
                <span className="text-right shrink-0">
                  <span className="block tabular text-[13px] font-semibold">
                    {formatCurrency(c.monto)}
                  </span>
                  <span className="block tabular text-[10.5px] text-muted-foreground">
                    {c.pedidos} {c.pedidos === 1 ? "pedido" : "pedidos"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <p className="text-[13px] font-semibold">Por condición de venta</p>
          </div>
          <ul>
            {[...porCondicion.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([cond, monto], i, arr) => (
                <li
                  key={cond}
                  className={cn(
                    "flex items-center justify-between gap-3 px-6 py-3",
                    i !== arr.length - 1 && "border-b border-border"
                  )}
                >
                  <span className="text-[13px]">{cond}</span>
                  <span className="tabular text-[13px] font-semibold">
                    {formatCurrency(monto)}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

// ===== RF-64 · Almacén =====

function Almacen({
  disponible,
  demanda,
}: {
  disponible: (sku: string) => number;
  demanda: ReturnType<typeof demandaNoAtendida>;
}) {
  // Un SKU está por quebrar si no alcanza para una docena.
  const criticos = SKUS.map((s) => ({ ...s, libre: disponible(s.codigo) }))
    .filter((s) => s.libre < 12)
    .sort((a, b) => a.libre - b.libre);

  const conDemanda = new Set(demanda.map((d) => d.sku));
  const total = SKUS.reduce((a, s) => a + disponible(s.codigo), 0);

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            Unidades disponibles
          </p>
          <p className="mt-1 tabular text-2xl font-semibold tracking-tight">
            {total.toLocaleString("es-PE")}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            SKUs bajo una docena
          </p>
          <p className="mt-1 tabular text-2xl font-semibold tracking-tight">
            {criticos.length}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">de {SKUS.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            Quebrados con demanda
          </p>
          <p className="mt-1 tabular text-2xl font-semibold tracking-tight text-warning">
            {criticos.filter((s) => conDemanda.has(s.codigo)).length}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Sin stock y alguien los pidió
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <p className="text-[13px] font-semibold">Stock crítico</p>
          <Link
            to="/catalogo"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver catálogo
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {criticos.length === 0 ? (
          <div className="py-14 text-center text-[13px] text-muted-foreground">
            Ningún SKU por debajo de una docena.
          </div>
        ) : (
          <ul className="max-h-[520px] overflow-auto">
            {criticos.slice(0, 40).map((s, i, arr) => (
              <li
                key={s.codigo}
                className={cn(
                  "flex items-center justify-between gap-3 px-6 py-3",
                  i !== arr.length - 1 && "border-b border-border"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="h-5 w-5 rounded-md border border-black/10 shrink-0"
                    style={{ backgroundColor: COLORS[s.color]?.hex }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] truncate">{s.descripcion}</span>
                    <span className="block font-mono text-[10.5px] text-muted-foreground">
                      {s.codigo}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {conDemanda.has(s.codigo) && (
                    <Badge variant="warning" className="gap-1">
                      <TrendingDown className="h-3 w-3" />
                      Pedido sin stock
                    </Badge>
                  )}
                  <span
                    className={cn(
                      "tabular text-[13px] font-semibold w-16 text-right",
                      s.libre === 0 ? "text-destructive" : "text-warning"
                    )}
                  >
                    {s.libre === 0 ? "agotado" : `${s.libre} und`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {criticos.length > 40 && (
          <div className="px-6 py-3 border-t border-border text-[11.5px] text-muted-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Se muestran los 40 más críticos de {criticos.length}.
          </div>
        )}
      </Card>
    </div>
  );
}
