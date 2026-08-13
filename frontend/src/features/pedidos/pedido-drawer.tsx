import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  FileText,
  Truck,
  Send,
  Pencil,
  Ban,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
  DrawerCloseButton,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePedidos } from "@/store/hooks";
import { useStore } from "@/store/app-store";
import {
  CAUSA_SALDO_LABEL,
  ESTADO_SOLICITUD_LABEL,
  esSolicitud,
  saldoVencido,
  type CausaSaldo,
  type EstadoPedido,
} from "./pedido-data";
import { CLIENTES } from "@/lib/mock-data";
import { cn, formatCurrency, formatFechaISO } from "@/lib/utils";

const estadoConfig: Record<
  EstadoPedido,
  { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }
> = {
  borrador: { label: "Borrador", variant: "secondary" },
  confirmado: { label: "Confirmado", variant: "success" },
  facturado: { label: "Facturado", variant: "default" },
  entregado: { label: "Entregado", variant: "default" },
  anulado: { label: "Anulado", variant: "destructive" },
};

const eventoIcon = {
  creado: Clock,
  confirmado: CheckCircle2,
  facturado: FileText,
  entregado: Truck,
  anulado: Ban,
  observacion: AlertTriangle,
};

const eventoColor = {
  creado: "text-muted-foreground",
  confirmado: "text-success",
  facturado: "text-primary",
  entregado: "text-foreground",
  anulado: "text-destructive",
  observacion: "text-warning",
};

export function PedidoDrawer({
  pedidoId,
  onClose,
}: {
  pedidoId: string | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [confirmarAnular, setConfirmarAnular] = useState(false);
  const { pedido: buscarPedido } = usePedidos();
  const {
    anularPedido,
    facturarPedido,
    entregarPedido,
    duplicarPedido,
    setCausaSaldo,
    resolverSolicitud,
  } = useStore();
  const pedido = buscarPedido(pedidoId) ?? null;
  const vencido = pedido ? saldoVencido(pedido) : false;

  // El drawer NO se cierra tras una transición: el badge y el historial se
  // actualizan a la vista, que es la prueba de que el cambio ocurrió.
  const anular = () => {
    if (!pedido) return;
    const liberadas = pedido.items.reduce((a, i) => a + i.cantidad, 0);
    anularPedido(pedido.nro, "Cancelado por el cliente");
    toast.success(`Pedido ${pedido.nro} anulado`, {
      description: `${liberadas} unidades devueltas al stock disponible.`,
    });
  };

  const facturar = () => {
    if (!pedido) return;
    facturarPedido(pedido.nro);
    toast.success(`Pedido ${pedido.nro} facturado`);
  };

  const entregar = () => {
    if (!pedido) return;
    entregarPedido(pedido.nro);
    toast.success(`Pedido ${pedido.nro} marcado como entregado`);
  };

  const duplicar = () => {
    if (!pedido) return;
    const nuevo = duplicarPedido(pedido.nro);
    toast.success(`Borrador ${nuevo} creado`, {
      description: `Copia de ${pedido.nro} con sus ${pedido.items.length} items.`,
    });
    onClose();
    navigate(`/pedidos/${nuevo}/editar`);
  };

  // Sin backend no hay envío real: se abre WhatsApp con el mensaje ya escrito
  // y, si el cliente tiene teléfono, dirigido a su número.
  const reenviar = () => {
    if (!pedido) return;
    const destino = CLIENTES.find((c) => c.codigo === pedido.clienteId)?.telefono;
    const texto = [
      `Pedido ${pedido.nro} · ${pedido.cliente}`,
      ...pedido.items.map(
        (i) => `• ${i.descripcion} (${i.sku}) x${i.cantidad} und`
      ),
      `Total: ${formatCurrency(pedido.total)}`,
    ].join("\n");
    const numero = destino?.replace(/[^\d]/g, "") ?? "";
    window.open(
      `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`,
      "_blank",
      "noopener"
    );
  };

  return (
    <>
      <Drawer open={!!pedidoId} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent size="wide">
          {pedido && (
            <>
              <DrawerHeader>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="tabular text-[13px] font-medium">{pedido.nro}</span>
                    {esSolicitud(pedido) ? (
                      <Badge variant={pedido.estadoSolicitud === "rechazada" ? "destructive" : "warning"}>
                        Solicitud ·{" "}
                        {ESTADO_SOLICITUD_LABEL[pedido.estadoSolicitud ?? "pendiente"]}
                      </Badge>
                    ) : (
                      <Badge variant={estadoConfig[pedido.estado].variant}>
                        {estadoConfig[pedido.estado].label}
                      </Badge>
                    )}
                    {pedido.tieneSaldo && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Badge variant="warning">Con saldo</Badge>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {pedido.saldoUnidades} unidades pendientes de entrega
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <DrawerTitle className="truncate">{pedido.cliente}</DrawerTitle>
                  <DrawerDescription>
                    {pedido.fecha} · {pedido.condicion} ·{" "}
                    <span className="tabular">{pedido.moneda}</span>
                    {pedido.fechaEntrega && (
                      <>
                        {" · entrega "}
                        <span className="tabular">
                          {formatFechaISO(pedido.fechaEntrega)}
                        </span>
                      </>
                    )}
                  </DrawerDescription>
                </div>
                <DrawerCloseButton />
              </DrawerHeader>

              <DrawerBody className="space-y-5">
                {/* Items */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">
                    Items · <span className="tabular">{pedido.items.length}</span>
                  </p>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-[12px]">
                      <tbody>
                        {pedido.items.map((it, i) => (
                          <tr key={it.sku} className={i > 0 ? "border-t border-border" : ""}>
                            <td className="px-3 py-2.5">
                              <p className="leading-snug">{it.descripcion}</p>
                              <p className="tabular text-[10px] text-muted-foreground mt-0.5">
                                {it.sku} · {it.atendible ?? it.cantidad} und · S/{" "}
                                {it.precio.toFixed(2)} c/u
                                {(it.cantidad - (it.atendible ?? it.cantidad)) > 0 && (
                                  <span className="text-warning">
                                    {" "}
                                    · {it.cantidad - (it.atendible ?? it.cantidad)} sin stock
                                  </span>
                                )}
                              </p>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular font-medium align-top">
                              {formatCurrency((it.atendible ?? it.cantidad) * it.precio)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Separator />

                {/* Totales */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">
                    Totales
                  </p>
                  <div className="space-y-1.5 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular">{formatCurrency(pedido.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Descuentos</span>
                      <span className="tabular text-success">
                        −{formatCurrency(pedido.descuentoTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IGV (18%)</span>
                      <span className="tabular">{formatCurrency(pedido.igv)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between items-end">
                      <span className="font-medium">Total</span>
                      <span className="tabular text-lg font-semibold">
                        {formatCurrency(pedido.total)}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Saldo · RF-45: se registra la causa, no solo la cantidad */}
                {pedido.tieneSaldo && pedido.saldoUnidades && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">
                      Saldo
                    </p>
                    <p className="text-[12px]">
                      <span className="tabular">{pedido.saldoUnidades}</span> und pendientes
                      {pedido.causaSaldo && (
                        <span className="text-muted-foreground">
                          {" · "}
                          {CAUSA_SALDO_LABEL[pedido.causaSaldo]}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {vencido
                        ? `Entrega comprometida el ${formatFechaISO(pedido.fechaEntrega!)}, vencida.`
                        : "Se comprometió más de lo disponible al confirmar. Pendiente de reposición."}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      {(Object.keys(CAUSA_SALDO_LABEL) as CausaSaldo[]).map((c) => (
                        <button
                          key={c}
                          onClick={() => setCausaSaldo(pedido.nro, c)}
                          className={cn(
                            "rounded border px-2 py-1 text-[11px] transition-colors",
                            pedido.causaSaldo === c
                              ? "border-border-strong text-foreground"
                              : "border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {CAUSA_SALDO_LABEL[c]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-3">
                    Historial
                  </p>
                  <div className="space-y-3">
                    {pedido.eventos.map((ev, i) => {
                      const Icon = eventoIcon[ev.tipo];
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <Icon className={`h-3.5 w-3.5 ${eventoColor[ev.tipo]} shrink-0`} />
                            {i < pedido.eventos.length - 1 && (
                              <div className="w-px h-5 bg-border my-0.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <p className="text-[12px] capitalize">
                              <span className="font-medium">{ev.tipo}</span>{" "}
                              <span className="text-muted-foreground">· {ev.detalle}</span>
                            </p>
                            <p className="tabular text-[10px] text-muted-foreground mt-0.5">
                              {ev.fecha}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </DrawerBody>

              <DrawerFooter>
                {/* Acciones contextuales según estado */}
                {!esSolicitud(pedido) && pedido.estado === "confirmado" && (
                  <>
                    <Button variant="outline" size="sm" onClick={reenviar} className="gap-1.5">
                      <Send className="h-3.5 w-3.5" />
                      Reenviar WhatsApp
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmarAnular(true)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/5 gap-1.5"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Anular
                    </Button>
                    <Button size="sm" onClick={facturar} className="gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Facturar
                    </Button>
                  </>
                )}
                {!esSolicitud(pedido) && pedido.estado === "facturado" && (
                  <Button size="sm" onClick={entregar} className="gap-1.5">
                    <Truck className="h-3.5 w-3.5" />
                    Marcar como entregado
                  </Button>
                )}
                {!esSolicitud(pedido) && pedido.estado === "borrador" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onClose();
                      navigate(`/pedidos/${pedido.nro}/editar`);
                    }}
                    className="gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Continuar editando
                  </Button>
                )}
                {/* RF-21: una solicitud se aprueba o se rechaza. No se factura
                    ni se entrega: primero tiene que haber stock. */}
                {esSolicitud(pedido) && pedido.estadoSolicitud === "pendiente" && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        resolverSolicitud(pedido.nro, "rechazada", "No se puede atender");
                        toast(`Solicitud ${pedido.nro} rechazada`);
                      }}
                      className="text-destructive hover:text-destructive hover:bg-destructive/5 gap-1.5"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Rechazar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        resolverSolicitud(pedido.nro, "aprobada");
                        toast.success(`Solicitud ${pedido.nro} aprobada`, {
                          description: "Queda a la espera de reposición.",
                        });
                      }}
                      className="gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Aprobar
                    </Button>
                  </>
                )}

                {/* Entregado y anulado no tienen transición posible: la única
                    acción útil es volver a pedir lo mismo. */}
                {!esSolicitud(pedido) && (pedido.estado === "entregado" || pedido.estado === "anulado") && (
                  <Button variant="outline" size="sm" onClick={duplicar} className="gap-1.5">
                    <Copy className="h-3.5 w-3.5" />
                    Duplicar pedido
                  </Button>
                )}
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        open={confirmarAnular}
        onOpenChange={setConfirmarAnular}
        variant="destructive"
        title={`Anular pedido ${pedido?.nro}`}
        description={
          <>
            Esta acción libera{" "}
            <span className="font-medium text-foreground">
              {pedido?.items.reduce((a, it) => a + it.cantidad, 0)} unidades
            </span>{" "}
            reservadas y notifica al cliente. <strong>No se puede deshacer.</strong>
          </>
        }
        confirmText="Anular"
        typeToConfirm="ANULAR"
        onConfirm={anular}
      />
    </>
  );
}
