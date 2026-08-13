import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Package, ShoppingCart, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerCloseButton,
} from "@/components/ui/drawer";
import { ARTICULOS, CLIENTES, SKUS, type Articulo } from "@/lib/mock-data";
import { cn, formatCurrency } from "@/lib/utils";
import { MatrizCarga, ResumenSeleccion } from "@/features/pedidos/matriz-carga";
import { useStore } from "@/store/app-store";
import { useStock } from "@/store/hooks";

const LINEAS = ["Todas", "BOSTON", "SWEET COTTON", "CLASSIC"] as const;
const GENEROS = [
  { id: "TODOS", label: "Todos" },
  { id: "CAB", label: "Caballeros" },
  { id: "DAM", label: "Damas" },
  { id: "NIN", label: "Niños" },
  { id: "UNI", label: "Unisex" },
];

export default function CatalogoPage() {
  const [query, setQuery] = useState("");
  const [linea, setLinea] = useState<(typeof LINEAS)[number]>("Todas");
  const [genero, setGenero] = useState("TODOS");
  const [articuloActivo, setArticuloActivo] = useState<Articulo | null>(null);
  const [params, setParams] = useSearchParams();

  // ?abrir=CODIGO — lo usa el buscador ⌘K para saltar directo a un artículo.
  useEffect(() => {
    const abrir = params.get("abrir");
    if (!abrir) return;
    const art = ARTICULOS.find((a) => a.codigo === abrir);
    if (art) setArticuloActivo(art);
    params.delete("abrir");
    setParams(params, { replace: true });
  }, [params, setParams]);

  const articulosFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ARTICULOS.filter((a) => {
      if (!a.activo) return false;
      if (linea !== "Todas" && a.linea !== linea) return false;
      if (genero !== "TODOS" && a.genero !== genero) return false;
      if (!q) return true;
      return (
        a.descripcion.toLowerCase().includes(q) ||
        a.codigo.includes(q) ||
        a.linea.toLowerCase().includes(q)
      );
    });
  }, [query, linea, genero]);

  return (
    <div className="mx-auto max-w-7xl px-7 lg:px-12 py-10 animate-fade-in">
      {/* Header */}
      <header className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            Catálogo Boston · {SKUS.length} SKUs activos
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Catálogo</h1>
        </div>
      </header>

      {/* Filtros */}
      <div className="space-y-3 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar artículo por nombre o código…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 rounded-md border border-border bg-muted/30 p-0.5">
            {LINEAS.map((l) => (
              <button
                key={l}
                onClick={() => setLinea(l)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-[5px] transition-colors",
                  linea === l
                    ? "bg-background text-foreground shadow-subtle"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {GENEROS.map((g) => (
            <button
              key={g.id}
              onClick={() => setGenero(g.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                genero === g.id
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de artículos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {articulosFiltrados.map((art) => (
          <ArticuloCard
            key={art.codigo}
            articulo={art}
            onSelect={() => setArticuloActivo(art)}
          />
        ))}
      </div>

      {articulosFiltrados.length === 0 && (
        <Card className="mt-4">
          <CardContent className="py-16 text-center">
            <Package className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">Sin artículos para tu búsqueda</p>
            <p className="mt-1 text-xs text-muted-foreground">
            Cambia los filtros o el término de búsqueda.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog de cuadrícula talla × color */}
      <CuadriculaDialog
        articulo={articuloActivo}
        onClose={() => setArticuloActivo(null)}
      />
    </div>
  );
}

// ===== Card de artículo =====
function ArticuloCard({
  articulo,
  onSelect,
}: {
  articulo: Articulo;
  onSelect: () => void;
}) {
  const { disponible: disponibleSku } = useStock();
  const skus = SKUS.filter((s) => s.articulo === articulo.codigo);
  // Descuenta lo que ya está comprometido por pedidos confirmados.
  const stockTotal = skus.reduce((acc, s) => acc + disponibleSku(s.codigo), 0);
  const disponible = skus.filter((s) => disponibleSku(s.codigo) > 0).length;
  const totalComb = skus.length;

  return (
    <button
      onClick={onSelect}
      className="group text-left rounded-lg border border-border bg-card shadow-subtle overflow-hidden hover:shadow-card hover:border-foreground/20 transition-all duration-200"
    >
      {/* Imagen / placeholder */}
      <div className="relative aspect-[4/5] bg-gradient-to-br from-muted/40 to-muted/20 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="tabular text-5xl font-semibold text-muted-foreground/30">
            {articulo.codigo}
          </span>
        </div>

        {/* Badge línea */}
        <div className="absolute top-2.5 left-2.5">
          <Badge variant="outline" className="bg-background/80 backdrop-blur text-[10px]">
            {articulo.linea}
          </Badge>
        </div>

        {/* Badge género */}
        <div className="absolute top-2.5 right-2.5">
          <Badge variant="secondary" className="text-[10px]">
            {articulo.genero}
          </Badge>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
          <span className="flex items-center justify-center gap-1.5 text-xs font-medium text-background">
            <ShoppingCart className="h-3.5 w-3.5" />
            Ver cuadrícula y agregar
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium tabular">
          Art. {articulo.codigo} · {articulo.subfamilia === "01" ? "Caballeros" : "Damas"}
        </p>
        <p className="mt-1 text-sm font-medium leading-snug line-clamp-2 min-h-[2.5rem]">
          {articulo.descripcion}
        </p>

        <div className="mt-2.5 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Precio ref.
            </p>
            <p className="tabular text-sm font-semibold">
              {formatCurrency(articulo.precioRef)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Disponible
            </p>
            <p className="tabular text-xs">
              <span className="font-semibold text-foreground">{disponible}</span>
              <span className="text-muted-foreground">/{totalComb}</span>
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                stockTotal > 100
                  ? "bg-success"
                  : stockTotal > 20
                  ? "bg-warning"
                  : "bg-destructive"
              )}
              style={{ width: `${Math.min(100, (stockTotal / 500) * 100)}%` }}
            />
          </div>
          <span className="tabular text-[10px] text-muted-foreground w-12 text-right">
            {stockTotal}
          </span>
        </div>
      </div>
    </button>
  );
}

// ===== Drawer con cuadrícula talla × color =====
function CuadriculaDialog({
  articulo,
  onClose,
}: {
  articulo: Articulo | null;
  onClose: () => void;
}) {
  // Las cantidades van en DOCENAS, igual que en el asistente: es la misma
  // matriz compartida.
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const navigate = useNavigate();
  const { state, guardarBorrador, setBorradorActivo } = useStore();

  const skus = articulo ? SKUS.filter((s) => s.articulo === articulo.codigo) : [];

  const close = () => {
    setCantidades({});
    onClose();
  };

  const totalDocenas = Object.values(cantidades).reduce((a, d) => a + d, 0);
  const totalUnidades = totalDocenas * 12;

  /** Vuelca lo cargado a un borrador real y lleva al asistente a terminarlo. */
  const agregarAlPedido = () => {
    const nuevas = Object.entries(cantidades)
      .filter(([, doc]) => doc > 0)
      .map(([codigo, doc]) => {
        const sku = skus.find((s) => s.codigo === codigo)!;
        return {
          sku: sku.codigo,
          descripcion: sku.descripcion,
          articulo: sku.articulo,
          talla: sku.talla,
          color: sku.color,
          cantidad: doc * 12,
          precio: sku.precio,
        };
      });
    if (nuevas.length === 0) return;

    // Si ya había un borrador en curso, se le suman las líneas en vez de
    // arrancar uno nuevo por cada artículo del catálogo.
    const activo = state.borradorActivo ? state.pedidos[state.borradorActivo] : undefined;
    const previas =
      activo?.estado === "borrador"
        ? activo.items.map((i) => {
            const sku = SKUS.find((s) => s.codigo === i.sku);
            return {
              sku: i.sku,
              descripcion: i.descripcion,
              articulo: i.articulo ?? sku?.articulo ?? "",
              talla: i.talla ?? sku?.talla ?? "",
              color: i.color ?? sku?.color ?? "",
              cantidad: i.cantidad,
              precio: i.precio,
            };
          })
        : [];

    const fusionadas = [...previas];
    for (const n of nuevas) {
      const i = fusionadas.findIndex((l) => l.sku === n.sku);
      if (i >= 0) fusionadas[i] = { ...fusionadas[i], cantidad: fusionadas[i].cantidad + n.cantidad };
      else fusionadas.push(n);
    }

    const nro = guardarBorrador({
      nro: activo?.estado === "borrador" ? activo.nro : null,
      cliente: activo?.clienteId
        ? CLIENTES.find((c) => c.codigo === activo.clienteId) ?? null
        : null,
      direccionId: activo?.direccionId ?? "1",
      lineas: fusionadas,
      aplicarInicial: activo?.aplicarInicial ?? true,
      slot3: activo?.slot3 ?? 0,
      nota: activo?.nota ?? "",
      // RF-17: desde el catálogo se arma un borrador, y un borrador todavía no
      // necesita fecha comprometida. Se conserva la que ya tuviera; se exige
      // recién al confirmar, en el paso 4 del asistente.
      fechaEntrega: activo?.fechaEntrega ?? "",
    });
    setBorradorActivo(nro);

    toast.success(`${totalDocenas} docenas agregadas al borrador ${nro}`, {
      description: `${totalUnidades} unidades · ${nuevas.length} variantes.`,
      action: {
        label: "Ver pedido",
        onClick: () => navigate(`/pedidos/${nro}/editar`),
      },
    });
    close();
  };

  return (
    <Drawer open={!!articulo} onOpenChange={(o) => !o && close()}>
      <DrawerContent size="matriz">
        {articulo && (
          <>
            <DrawerHeader className="px-7 pt-7 pb-4 border-b-0">
              <div className="flex-1 min-w-0">
                <DrawerTitle className="text-[26px] font-semibold tracking-tight">
                  {articulo.descripcion}
                </DrawerTitle>
                <DrawerDescription className="text-[13px] mt-1">
                  Art. <span className="tabular">{articulo.codigo}</span>
                  <span className="mx-1.5 text-muted-foreground/50">·</span>
                  {articulo.linea}
                  <span className="mx-1.5 text-muted-foreground/50">·</span>
                  <span className="tabular">{formatCurrency(articulo.precioRef * 12)}</span> la
                  docena
                </DrawerDescription>
              </div>
              <DrawerCloseButton />
            </DrawerHeader>

            {/* Mismo layout que el asistente: matriz y resumen lado a lado. */}
            <div className="grid md:grid-cols-[1fr_260px] overflow-auto md:overflow-hidden flex-1">
              <div className="md:overflow-auto px-5 sm:px-7 pb-2">
                <MatrizCarga
                  art={articulo}
                  skus={skus}
                  cants={cantidades}
                  setCants={setCantidades}
                />
              </div>

              <ResumenSeleccion
                skus={skus}
                cants={cantidades}
                onLimpiar={() => setCantidades({})}
              >
                <Button
                  onClick={agregarAlPedido}
                  disabled={totalUnidades === 0}
                  className="w-full h-11 justify-center gap-2 text-[13.5px]"
                >
                  {totalUnidades === 0
                    ? "Agregar al pedido"
                    : `Agregar ${totalUnidades} unidades`}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </ResumenSeleccion>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
