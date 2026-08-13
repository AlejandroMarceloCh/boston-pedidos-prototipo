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
import type { EstadoPedido } from "./pedido-data";
import { formatCurrency, formatFechaISO } from "@/lib/utils";

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
  const { anularPedido, facturarPedido, entregarPedido, duplicarPedido } = useStore();
  const pedido = buscarPedido(pedidoId) ?? null;

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

  // Sin backend no hay envío real: se abre WhatsApp con el mensaje ya escrito.
  const reenviar = () => {
    if (!pedido) return;
    const texto = [
      `Pedido ${pedido.nro} · ${pedido.cliente}`,
      ...pedido.items.map(
        (i) => `• ${i.descripcion} (${i.sku}) x${i.cantidad} und`
      ),
      `Total: ${formatCurrency(pedido.total)}`,
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
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
                    <Badge variant={estadoConfig[pedido.estado].variant}>
                      {estadoConfig[pedido.estado].label}
                    </Badge>
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
                                {it.sku} · {it.cantidad} und · S/{" "}
                                {it.precio.toFixed(2)} c/u
                              </p>
                            </td>
                            <td className="px-3 py-2.5 text-right tabular font-medium align-top">
                              {formatCurrency(it.cantidad * it.precio)}
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

                {/* Saldo */}
                {pedido.tieneSaldo && pedido.saldoUnidades && (
                  <div className="rounded-lg border border-warning/40 bg-warning-soft/40 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-[12px] font-medium">
                          Saldo de <span className="tabular">{pedido.saldoUnidades}</span> unidades
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          Boston se comprometió a entregar más de lo que había en stock al confirmar.
                          Pendiente de reposición.
                        </p>
                      </div>
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
                {pedido.estado === "confirmado" && (
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
                {pedido.estado === "facturado" && (
                  <Button size="sm" onClick={entregar} className="gap-1.5">
                    <Truck className="h-3.5 w-3.5" />
                    Marcar como entregado
                  </Button>
                )}
                {pedido.estado === "borrador" && (
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
                {/* Entregado y anulado no tienen transición posible: la única
                    acción útil es volver a pedir lo mismo. */}
                {(pedido.estado === "entregado" || pedido.estado === "anulado") && (
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
