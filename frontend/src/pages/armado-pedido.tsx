import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Minus,
  Trash2,
  MapPin,
  Search,
  ArrowRight,
  ArrowLeft,
  MoreHorizontal,
  Package,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ESCALAS_DESCUENTO,
  CLIENTES,
  SKUS,
  ARTICULOS,
  COLORS,
  calcularNivelDescuento,
  DESCUENTO_INICIAL,
  DESCUENTO_MAX,
  type Cliente,
} from "@/lib/mock-data";
import { cn, formatCurrency, formatFechaISO } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { calcularTotales } from "@/lib/pedido-calc";
import { useStore } from "@/store/app-store";
import { usePedidos, useStock } from "@/store/hooks";
import type { PedidoItem } from "@/features/pedidos/pedido-data";
import { MatrizCarga, ResumenSeleccion } from "@/features/pedidos/matriz-carga";

type Linea = {
  sku: string;
  descripcion: string;
  articulo: string;
  talla: string;
  color: string;
  cantidad: number;
  precio: number;
};

const PASOS = ["Cliente", "Items", "Descuentos", "Confirmar"] as const;

export default function ArmadoPedidoPage() {
  const navigate = useNavigate();
  const { nro: nroRuta } = useParams();
  const [params] = useSearchParams();
  const { guardarBorrador, confirmarPedido: confirmarEnStore, setBorradorActivo } = useStore();
  const { pedido: buscarPedido } = usePedidos();
  const { disponible } = useStock();

  // Pedido que se está editando, si se entró por /pedidos/:nro/editar.
  const enEdicion = buscarPedido(nroRuta ?? null);
  // Cliente preseleccionado al venir de la ficha de un cliente (?cliente=CODIGO).
  const clienteParam = params.get("cliente");

  const [nroPedido, setNroPedido] = useState<string | null>(nroRuta ?? null);
  const [paso, setPaso] = useState(0);
  const [cliente, setCliente] = useState<Cliente | null>(() => {
    if (enEdicion?.clienteId) {
      return CLIENTES.find((c) => c.codigo === enEdicion.clienteId) ?? null;
    }
    if (clienteParam) return CLIENTES.find((c) => c.codigo === clienteParam) ?? null;
    return null;
  });
  const [direccionId, setDireccionId] = useState(
    () => enEdicion?.direccionId ?? cliente?.direccionesEntrega[0]?.id ?? "1"
  );
  const [lineas, setLineas] = useState<Linea[]>(() =>
    enEdicion ? enEdicion.items.map(hidratarLinea) : []
  );
  const [aplicarInicial, setAplicarInicial] = useState(enEdicion?.aplicarInicial ?? true);
  const [slot3, setSlot3] = useState(enEdicion?.slot3 ?? 0);
  const [nota, setNota] = useState(enEdicion?.nota ?? "");
  // RF-17: fecha de entrega comprometida. Vacía en un borrador; obligatoria para confirmar.
  const [fechaEntrega, setFechaEntrega] = useState(enEdicion?.fechaEntrega ?? "");
  const [confirmarOpen, setConfirmarOpen] = useState(false);
  const [salirOpen, setSalirOpen] = useState(false);
  const [nivelPrevio, setNivelPrevio] = useState<number | null>(null);

  // Al confirmar, el pedido deja de ser borrador y el efecto de abajo lo
  // interpretaría como "entraste a editar algo confirmado". Esta bandera evita
  // ese falso error en el instante de la confirmación.
  const confirmando = useRef(false);

  // Un pedido ya confirmado no se edita: se vuelve a la lista.
  useEffect(() => {
    if (confirmando.current) return;
    if (nroRuta && (!enEdicion || enEdicion.estado !== "borrador")) {
      toast.error("Ese pedido ya no es un borrador", {
        description: "Solo se pueden editar pedidos sin confirmar.",
      });
      navigate("/pedidos", { replace: true });
    }
  }, [nroRuta, enEdicion, navigate]);

  // "Hay cambios" = el pedido difiere del estado con el que arrancó la pantalla.
  // Al retomar un borrador se compara contra lo guardado, no contra vacío.
  const estadoInicial = useRef({
    lineas: JSON.stringify(enEdicion ? enEdicion.items.map(hidratarLinea) : []),
    clienteCodigo: (enEdicion?.clienteId ?? clienteParam) || null,
    direccionId: enEdicion?.direccionId ?? "1",
    slot3: enEdicion?.slot3 ?? 0,
    aplicarInicial: enEdicion?.aplicarInicial ?? true,
    nota: enEdicion?.nota ?? "",
    fechaEntrega: enEdicion?.fechaEntrega ?? "",
  });
  const hayCambios =
    JSON.stringify(lineas) !== estadoInicial.current.lineas ||
    (cliente?.codigo ?? null) !== estadoInicial.current.clienteCodigo ||
    direccionId !== estadoInicial.current.direccionId ||
    slot3 !== estadoInicial.current.slot3 ||
    aplicarInicial !== estadoInicial.current.aplicarInicial ||
    nota.trim() !== estadoInicial.current.nota.trim() ||
    fechaEntrega !== estadoInicial.current.fechaEntrega;

  const puedeAvanzar = (() => {
    if (paso === 0) return !!cliente;
    if (paso === 1) return lineas.length > 0;
    return true;
  })();

  // RF-17: no se confirma un pedido sin fecha de entrega comprometida. Es la
  // referencia contra la que después se mide de quién es la culpa del saldo.
  const puedeConfirmar = !!cliente && lineas.length > 0 && fechaEntrega !== "";

  // El cálculo vive en lib/pedido-calc para que el store guarde exactamente
  // el mismo número que muestra esta pantalla.
  // RF-32: el descuento se calcula sobre lo ATENDIBLE (lo que hay en stock).
  // Pasamos stockDisponible por línea; el cálculo recorta a min(cantidad, stock).
  const lineasConStock = useMemo(
    () => lineas.map((l) => ({ ...l, stockDisponible: disponible(l.sku) })),
    [lineas, disponible]
  );
  const {
    totalUnidades,
    totalSaldoUnidades,
    totalDocenas,
    subtotal,
    nivel,
    dInicial,
    dVolumen,
    dSlot3,
    totalDescuento,
    descuentoTopeado,
    base,
    igv,
    total,
  } = calcularTotales(lineasConStock, { aplicarInicial, slot3 });

  const haySaldo = totalSaldoUnidades > 0;

  const avanzar = () => setPaso((p) => Math.min(3, p + 1));
  const volver = () => setPaso((p) => Math.max(0, p - 1));

  // Detectar subida de nivel de descuento → aviso formal
  useEffect(() => {
    if (nivel && nivelPrevio !== null && nivel.nivel > nivelPrevio) {
      // El % anterior sale de la escala por nivel, no de reconstruir docenas.
      const pctPrevio =
        ESCALAS_DESCUENTO.find((e) => e.nivel === nivelPrevio)?.porcentaje ?? 0;
      toast.success(`Tramo ${nivel.nivel} alcanzado`, {
        description: `Descuento por volumen: ${pctPrevio}% → ${nivel.porcentaje}%.`,
      });
    }
    if (nivel) setNivelPrevio(nivel.nivel);
    else if (nivelPrevio !== null) setNivelPrevio(null);
  }, [nivel?.nivel]);

  // Toast al activar descuento inicial
  const toggleInicial = () => {
    const next = !aplicarInicial;
    setAplicarInicial(next);
    if (next && subtotal > 0) {
      toast(`Descuento inicial ${DESCUENTO_INICIAL}% aplicado`, {
        description: `−${formatCurrency(subtotal * (DESCUENTO_INICIAL / 100))} sobre el subtotal.`,
      });
    }
  };

  // Bloquear cierre del navegador si hay cambios
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hayCambios) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hayCambios]);

  // Keyboard shortcuts del wizard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Si hay un diálogo, drawer o popover abierto, los atajos del wizard no
      // aplican: la tecla es del overlay. Sin esto, Enter dentro de un dialog
      // confirmaba el dialog Y avanzaba el paso de atrás en el mismo evento.
      const hayOverlayAbierto =
        confirmarOpen ||
        salirOpen ||
        document.querySelector("[data-state='open'][role='dialog'], [data-radix-popper-content-wrapper]") !== null;
      if (hayOverlayAbierto) return;

      // No interferir si el focus está en un campo de formulario
      const target = e.target as HTMLElement;
      const isFormField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // Cmd/Ctrl + Enter → confirmar (desde cualquier lado)
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (paso === 3) {
          if (puedeConfirmar) setConfirmarOpen(true);
        } else if (puedeAvanzar) {
          avanzar();
        }
        return;
      }

      // Si está en form field, no hacer nada más
      if (isFormField) return;

      // Enter → avanzar / confirmar (depende del paso)
      if (e.key === "Enter") {
        e.preventDefault();
        if (paso === 3) {
          if (puedeConfirmar) setConfirmarOpen(true);
        } else if (puedeAvanzar) {
          avanzar();
        }
        return;
      }

      // ArrowLeft (con Alt) → volver
      if (e.altKey && e.key === "ArrowLeft" && paso > 0) {
        e.preventDefault();
        volver();
        return;
      }

      // ArrowRight (con Alt) → avanzar
      if (e.altKey && e.key === "ArrowRight" && puedeAvanzar && paso < 3) {
        e.preventDefault();
        avanzar();
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [paso, puedeAvanzar, hayCambios, confirmarOpen, salirOpen]);

  const intentarSalir = () => {
    if (hayCambios) setSalirOpen(true);
    else navigate("/pedidos");
  };

  /** Vuelca el estado de la pantalla al store. Un solo camino para armar el pedido. */
  const persistir = (): string => {
    const n = guardarBorrador({
      nro: nroPedido,
      cliente,
      direccionId,
      lineas,
      aplicarInicial,
      slot3,
      nota,
      fechaEntrega,
    });
    // A partir del primer guardado se edita siempre el mismo pedido.
    if (!nroPedido) setNroPedido(n);
    estadoInicial.current = {
      lineas: JSON.stringify(lineas),
      clienteCodigo: cliente?.codigo ?? null,
      direccionId,
      slot3,
      aplicarInicial,
      nota,
      fechaEntrega,
    };
    return n;
  };

  const guardarYSalir = () => {
    const n = persistir();
    setBorradorActivo(n);
    toast.success(`Borrador ${n} guardado`, {
      description: "Puedes retomarlo desde Mis pedidos cuando quieras.",
    });
    navigate("/pedidos");
  };

  const confirmarPedido = () => {
    confirmando.current = true;
    const n = persistir();
    // Unidades que el stock disponible no alcanza a cubrir: el pedido se
    // confirma igual, pero queda marcado con saldo pendiente.
    const saldo = lineas.reduce(
      (acc, l) => acc + Math.max(0, l.cantidad - disponible(l.sku)),
      0
    );
    confirmarEnStore(n, saldo);
    setBorradorActivo(null);
    const solicitado = totalUnidades + saldo;
    toast.success(`Pedido ${n} confirmado`, {
      description: saldo
        ? `${totalUnidades} und con stock de ${solicitado} pedidas · ${saldo} en saldo · ${formatCurrency(total)}.`
        : `${totalUnidades} und · ${formatCurrency(total)} · Stock reservado 48h.`,
    });
    setTimeout(() => navigate("/pedidos"), 600);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur-md px-6 lg:px-10 py-3.5">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-[12px]">
            {/* Botón y no Link: tiene que pasar por el guard de cambios sin
                guardar, si no descarta el pedido en silencio. */}
            <button
              onClick={intentarSalir}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Volver a pedidos"
            >
              Pedidos
            </button>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" aria-hidden="true" />
            <span className="font-medium tabular">{nroPedido ?? "Nuevo"}</span>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-1.5">
            {PASOS.map((p, i) => (
              <div key={p} className="flex items-center gap-1.5">
                <button
                  onClick={() => i < paso && setPaso(i)}
                  disabled={i > paso}
                  title={`Paso ${i + 1}: ${p}`}
                  aria-label={`Paso ${i + 1} de ${PASOS.length}: ${p}${i === paso ? " (actual)" : i < paso ? " (completado)" : ""}`}
                  aria-current={i === paso ? "step" : undefined}
                  className={cn(
                    "flex flex-row-reverse items-center gap-1.5 rounded-md px-2 py-1 text-[12px] transition-colors",
                    i === paso
                      ? "text-primary font-semibold"
                      : i < paso
                      ? "text-foreground/70 hover:text-foreground hover:bg-secondary/60 cursor-pointer font-medium"
                      : "text-muted-foreground/50 font-medium"
                  )}
                >
                  <span className="hidden sm:inline">{p}</span>
                  {i < paso ? (
                    <Check className="h-3 w-3 text-success" aria-hidden="true" />
                  ) : i === paso ? (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
                {i < PASOS.length - 1 && (
                  <div
                    className={cn(
                      "h-px w-6 transition-colors",
                      i < paso ? "bg-primary/40" : "bg-border-strong"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Fecha y total acumulado */}
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium tabular">
              Hoy, {new Date().toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }).replace(".", "").toUpperCase()}
            </p>
            <p className="tabular text-[17px] font-semibold leading-tight mt-0.5">
              {formatCurrency(total)}
            </p>
            <p className="text-[10.5px] text-muted-foreground tabular mt-0.5">
              incluye IGV
              {haySaldo && (
                <>
                  {" · "}
                  <span
                    title={`${totalSaldoUnidades} unidades no tienen stock disponible y quedan como saldo. No se incluyen en el total.`}
                  >
                    +{totalSaldoUnidades} und en saldo
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </header>

      {/* ===== Contenido del paso ===== */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={paso}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            // En el paso de items scrollea solo la columna de la izquierda,
            // así el resumen de la derecha queda siempre a la vista.
            className={cn("h-full", paso === 1 ? "overflow-hidden" : "overflow-auto")}
          >
            {paso === 0 && (
              <PasoCliente
                cliente={cliente}
                setCliente={(c) => {
                  const clienteAnterior = cliente;
                  setCliente(c);
                  setDireccionId(c.direccionesEntrega[0]?.id ?? "1");
                  // Si ya hay items cargados para otro cliente, advertir
                  if (
                    clienteAnterior &&
                    clienteAnterior.codigo !== c.codigo &&
                    lineas.length > 0
                  ) {
                    toast(`Items de ${clienteAnterior.razonSocial} se mantienen`, {
                      description: `${lineas.length} items en el pedido. Revisa si aplican al nuevo cliente.`,
                      action: {
                        label: "Vaciar items",
                        onClick: () => {
                          setLineas([]);
                          toast.success("Items eliminados");
                        },
                      },
                      duration: 6000,
                    });
                  }
                }}
                direccionId={direccionId}
                setDireccionId={setDireccionId}
              />
            )}
            {paso === 1 && (
              <PasoItems
                lineas={lineas}
                setLineas={setLineas}
                onEliminarConUndo={(linea, idx) => {
                  setLineas((prev) => prev.filter((l) => l.sku !== linea.sku));
                  toast(`Item eliminado: ${linea.descripcion}`, {
                    description: `SKU ${linea.sku} · ${linea.cantidad} und`,
                    action: {
                      label: "Deshacer",
                      onClick: () => {
                        setLineas((prev) => {
                          const copy = [...prev];
                          copy.splice(idx, 0, linea);
                          return copy;
                        });
                        toast.success("Item restaurado");
                      },
                    },
                  });
                }}
                onContinuar={avanzar}
                onGuardarBorrador={guardarYSalir}
              />
            )}
            {paso === 2 && (
              <PasoDescuentos
                subtotal={subtotal}
                totalUnidades={totalUnidades}
                totalDocenas={totalDocenas}
                totalSaldoUnidades={totalSaldoUnidades}
                nivel={nivel}
                aplicarInicial={aplicarInicial}
                setAplicarInicial={toggleInicial}
                dInicial={dInicial}
                dVolumen={dVolumen}
                slot3={slot3}
                setSlot3={setSlot3}
                dSlot3={dSlot3}
                totalDescuento={totalDescuento}
                descuentoTopeado={descuentoTopeado}
              />
            )}
            {paso === 3 && cliente && (
              <PasoConfirmar
                cliente={cliente}
                direccionId={direccionId}
                lineas={lineas}
                subtotal={subtotal}
                totalDescuento={totalDescuento}
                base={base}
                igv={igv}
                total={total}
                nota={nota}
                setNota={setNota}
                fechaEntrega={fechaEntrega}
                setFechaEntrega={setFechaEntrega}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ===== Footer con acciones ===== */}
      <footer className="border-t border-border bg-surface/80 backdrop-blur px-6 lg:px-10 py-3">
        <div className="flex items-center justify-between gap-3">
          {paso > 0 ? (
            <Button variant="ghost" onClick={volver} className="gap-1 text-[13px]">
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Volver
            </Button>
          ) : (
            <Button variant="ghost" onClick={intentarSalir} className="text-[13px]">
              Cancelar
            </Button>
          )}

          <div className="flex items-center gap-3 text-[12px] text-muted-foreground" aria-live="polite">
            <span className="tabular">Paso {paso + 1} de {PASOS.length}</span>
            {lineas.length > 0 && paso !== 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={guardarYSalir}
                className="gap-1.5 text-[12px]"
                title="Guardar como borrador y seguir después"
              >
                <Package className="h-3.5 w-3.5" aria-hidden="true" />
                Guardar borrador
              </Button>
            )}
          </div>

          {paso === 1 ? (
            // En el paso de items, Continuar vive en el panel de resumen.
            <span className="w-[104px]" aria-hidden="true" />
          ) : paso < 3 ? (
            <Button
              onClick={avanzar}
              disabled={!puedeAvanzar}
              aria-label={`Continuar al paso ${paso + 2}: ${PASOS[paso + 1]}`}
              className="gap-1.5 text-[13px]"
            >
              Continuar
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              onClick={() => setConfirmarOpen(true)}
              disabled={!puedeConfirmar}
              title={
                puedeConfirmar ? undefined : "Falta la fecha de entrega comprometida."
              }
              aria-label="Confirmar pedido, abrir diálogo de doble confirmación"
              className="gap-1.5 text-[13px]"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Confirmar pedido
            </Button>
          )}
        </div>
      </footer>

      {/* Doble confirmación de pedido */}
      <ConfirmDialog
        open={confirmarOpen}
        onOpenChange={setConfirmarOpen}
        title={`Confirmar pedido para ${cliente?.razonSocial}`}
        description={
          <>
            Total <span className="tabular font-medium text-foreground">{formatCurrency(total)}</span>{" "}
            · {totalUnidades} unidades · {lineas.length} items
            {fechaEntrega && <> · entrega {formatFechaISO(fechaEntrega)}</>}. Se reservará stock por
            48 horas. Esta acción no se puede deshacer.
            {/* RF-23: si se compromete más de lo que hay, se dice acá, no en un
                toast después de confirmar. */}
            {haySaldo && (
              <>
                {" "}
                Se factura solo lo atendible:{" "}
                <span className="tabular text-foreground">{totalSaldoUnidades}</span> und quedan en
                saldo por falta de stock.
              </>
            )}
          </>
        }
        confirmText="Confirmar"
        typeToConfirm="CONFIRMAR"
        onConfirm={confirmarPedido}
      />

      {/* Modal de salida con cambios sin guardar */}
      <ConfirmDialog
        open={salirOpen}
        onOpenChange={setSalirOpen}
        variant="warning"
        title="¿Salir sin guardar?"
        description={
          <>
            Hay cambios en el borrador del pedido. Si sales ahora se pierde todo. Para conservarlo,
            confirma el pedido antes de salir.
          </>
        }
        confirmText="Salir igual"
        onConfirm={() => navigate("/pedidos")}
      />
    </div>
  );
}

// ============ PASO 1 · Cliente ============
function PasoCliente({
  cliente,
  setCliente,
  direccionId,
  setDireccionId,
}: {
  cliente: Cliente | null;
  setCliente: (c: Cliente) => void;
  direccionId: string;
  setDireccionId: (id: string) => void;
}) {
  const [q, setQ] = useState("");

  const filtrados = CLIENTES.filter((c) => {
    if (!c.activo) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return c.razonSocial.toLowerCase().includes(s) || c.ruc.includes(s) || c.codigo.includes(s);
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h2 className="text-xl font-semibold tracking-tight">¿Para quién es el pedido?</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Elige el cliente de tu cartera. Solo se muestran los activos asignados a tu cuenta.
      </p>

      <div className="relative mt-5">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <label htmlFor="buscar-cliente" className="sr-only">
          Buscar cliente por razón social, RUC o código
        </label>
        <Input
          id="buscar-cliente"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por razón social, RUC o código… (ej: Andina)"
          aria-label="Buscar cliente"
          className="pl-9 h-10"
        />
        {q && filtrados.length === 0 && (
          <p className="mt-2 text-[12px] text-muted-foreground" role="status">
            Sin resultados para "{q}". Prueba con otro término.
          </p>
        )}
      </div>

      <div className="mt-3 space-y-1">
        {filtrados.map((c) => {
          const selected = cliente?.codigo === c.codigo;
          return (
            <button
              key={c.codigo}
              onClick={() => setCliente(c)}
              className={cn(
                "w-full text-left rounded-lg border p-3.5 transition-all duration-150",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-surface hover:border-border-strong"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                  selected ? "border-primary bg-primary" : "border-border-strong"
                )}>
                  {selected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium truncate">{c.razonSocial}</p>
                    {c.preferencial && (
                      <Badge variant="success" className="text-[9px] px-1 py-0 h-4">
                        Preferencial
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="tabular">RUC {c.ruc}</span>
                    <span>·</span>
                    <span className="tabular">{c.direccionesEntrega.length} dirs.</span>
                    {c.distribuidor && (
                      <>
                        <span>·</span>
                        <span>Distribuidor</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {cliente && cliente.direccionesEntrega.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-8"
        >
          <Label className="text-[12px] uppercase tracking-widest text-muted-foreground font-medium">
            Dirección de entrega
          </Label>
          <div className="mt-2 grid sm:grid-cols-2 gap-2">
            {cliente.direccionesEntrega.map((d) => {
              const selected = direccionId === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setDireccionId(d.id)}
                  className={cn(
                    "text-left rounded-lg border p-3 transition-all",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-surface hover:border-border-strong"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium">{d.nombre}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{d.direccion}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ============ PASO 2 · Items ============
function PasoItems({
  lineas,
  setLineas,
  onEliminarConUndo,
  onContinuar,
  onGuardarBorrador,
}: {
  lineas: Linea[];
  setLineas: React.Dispatch<React.SetStateAction<Linea[]>>;
  onEliminarConUndo: (linea: Linea, idx: number) => void;
  onContinuar: () => void;
  onGuardarBorrador: () => void;
}) {
  const [drawerArt, setDrawerArt] = useState(false);
  const [erroresPrecio, setErroresPrecio] = useState<Record<string, string>>({});
  // Texto en curso de cada campo de precio, mientras está enfocado.
  const [precioTexto, setPrecioTexto] = useState<Record<string, string>>({});
  const [qItem, setQItem] = useState("");
  const [confirmarVaciar, setConfirmarVaciar] = useState(false);
  const { disponible: disponibleSku } = useStock();

  // Bajar de 12 elimina la línea en vez de dejarla en 0: una línea en 0 seguía
  // contando para "puede avanzar" y aparecía en el resumen con importe cero.
  const setQty = (sku: string, delta: number) =>
    setLineas((prev) => {
      const idx = prev.findIndex((l) => l.sku === sku);
      if (idx === -1) return prev;
      const linea = prev[idx];
      const nueva = linea.cantidad + delta;
      if (nueva <= 0) {
        onEliminarConUndo(linea, idx);
        return prev.filter((l) => l.sku !== sku);
      }
      // Tope por stock disponible, igual que en la matriz de carga.
      const tope = Math.max(disponibleSku(sku), linea.cantidad);
      return prev.map((l) =>
        l.sku === sku ? { ...l, cantidad: Math.min(nueva, tope) } : l
      );
    });

  const setCantidad = (sku: string, v: string) => {
    const cleaned = v.replace(/[^\d]/g, "");
    const n = parseInt(cleaned || "0", 10);
    if (Number.isNaN(n) || n < 0) return;
    const linea = lineas.find((l) => l.sku === sku);
    const tope = Math.max(disponibleSku(sku), linea?.cantidad ?? 0);
    setLineas((prev) =>
      prev.map((l) => (l.sku === sku ? { ...l, cantidad: Math.min(n, tope) } : l))
    );
  };

  // El precio se edita como texto y recién se formatea al salir del campo. Con
  // el valor controlado en toFixed(2) no se podía borrar para escribir otro:
  // cada tecla revertía el campo.
  const setPrecio = (sku: string, v: string) => {
    const cleaned = v.replace(/[^\d.]/g, "");
    setPrecioTexto((p) => ({ ...p, [sku]: cleaned }));

    if (cleaned === "" || cleaned.endsWith(".")) return; // estado intermedio
    const n = parseFloat(cleaned);
    if (Number.isNaN(n)) {
      setErroresPrecio((p) => ({ ...p, [sku]: "Precio inválido" }));
      return;
    }
    if (n <= 0) {
      setErroresPrecio((p) => ({ ...p, [sku]: "Debe ser mayor a 0" }));
      return;
    }
    if (n > 99999) {
      setErroresPrecio((p) => ({ ...p, [sku]: "Precio sospechosamente alto" }));
      return;
    }
    setErroresPrecio((p) => {
      const next = { ...p };
      delete next[sku];
      return next;
    });
    setLineas((prev) => prev.map((l) => (l.sku === sku ? { ...l, precio: n } : l)));
  };

  /** Al salir del campo se vuelve al formato de 2 decimales y se descarta lo inválido. */
  const cerrarPrecio = (sku: string) => {
    setPrecioTexto((p) => {
      const next = { ...p };
      delete next[sku];
      return next;
    });
    setErroresPrecio((p) => {
      const next = { ...p };
      delete next[sku];
      return next;
    });
  };

  const agregarVariantes = (nuevas: Linea[]) => {
    setLineas((prev) => {
      const out = [...prev];
      for (const n of nuevas) {
        const idx = out.findIndex((l) => l.sku === n.sku);
        if (idx >= 0) out[idx] = { ...out[idx], cantidad: out[idx].cantidad + n.cantidad };
        else out.push(n);
      }
      return out;
    });
  };

  const totalUnidades = lineas.reduce((a, l) => a + l.cantidad, 0);

  const lineasFiltradas = lineas.filter((l) => {
    if (!qItem) return true;
    const s = qItem.toLowerCase();
    return (
      l.descripcion.toLowerCase().includes(s) ||
      l.sku.toLowerCase().includes(s) ||
      l.articulo.toLowerCase().includes(s) ||
      l.talla.toLowerCase().includes(s) ||
      l.color.toLowerCase().includes(s)
    );
  });

  // Las líneas se agrupan por artículo: el vendedor piensa en "el bikini 203",
  // no en 5 SKUs sueltos que casualmente comparten código.
  const grupos = ARTICULOS.filter((a) =>
    lineasFiltradas.some((l) => l.articulo === a.codigo)
  ).map((a) => ({
    art: a,
    lineas: lineasFiltradas.filter((l) => l.articulo === a.codigo),
  }));

  const subtotal = lineas.reduce((a, l) => a + l.cantidad * l.precio, 0);

  return (
    <div className="grid lg:grid-cols-[1fr_320px] h-full">
      {/* ===== Columna principal ===== */}
      <div className="overflow-auto px-7 lg:px-10 py-8">
        <div className="max-w-3xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[26px] font-semibold tracking-tight">Revisar pedido</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                <span className="tabular">{grupos.length}</span>{" "}
                {grupos.length === 1 ? "artículo" : "artículos"}
                <span className="mx-1.5 text-muted-foreground/50">·</span>
                <span className="tabular">{lineas.length}</span>{" "}
                {lineas.length === 1 ? "variante" : "variantes"}
                <span className="mx-1.5 text-muted-foreground/50">·</span>
                <span className="tabular">{totalUnidades}</span> unidades
              </p>
            </div>
            {lineas.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Más acciones del pedido"
                    className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => setDrawerArt(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Agregar artículo
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setConfirmarVaciar(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Vaciar pedido
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Buscar entre lo cargado, o agregar algo nuevo con el + */}
          <div className="relative mt-6">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <label htmlFor="buscar-item" className="sr-only">
              Buscar entre los items del pedido o agregar un producto
            </label>
            <input
              id="buscar-item"
              value={qItem}
              onChange={(e) => setQItem(e.target.value)}
              placeholder="Buscar o agregar producto…"
              className="w-full h-12 pl-11 pr-24 rounded-lg border border-border bg-surface text-[14px] shadow-sunken placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {qItem ? (
                <button
                  onClick={() => setQItem("")}
                  aria-label="Limpiar búsqueda"
                  className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="h-6 px-1.5 inline-flex items-center rounded border border-border bg-secondary text-[10px] font-mono text-muted-foreground">
                  ⌘K
                </kbd>
              )}
              <button
                onClick={() => setDrawerArt(true)}
                aria-label="Agregar producto desde el catálogo"
                title="Agregar producto"
                className="h-8 w-8 flex items-center justify-center rounded-md text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {lineas.length === 0 ? (
            <button
              onClick={() => setDrawerArt(true)}
              className="mt-6 w-full rounded-xl border-2 border-dashed border-border-strong p-12 text-center hover:border-primary/40 hover:bg-primary/5 transition-colors group"
            >
              <Package className="h-7 w-7 text-muted-foreground/50 mx-auto mb-3 group-hover:text-primary transition-colors" />
              <p className="text-[14px] font-medium">El pedido está vacío</p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Busca un artículo del catálogo para empezar a cargar.
              </p>
            </button>
          ) : grupos.length === 0 ? (
            <div className="mt-6 rounded-xl border border-border bg-surface shadow-card py-14 text-center">
              <Search className="h-7 w-7 text-muted-foreground/40 mx-auto mb-3" aria-hidden="true" />
              <p className="text-[13.5px] font-medium">Ningún item coincide con “{qItem}”</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setQItem("")}>
                Limpiar búsqueda
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {grupos.map(({ art, lineas: lineasArt }) => (
                <div
                  key={art.codigo}
                  className="rounded-xl border border-border bg-surface shadow-card overflow-hidden"
                >
                  {/* Cabecera del artículo */}
                  <div className="flex items-center gap-3.5 px-5 py-4 border-b border-border">
                    <span className="tabular shrink-0 h-9 w-11 rounded-md bg-secondary flex items-center justify-center text-[12px] font-medium text-foreground/70">
                      {art.codigo}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold truncate">
                        {art.descripcion} {art.linea}
                      </p>
                      <p className="text-[11.5px] text-muted-foreground mt-0.5">
                        Art. <span className="tabular">{art.codigo}</span>
                        <span className="mx-1.5 text-muted-foreground/50">·</span>
                        <span className="tabular">{lineasArt.length}</span>{" "}
                        {lineasArt.length === 1 ? "variante" : "variantes"} en el pedido
                      </p>
                    </div>
                    <button
                      onClick={() => setDrawerArt(true)}
                      className="shrink-0 flex items-center gap-1.5 text-[12.5px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Añadir variantes
                    </button>
                  </div>

                  {/* Variantes del artículo */}
                  <table className="w-full">
                    <thead>
                      <tr className="text-[11px] text-muted-foreground">
                        <th className="text-left font-normal px-5 py-2.5">Variante</th>
                        <th className="text-right font-normal py-2.5">Stock</th>
                        <th className="text-center font-normal py-2.5 w-[150px]">Cantidad</th>
                        <th className="text-center font-normal py-2.5 w-[130px]">
                          Precio unitario
                        </th>
                        <th className="text-right font-normal py-2.5">Subtotal</th>
                        <th className="w-12" />
                      </tr>
                    </thead>
                    <tbody>
                      {lineasArt.map((l) => {
                        const skuData = SKUS.find((s) => s.codigo === l.sku);
                        const avail = disponibleSku(l.sku);
                        const escaso = avail > 0 && avail < 48;
                        const color = COLORS[l.color];
                        const docenas = Math.floor(l.cantidad / 12);
                        const sueltas = l.cantidad % 12;
                        const idx = lineas.findIndex((x) => x.sku === l.sku);
                        return (
                          <tr key={l.sku} className="border-t border-border">
                            {/* Variante */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <span
                                  className="h-7 w-7 rounded-md border border-black/10 shrink-0 shadow-subtle"
                                  style={{ backgroundColor: color?.hex }}
                                  aria-hidden="true"
                                />
                                <span className="flex flex-col leading-tight min-w-0">
                                  <span className="text-[13.5px] font-medium truncate">
                                    {color?.name ?? l.color}
                                    <span className="mx-1.5 text-muted-foreground/50">·</span>
                                    Talla {l.talla}
                                  </span>
                                  <span className="font-mono text-[10.5px] text-muted-foreground mt-0.5">
                                    {l.sku}
                                  </span>
                                </span>
                              </div>
                            </td>

                            {/* Stock disponible + saldo si excede */}
                            <td className="py-3.5 text-right">
                              <div className="flex flex-col items-end leading-tight">
                                <span
                                  className={cn(
                                    "text-[12px] tabular",
                                    escaso ? "text-warning font-medium" : "text-muted-foreground"
                                  )}
                                  title={`Stock físico ${skuData?.stock ?? 0} · disponible ahora ${avail}`}
                                >
                                  {avail} disp.
                                </span>
                                {l.cantidad > avail && (
                                  <span
                                    className="text-[10.5px] tabular text-muted-foreground/80 mt-0.5"
                                    title={`${l.cantidad - avail} unidades no tienen stock y quedan como saldo. No se descuentan del total.`}
                                  >
                                    saldo: {l.cantidad - avail} und
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Cantidad, en unidades, con la lectura en docenas debajo */}
                            <td className="py-3.5">
                              <div className="flex flex-col items-center gap-1">
                                <div
                                  className={cn(
                                    "flex items-center rounded-lg border bg-surface overflow-hidden",
                                    "focus-within:ring-2 focus-within:ring-ring focus-within:border-primary",
                                    "border-border"
                                  )}
                                >
                                  <button
                                    onClick={() => setQty(l.sku, -12)}
                                    aria-label={`Restar una docena de ${l.sku}`}
                                    title="Restar una docena"
                                    className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </button>
                                  <input
                                    value={l.cantidad}
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    aria-label={`Unidades de ${l.descripcion} ${color?.name} talla ${l.talla}`}
                                    onChange={(e) => setCantidad(l.sku, e.target.value)}
                                    className="tabular w-14 h-9 text-center text-[13.5px] bg-transparent border-x border-border focus:outline-none"
                                  />
                                  <button
                                    onClick={() => setQty(l.sku, 12)}
                                    aria-label={`Sumar una docena de ${l.sku}`}
                                    title="Sumar una docena"
                                    className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <span className="text-[10.5px] text-muted-foreground tabular">
                                  {docenas > 0 && `${docenas} doc`}
                                  {docenas > 0 && sueltas > 0 && " + "}
                                  {sueltas > 0 && `${sueltas} und`}
                                  {l.cantidad === 0 && "—"}
                                </span>
                              </div>
                            </td>

                            {/* Precio unitario */}
                            <td className="py-3.5">
                              <div className="flex items-center justify-center gap-1.5">
                                <label
                                  htmlFor={`precio-${l.sku}`}
                                  className="text-[11px] text-muted-foreground"
                                >
                                  S/
                                </label>
                                <input
                                  id={`precio-${l.sku}`}
                                  value={precioTexto[l.sku] ?? l.precio.toFixed(2)}
                                  onBlur={() => cerrarPrecio(l.sku)}
                                  inputMode="decimal"
                                  aria-label={`Precio unitario de ${l.descripcion}`}
                                  aria-invalid={!!erroresPrecio[l.sku]}
                                  aria-describedby={erroresPrecio[l.sku] ? `error-${l.sku}` : undefined}
                                  onChange={(e) => setPrecio(l.sku, e.target.value)}
                                  className={cn(
                                    "tabular w-20 h-9 text-center text-[13.5px] bg-surface border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring",
                                    erroresPrecio[l.sku]
                                      ? "border-destructive focus:ring-destructive"
                                      : "border-border focus:border-primary"
                                  )}
                                />
                              </div>
                              {erroresPrecio[l.sku] && (
                                <p
                                  id={`error-${l.sku}`}
                                  role="alert"
                                  className="text-[10px] text-destructive mt-1 text-center"
                                >
                                  {erroresPrecio[l.sku]}
                                </p>
                              )}
                            </td>

                            {/* Subtotal */}
                            <td className="py-3.5 text-right">
                              <span className="tabular text-[14px] font-semibold">
                                {formatCurrency(l.cantidad * l.precio)}
                              </span>
                            </td>

                            <td className="py-3.5 pr-4 text-right">
                              <button
                                onClick={() => onEliminarConUndo(l, idx)}
                                aria-label={`Eliminar ${l.descripcion} (${l.sku})`}
                                title="Quitar del pedido"
                                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== Resumen ===== */}
      <aside className="hidden lg:flex flex-col gap-5 p-7 bg-background border-l border-border">
        <div>
          <h3 className="text-[16px] font-semibold tracking-tight">Resumen</h3>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
            <span className="tabular">{grupos.length}</span>{" "}
            {grupos.length === 1 ? "artículo" : "artículos"}
            <span className="mx-1 text-muted-foreground/50">·</span>
            <span className="tabular">{lineas.length}</span>{" "}
            {lineas.length === 1 ? "variante" : "variantes"}
            <span className="mx-1 text-muted-foreground/50">·</span>
            <span className="tabular">{totalUnidades}</span> und
          </p>
        </div>

        <div className="border-t border-border pt-5">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-muted-foreground">Subtotal</span>
            <span className="tabular text-[14px] font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            Los descuentos se aplican en el paso siguiente.
          </p>
        </div>

        <div className="border-t border-border pt-5">
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-semibold">Total</span>
            <span className="tabular text-[22px] font-semibold tracking-tight">
              {formatCurrency(subtotal)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={onContinuar}
            disabled={lineas.length === 0}
            className="w-full h-11 justify-center gap-2 text-[14px]"
          >
            Continuar
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <button
            onClick={onGuardarBorrador}
            disabled={lineas.length === 0}
            className="text-[13px] text-primary hover:underline disabled:opacity-40 disabled:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Guardar borrador
          </button>
        </div>
      </aside>

      {/* Drawer de catálogo */}
      <CatalogoDrawer
        open={drawerArt}
        onClose={() => setDrawerArt(false)}
        onAdd={agregarVariantes}
        lineasExistentes={lineas}
      />

      <ConfirmDialog
        open={confirmarVaciar}
        onOpenChange={setConfirmarVaciar}
        variant="destructive"
        title={`Vaciar pedido (${lineas.length} items)`}
        description={
          <>
            Se eliminan todos los items del pedido ({totalUnidades} unidades). Esta acción no se
            puede deshacer.
          </>
        }
        confirmText="Vaciar todo"
        onConfirm={() => {
          setLineas([]);
          setQItem("");
          toast.success("Pedido vaciado");
        }}
      />
    </div>
  );
}

function CatalogoDrawer({
  open,
  onClose,
  onAdd,
  lineasExistentes,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (lineas: Linea[]) => void;
  lineasExistentes: Linea[];
}) {
  const [articulo, setArticulo] = useState<string | null>(null);
  const [cants, setCants] = useState<Record<string, number>>({});
  const [qArt, setQArt] = useState("");
  const { disponible } = useStock();

  // Cantidades ya cargadas en el pedido, indexadas por SKU
  const enPedido: Record<string, number> = {};
  for (const l of lineasExistentes) {
    enPedido[l.sku] = (enPedido[l.sku] ?? 0) + l.cantidad;
  }

  const art = ARTICULOS.find((a) => a.codigo === articulo);
  const skus = articulo ? SKUS.filter((s) => s.articulo === articulo) : [];

  const articulosFiltrados = ARTICULOS.filter((a) => {
    if (!a.activo) return false;
    if (!qArt) return true;
    const s = qArt.toLowerCase();
    return (
      a.descripcion.toLowerCase().includes(s) ||
      a.codigo.toLowerCase().includes(s) ||
      a.linea.toLowerCase().includes(s) ||
      a.genero.toLowerCase().includes(s)
    );
  });

  // `cants` guarda DOCENAS (lo que el vendedor tipea). Las líneas del pedido
  // siguen viviendo en unidades, así que se convierte acá y en un solo lugar.
  const nuevasLineas = Object.entries(cants)
    .filter(([, d]) => d > 0)
    .map(([skuCode, docenasSku]) => {
      const s = SKUS.find((x) => x.codigo === skuCode)!;
      return {
        sku: s.codigo,
        descripcion: s.descripcion,
        articulo: s.articulo,
        talla: s.talla,
        color: s.color,
        cantidad: docenasSku * 12,
        precio: s.precio,
      };
    });

  const unidades = nuevasLineas.reduce((a, l) => a + l.cantidad, 0);
  const docenas = unidades / 12;


  /** Cerrar sin agregar descarta lo tipeado; si no, reaparece al reabrir. */
  const cerrarYDescartar = () => {
    setCants({});
    setArticulo(null);
    onClose();
  };

  const confirmar = () => {
    if (nuevasLineas.length === 0) {
      toast("No cargaste cantidades", { description: "Escribe docenas en la matriz para agregar." });
      onClose();
      return;
    }
    onAdd(nuevasLineas);
    toast.success(`${docenas} docenas agregadas`, {
      description: `${unidades} unidades · ${nuevasLineas.length} variantes del art. ${articulo}.`,
    });
    setCants({});
    setArticulo(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && cerrarYDescartar()}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden">
        <DialogHeader className="px-7 pt-7 pb-4">
          {art ? (
            <>
              <button
                onClick={() => setArticulo(null)}
                aria-label="Volver a la lista de artículos"
                className="flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded w-fit"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Catálogo
              </button>
              <DialogTitle className="text-[26px] font-semibold tracking-tight mt-2">
                {art.descripcion}
              </DialogTitle>
              <p className="text-[13px] text-muted-foreground mt-1">
                Art. <span className="tabular">{art.codigo}</span>
                <span className="mx-1.5 text-muted-foreground/50">·</span>
                {art.linea}
                <span className="mx-1.5 text-muted-foreground/50">·</span>
                <span className="tabular">{formatCurrency(art.precioRef * 12)}</span> la docena
              </p>
            </>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
                Catálogo
              </p>
              <DialogTitle className="text-[26px] font-semibold tracking-tight mt-1">
                Agregar producto
              </DialogTitle>
            </>
          )}
        </DialogHeader>

        {!articulo ? (
          <div className="px-7 pb-7">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <label htmlFor="buscar-articulo" className="sr-only">
                Buscar artículo por nombre, código, línea o género
              </label>
              <input
                id="buscar-articulo"
                value={qArt}
                onChange={(e) => setQArt(e.target.value)}
                placeholder="Buscar por artículo, nombre o marca…"
                aria-label="Buscar artículo"
                autoFocus
                className="w-full h-12 pl-11 pr-16 rounded-lg border border-primary bg-surface text-[14px] shadow-sunken placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {qArt ? (
                <button
                  onClick={() => setQArt("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 h-6 px-1.5 inline-flex items-center rounded border border-border bg-secondary text-[10px] font-mono text-muted-foreground">
                  ⌘K
                </kbd>
              )}
            </div>

            <p className="mt-4 mb-2 text-[12px] text-muted-foreground">
              <span className="tabular">{articulosFiltrados.length}</span>{" "}
              {articulosFiltrados.length === 1 ? "resultado" : "resultados"}
            </p>
            {/* Lista en dos columnas: el código como ancla visual a la izquierda,
                el disponible como dato secundario, y una flecha que anuncia que
                el artículo se abre para elegir tallas y colores. */}
            <div className="max-h-[52vh] overflow-auto rounded-lg border border-border">
              {articulosFiltrados.length === 0 ? (
                <div className="py-14 text-center">
                  <Package className="h-7 w-7 text-muted-foreground/40 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-[13px] font-medium">Sin resultados para “{qArt}”</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Prueba con el código, el nombre o la línea.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setQArt("")}>
                    Limpiar búsqueda
                  </Button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2">
                  {articulosFiltrados.map((a, i) => {
                    const stockArt = SKUS.filter((s) => s.articulo === a.codigo).reduce(
                      (acc, s) => acc + disponible(s.codigo),
                      0
                    );
                    const fila = Math.floor(i / 2);
                    const ultimaFila = fila === Math.floor((articulosFiltrados.length - 1) / 2);
                    return (
                      <button
                        key={a.codigo}
                        onClick={() => setArticulo(a.codigo)}
                        className={cn(
                          "group flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors",
                          "hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:bg-primary/[0.06]",
                          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                          !ultimaFila && "border-b border-border",
                          i % 2 === 0 && "sm:border-r sm:border-border"
                        )}
                      >
                        <span className="tabular shrink-0 h-9 w-11 rounded-md bg-secondary flex items-center justify-center text-[12px] font-medium text-foreground/70 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          {a.codigo}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-semibold leading-snug truncate">
                            {a.descripcion}
                          </span>
                          <span className="block mt-0.5 text-[11px] text-muted-foreground truncate">
                            {a.linea}
                            <span className="mx-1.5 text-muted-foreground/50">·</span>
                            <span className="tabular">{stockArt.toLocaleString("es-PE")}</span>{" "}
                            disponibles
                          </span>
                        </span>
                        <ArrowRight
                          className="h-4 w-4 shrink-0 text-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 transition-all"
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <p className="mt-4 text-[12px] text-muted-foreground">
              Selecciona un artículo para configurar sus variantes.
            </p>
          </div>
        ) : (
          /* Matriz a la izquierda, resumen de la selección a la derecha: la
             acción principal queda junto al número que la justifica. */
          <div className="grid md:grid-cols-[1fr_260px] max-h-[70vh] overflow-hidden">
            <div className="overflow-auto px-7 pb-2">
              <MatrizCarga
                art={art!}
                skus={skus}
                cants={cants}
                setCants={setCants}
                enPedido={enPedido}
              />
            </div>

            <ResumenSeleccion skus={skus} cants={cants} onLimpiar={() => setCants({})}>
              <Button
                onClick={confirmar}
                disabled={unidades === 0}
                className="w-full h-11 justify-center gap-2 text-[13.5px]"
              >
                {unidades === 0 ? "Agregar al pedido" : `Agregar ${unidades} unidades`}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </ResumenSeleccion>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}

// ============ PASO 3 · Descuentos ============
function PasoDescuentos({
  subtotal,
  totalUnidades,
  totalDocenas,
  totalSaldoUnidades,
  nivel,
  aplicarInicial,
  setAplicarInicial,
  dInicial,
  dVolumen,
  slot3,
  setSlot3,
  dSlot3,
  totalDescuento,
  descuentoTopeado,
}: {
  subtotal: number;
  totalUnidades: number;
  totalDocenas: number;
  totalSaldoUnidades: number;
  nivel: ReturnType<typeof calcularNivelDescuento>;
  aplicarInicial: boolean;
  setAplicarInicial: (v: boolean) => void;
  dInicial: number;
  dVolumen: number;
  slot3: number;
  setSlot3: (v: number) => void;
  dSlot3: number;
  totalDescuento: number;
  descuentoTopeado: boolean;
}) {
  const pctTotal = subtotal > 0 ? (totalDescuento / subtotal) * 100 : 0;
  const [avanzadoOpen, setAvanzadoOpen] = useState(slot3 > 0);
  const [autorizacionOpen, setAutorizacionOpen] = useState(false);
  const [slotPendiente, setSlotPendiente] = useState(0);

  // Calcular "cuánto falta para el siguiente tramo"
  const proximoNivel = nivel
    ? ESCALAS_DESCUENTO.find((e) => e.nivel === nivel.nivel + 1)
    : ESCALAS_DESCUENTO[0];
  const docenasFaltan = proximoNivel ? Math.max(0, proximoNivel.desde - totalDocenas) : 0;

  const intentarCambiarSlot = (valor: number) => {
    if (valor > 15 && valor !== slot3) {
      setSlotPendiente(valor);
      setAutorizacionOpen(true);
      return;
    }
    setSlot3(Math.max(0, Math.min(50, valor)));
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h2 className="text-xl font-semibold tracking-tight">Revisa los descuentos</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Subtotal de <span className="tabular">{totalUnidades}</span> unidades con stock ({" "}
        <span className="tabular">{totalDocenas}</span> docenas).
        {totalSaldoUnidades > 0 && (
          <>
            {" "}
            Quedan{" "}
            <span className="tabular text-foreground" title="No participan del descuento ni del total.">
              {totalSaldoUnidades} und en saldo
            </span>{" "}
            que no entran al descuento.
          </>
        )}
      </p>

      {/* Resumen grande del ahorro */}
      <div className="mt-6 rounded-xl border border-border bg-surface shadow-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
              Descuento total
            </p>
            <p className="mt-1 tabular text-3xl font-semibold tracking-tight">
              −{formatCurrency(totalDescuento)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
              Sobre subtotal
            </p>
            <p className="mt-1 tabular text-3xl font-semibold tracking-tight text-primary">
              {pctTotal.toFixed(1)}%
            </p>
          </div>
        </div>
        {descuentoTopeado && (
          <p role="status" className="mt-3 text-[11px] text-muted-foreground tabular">
            Descuentos topeados a {DESCUENTO_MAX}% del subtotal.
          </p>
        )}
      </div>

      {/* Controles individuales */}
      <div className="mt-5 space-y-3">
        {/* Descuento inicial */}
        <div className="rounded-lg border border-border bg-surface shadow-card p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-[13px] font-medium">Descuento inicial</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Aplica automático sobre el subtotal
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="tabular">
                {DESCUENTO_INICIAL}%
              </Badge>
              <span className="tabular text-[13px] font-medium text-success">
                −{formatCurrency(dInicial)}
              </span>
              <button
                onClick={() => setAplicarInicial(!aplicarInicial)}
                className={cn(
                  "relative h-5 w-9 rounded-full transition-colors",
                  aplicarInicial ? "bg-primary" : "bg-border-strong"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    aplicarInicial ? "translate-x-4" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>
          </label>
        </div>

        {/* Descuento por volumen */}
        <div className="rounded-lg border border-border bg-surface shadow-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium">Descuento por volumen</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {nivel ? (
                  <>
                    Aplicado nivel{" "}
                    <span className="tabular font-medium text-foreground">{nivel.nivel}</span> · tramo{" "}
                    <span className="tabular text-foreground">
                      {nivel.hasta >= 999999 ? `${nivel.desde}+` : `${nivel.desde}–${nivel.hasta}`}
                    </span>{" "}
                    docenas
                  </>
                ) : (
                  <>Necesitás al menos 1 docena para entrar al nivel 1</>
                )}
              </p>
            </div>
            <div className="text-right">
              {nivel ? (
                <>
                  <Badge variant="success" className="tabular">
                    {nivel.porcentaje}%
                  </Badge>
                  <p className="mt-1 tabular text-[13px] font-medium text-success">
                    −{formatCurrency(dVolumen)}
                  </p>
                </>
              ) : (
                <span className="text-[11px] text-muted-foreground">—</span>
              )}
            </div>
          </div>

          {/* Visual de niveles */}
          <div className="mt-3 flex gap-1">
            {ESCALAS_DESCUENTO.map((e) => {
              const activo = nivel && nivel.nivel >= e.nivel;
              return (
                <div
                  key={e.nivel}
                  className={cn(
                    "flex-1 rounded-md py-1.5 px-2 text-center transition-colors",
                    activo ? "bg-success-soft" : "bg-secondary/50"
                  )}
                >
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
                    N{e.nivel}
                  </p>
                  <p className={cn("tabular text-[11px] font-medium", activo ? "text-success" : "text-muted-foreground")}>
                    {e.porcentaje}%
                  </p>
                </div>
              );
            })}
          </div>

          {/* Tramo siguiente — solo informativo, sin barra visual */}
          {proximoNivel && docenasFaltan > 0 && (
            <p className="mt-3 text-[11px] text-muted-foreground tabular">
              Siguiente tramo: <span className="text-foreground">{proximoNivel.desde}</span> docenas →{" "}
              <span className="text-foreground">{proximoNivel.porcentaje}%</span> · faltan{" "}
              <span className="text-foreground">{docenasFaltan}</span>
            </p>
          )}
          {nivel && nivel.nivel === ESCALAS_DESCUENTO[ESCALAS_DESCUENTO.length - 1].nivel && (
            <p className="mt-3 text-[11px] text-muted-foreground tabular">
              Tramo máximo alcanzado ({nivel.porcentaje}%)
            </p>
          )}
        </div>

        {/* Descuento manual (avanzado, colapsable) */}
        <div className="rounded-lg border border-border bg-surface shadow-card">
          <button
            onClick={() => setAvanzadoOpen((o) => !o)}
            aria-expanded={avanzadoOpen}
            aria-controls="slot-manual-content"
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div>
              <p className="text-[13px] font-medium flex items-center gap-2">
                Descuento adicional (avanzado)
                {slot3 > 0 && (
                  <Badge variant="warning" className="text-[9px] px-1 py-0 h-4 tabular">
                    {slot3}%
                  </Badge>
                )}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Para casos especiales. Requiere autorización comercial si es mayor a 15%.
              </p>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                avanzadoOpen && "rotate-90"
              )}
              aria-hidden="true"
            />
          </button>

          {avanzadoOpen && (
            <div id="slot-manual-content" className="px-4 pb-4 pt-0">
              <Separator className="mb-3" />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center rounded-md border border-border overflow-hidden">
                  <button
                    onClick={() => intentarCambiarSlot(slot3 - 1)}
                    aria-label="Restar 1% de descuento adicional"
                    className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    value={slot3}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    aria-label="Porcentaje de descuento adicional"
                    onChange={(e) =>
                      intentarCambiarSlot(
                        parseInt(e.target.value.replace(/[^\d]/g, "") || "0", 10)
                      )
                    }
                    className="tabular w-12 h-9 text-center text-[12px] bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="px-2 text-muted-foreground text-[11px]">%</span>
                  <button
                    onClick={() => intentarCambiarSlot(slot3 + 1)}
                    aria-label="Sumar 1% de descuento adicional"
                    className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="tabular text-[13px] font-medium text-success ml-auto">
                  {slot3 > 0 ? `−${formatCurrency(dSlot3)}` : "—"}
                </span>
              </div>
              {slot3 > 15 && (
                <p className="mt-2 text-[10.5px] text-muted-foreground tabular">
                  Supera 15%: requiere autorización comercial.
                </p>
              )}
            </div>
          )}
        </div>

        <ConfirmDialog
          open={autorizacionOpen}
          onOpenChange={setAutorizacionOpen}
          variant="warning"
          title="Descuento requiere autorización"
          description={
            <>
              Estás aplicando <span className="tabular font-medium text-foreground">{slotPendiente}%</span> de
              descuento adicional. Pasado el 15% se requiere aprobación de Comercial. Solo aplicalo
              si contás con esa autorización.
            </>
          }
          confirmText="Tengo autorización, aplicar"
          cancelText="Cancelar"
          onConfirm={() => {
            setSlot3(Math.max(0, Math.min(50, slotPendiente)));
            toast.success(`${slotPendiente}% aplicado`, {
              description: "Recuerda registrar la autorización en Comercial.",
            });
          }}
        />
      </div>
    </div>
  );
}

// ============ PASO 4 · Confirmar ============
function PasoConfirmar({
  cliente,
  direccionId,
  lineas,
  subtotal,
  totalDescuento,
  base,
  igv,
  total,
  nota,
  setNota,
  fechaEntrega,
  setFechaEntrega,
}: {
  cliente: Cliente;
  direccionId: string;
  lineas: Linea[];
  subtotal: number;
  totalDescuento: number;
  base: number;
  igv: number;
  total: number;
  nota: string;
  setNota: (v: string) => void;
  fechaEntrega: string;
  setFechaEntrega: (v: string) => void;
}) {
  const direccion = cliente.direccionesEntrega.find((d) => d.id === direccionId);
  // No se puede comprometer una entrega para ayer.
  const hoyISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h2 className="text-xl font-semibold tracking-tight">Confirma antes de enviar</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Al confirmar se reserva stock por 48 horas. La notificación al cliente quedará disponible
        una vez integrado WhatsApp Business.
      </p>

      {/* Cliente */}
      <div className="mt-6 rounded-lg border border-border bg-surface shadow-card p-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">
          Cliente
        </p>
        <p className="text-[14px] font-medium">{cliente.razonSocial}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          RUC <span className="tabular">{cliente.ruc}</span> · Cod.{" "}
          <span className="tabular">{cliente.codigo}</span>
        </p>
        {direccion && (
          <div className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
            <span>
              <span className="font-medium text-foreground">{direccion.nombre}</span>
              {" · "}
              {direccion.direccion}
            </span>
          </div>
        )}
      </div>

      {/* Fecha de entrega comprometida (RF-17) */}
      <div className="mt-3 rounded-lg border border-border bg-surface shadow-card p-4">
        <Label
          htmlFor="fecha-entrega"
          className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium"
        >
          Fecha de entrega comprometida
        </Label>
        <Input
          id="fecha-entrega"
          type="date"
          min={hoyISO}
          value={fechaEntrega}
          onChange={(e) => setFechaEntrega(e.target.value)}
          className="mt-2 w-44 tabular"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          Referencia para medir el saldo. Requerida para confirmar.
        </p>
      </div>

      {/* Items */}
      <div className="mt-3 rounded-lg border border-border bg-surface shadow-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-secondary/30">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            Items · <span className="tabular">{lineas.length}</span>
          </p>
        </div>
        <ul>
          {lineas.map((l, i) => (
            <li
              key={l.sku}
              className={cn(
                "flex items-center justify-between px-4 py-2.5",
                i !== lineas.length - 1 && "border-b border-border"
              )}
            >
              <div className="min-w-0">
                <p className="text-[12px] truncate">{l.descripcion}</p>
                <p className="text-[10px] text-muted-foreground tabular">
                  {l.sku} · {l.cantidad} und
                </p>
              </div>
              <p className="tabular text-[12px] font-medium">
                {formatCurrency(l.cantidad * l.precio)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* Totales */}
      <div className="mt-3 rounded-lg border border-border bg-surface shadow-card p-4 space-y-2">
        <div className="flex justify-between text-[12px]">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-muted-foreground">Descuentos</span>
          <span className="tabular text-success">−{formatCurrency(totalDescuento)}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-muted-foreground">Base imponible</span>
          <span className="tabular">{formatCurrency(base)}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-muted-foreground">IGV (18%)</span>
          <span className="tabular">{formatCurrency(igv)}</span>
        </div>
        <Separator />
        <div className="flex justify-between items-end pt-1">
          <span className="text-[13px] font-medium">Total</span>
          <div className="text-right">
            <p className="tabular text-2xl font-semibold tracking-tight">{formatCurrency(total)}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
              Incluye IGV
            </p>
          </div>
        </div>
      </div>

      {/* Nota del cliente */}
      <div className="mt-3 rounded-lg border border-border bg-surface shadow-card p-4">
        <Label
          htmlFor="nota-cliente"
          className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium"
        >
          Nota del cliente (opcional)
        </Label>
        <textarea
          id="nota-cliente"
          value={nota}
          onChange={(e) => setNota(e.target.value.slice(0, 500))}
          maxLength={500}
          rows={2}
          placeholder="Ej: Entregar después del 15, preguntar por Juan en recepción, no enviar factura física…"
          aria-label="Nota opcional del cliente para este pedido"
          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-[12px] resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
        />
        <p className="mt-1 text-[10px] text-muted-foreground tabular text-right">
          {nota.length}/500
        </p>
      </div>

      <div className="mt-4 flex items-start gap-2 text-[11px] text-muted-foreground">
        <Check className="h-3.5 w-3.5 mt-0.5 text-success shrink-0" aria-hidden="true" />
        <span>
          Confirmado, el pedido queda en estado{" "}
          <span className="font-medium text-foreground">confirmado</span> con stock reservado por
          48 horas.
        </span>
      </div>
    </div>
  );
}

// ===== Items iniciales para demo =====
/** Convierte un item guardado en una línea del asistente, completando
 *  articulo/talla/color desde el catálogo si el pedido semilla no los trae. */
function hidratarLinea(item: PedidoItem): Linea {
  const sku = SKUS.find((s) => s.codigo === item.sku);
  return {
    sku: item.sku,
    descripcion: item.descripcion,
    articulo: item.articulo ?? sku?.articulo ?? "",
    talla: item.talla ?? sku?.talla ?? "",
    color: item.color ?? sku?.color ?? "",
    cantidad: item.cantidad,
    precio: item.precio,
  };
}
