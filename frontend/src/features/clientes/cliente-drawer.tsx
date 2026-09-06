import {
  MapPin,
  Phone,
  Mail,
  Calendar,
  ShoppingBag,
  TrendingUp,
  Plus,
  AlertTriangle,
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
import { useNavigate } from "react-router-dom";
import { CLIENTES } from "@/lib/mock-data";
import { usePedidos } from "@/store/hooks";
import { formatCurrency } from "@/lib/utils";

export function ClienteDrawer({
  clienteId,
  onClose,
}: {
  clienteId: string | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const cliente = CLIENTES.find((c) => c.codigo === clienteId) ?? null;
  const { porCliente } = usePedidos();

  // Estadísticas reales del cliente. Se cruza por clienteId y no por nombre:
  // las razones sociales llevan sufijo ("… SAC") y los pedidos guardan el
  // nombre sin él, así que el cruce por texto daba 0 pedidos para todos.
  const stats = (() => {
    const suyos = porCliente(cliente?.codigo ?? null);
    return {
      pedidos: suyos.length,
      docenas: Math.floor(suyos.reduce((a, p) => a + p.items, 0) / 12),
      monto: suyos.reduce((a, p) => a + p.total, 0),
    };
  })();

  return (
    <Drawer open={!!clienteId} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent size="default">
        {cliente && (
          <>
            <DrawerHeader>
              <div className="flex-1 min-w-0">
                <DrawerTitle className="truncate">{cliente.razonSocial}</DrawerTitle>
                <DrawerDescription>
                  RUC <span className="tabular">{cliente.ruc}</span> · Cod.{" "}
                  <span className="tabular">{cliente.codigo}</span>
                </DrawerDescription>
              </div>
              <DrawerCloseButton />
            </DrawerHeader>

            <DrawerBody className="space-y-5">
              {/* Estado */}
              <div className="flex flex-wrap items-center gap-1.5">
                <EstadoBadge activo={cliente.activo} />
                {cliente.preferencial && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Badge variant="success">Preferencial</Badge>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Buen pagador · Mora promedio 4 días · Volumen anual alto
                    </TooltipContent>
                  </Tooltip>
                )}
                {cliente.distribuidor && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Badge variant="secondary">Distribuidor</Badge>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Compra para revender · Tiene descuento adicional por volumen
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* KPIs del cliente, derivados de sus pedidos reales */}
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Pedidos" value={String(stats.pedidos)} icon={ShoppingBag} />
                <Stat label="Volumen" value={`${stats.docenas} doc`} icon={TrendingUp} />
                <Stat label="Facturado" value={formatCurrency(stats.monto)} icon={Calendar} />
              </div>

              {/* Nota comercial */}
              {cliente.notas && (
                <div className="rounded-lg border border-warning/30 bg-warning-soft/50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed text-foreground/80">
                      {cliente.notas}
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Contacto */}
              <Section title="Contacto">
                {cliente.telefono ? (
                  <ContactRow
                    icon={Phone}
                    label="Teléfono"
                    value={cliente.telefono}
                    href={`tel:${cliente.telefono.replace(/\s/g, "")}`}
                  />
                ) : (
                  <ContactRow icon={Phone} label="Teléfono" value="No registrado" muted />
                )}
                {cliente.email ? (
                  <ContactRow
                    icon={Mail}
                    label="Email"
                    value={cliente.email}
                    href={`mailto:${cliente.email}`}
                  />
                ) : (
                  <ContactRow icon={Mail} label="Email" value="No registrado" muted />
                )}
              </Section>

              <Separator />

              {/* Direcciones de entrega */}
              <Section title={`Direcciones de entrega (${cliente.direccionesEntrega.length})`}>
                <div className="space-y-2">
                  {cliente.direccionesEntrega.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-start gap-2 rounded-md border border-border bg-background p-2.5"
                    >
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium">{d.nombre}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{d.direccion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Separator />

              {/* Vendedor asignado */}
              <Section title="Vendedor asignado">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                    MQ
                  </div>
                  <div>
                    <p className="text-[12px] font-medium">Vendedor Demo 01</p>
                    <p className="text-[10px] text-muted-foreground tabular">cod. {cliente.vendedor}</p>
                  </div>
                </div>
              </Section>
            </DrawerBody>

            <DrawerFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate(`/pedidos/nuevo?cliente=${cliente.codigo}`);
                }}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Nuevo pedido
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-2.5">
      <Icon className="h-3 w-3 text-muted-foreground mb-1.5" />
      <p className="tabular text-[14px] font-semibold leading-tight">{value}</p>
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">
        {label}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  muted,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  muted?: boolean;
  /** Si viene, el valor se vuelve accionable (tel: / mailto:). */
  href?: string;
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-[11px] text-muted-foreground w-20">{label}</span>
      {href ? (
        <a
          href={href}
          className="text-[12px] tabular text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          {value}
        </a>
      ) : (
        <span className={`text-[12px] tabular ${muted ? "text-muted-foreground/60" : ""}`}>
          {value}
        </span>
      )}
    </div>
  );
}

function EstadoBadge({ activo }: { activo: boolean }) {
  return activo ? (
    <Badge variant="success" className="gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      Activo
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
      Inactivo
    </Badge>
  );
}
