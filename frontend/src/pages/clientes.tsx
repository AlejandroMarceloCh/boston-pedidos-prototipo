import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Filter, MapPin, Plus, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CLIENTES } from "@/lib/mock-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ClienteDrawer } from "@/features/clientes/cliente-drawer";

type Filtro = "todos" | "preferenciales" | "distribuidores" | "inactivos";

export default function ClientesPage() {
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [selectedCliente, setSelectedCliente] = useState<string | null>(null);
  const [altaOpen, setAltaOpen] = useState(false);
  const [altaForm, setAltaForm] = useState({ razonSocial: "", ruc: "", contacto: "" });
  const [params, setParams] = useSearchParams();

  // ?abrir=CODIGO — lo usa el buscador ⌘K para saltar directo a un cliente.
  useEffect(() => {
    const abrir = params.get("abrir");
    if (!abrir) return;
    setSelectedCliente(abrir);
    params.delete("abrir");
    setParams(params, { replace: true });
  }, [params, setParams]);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CLIENTES.filter((c) => {
      const matches =
        !q ||
        c.razonSocial.toLowerCase().includes(q) ||
        c.ruc.includes(q) ||
        c.codigo.includes(q);
      if (!matches) return false;
      switch (filtro) {
        case "preferenciales":
          return c.preferencial;
        case "distribuidores":
          return c.distribuidor;
        case "inactivos":
          return !c.activo;
        default:
          return true;
      }
    });
  }, [query, filtro]);

  return (
    <div className="mx-auto max-w-7xl px-7 lg:px-12 py-10 animate-fade-in">
      {/* Header */}
      <header className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            Maestro de clientes
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {CLIENTES.filter((c) => c.activo).length} clientes activos asignados a tu cartera.
          </p>
        </div>
        <Button variant="outline" className="gap-1.5" onClick={() => setAltaOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Solicitar alta
        </Button>
      </header>

      {/* Filtros + buscador */}
      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por razón social, RUC o código…"
              className="pl-9"
            />
          </div>
          <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="preferenciales">Preferenciales</TabsTrigger>
              <TabsTrigger value="distribuidores">Distribuidores</TabsTrigger>
              <TabsTrigger value="inactivos">Inactivos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                <th className="text-left font-medium uppercase tracking-widest text-[10px] px-5 py-2.5">
                  Cliente
                </th>
                <th className="text-left font-medium uppercase tracking-widest text-[10px] py-2.5">
                  RUC
                </th>
                <th className="text-left font-medium uppercase tracking-widest text-[10px] py-2.5">
                  Tipo
                </th>
                <th className="text-left font-medium uppercase tracking-widest text-[10px] py-2.5">
                  Entregas
                </th>
                <th className="text-left font-medium uppercase tracking-widest text-[10px] py-2.5">
                  Estado
                </th>
                <th className="w-8 px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr
                  key={c.codigo}
                  onClick={() => setSelectedCliente(c.codigo)}
                  className="border-b border-border last:border-0 hover:bg-accent/40 transition-colors group cursor-pointer"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                        {c.razonSocial.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate group-hover:text-primary transition-colors">
                          {c.razonSocial}
                        </p>
                        <p className="tabular text-xs text-muted-foreground">
                          cod. {c.codigo} · vendedor {c.vendedor}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="tabular text-xs text-muted-foreground">{c.ruc}</span>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1.5">
                      {c.distribuidor && (
                            <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Badge variant="secondary">Distribuidor</Badge>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Compra para revender · descuento adicional
                            </TooltipContent>
                          </Tooltip>
                        )}
                      {c.preferencial && (
                            <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Badge variant="success">Preferencial</Badge>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Buen pagador · prioridad en disputa de stock
                            </TooltipContent>
                          </Tooltip>
                        )}
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="tabular">{c.direccionesEntrega.length}</span>
                    </span>
                  </td>
                  <td className="py-3">
                    {c.activo ? (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtrados.length === 0 && (
          <div className="px-6 py-16 text-center">
            <Filter className="h-7 w-7 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">Sin resultados</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Prueba con otro término o cambia el filtro.
            </p>
          </div>
        )}
      </Card>

      <Separator className="my-6" />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Mostrando <span className="tabular">{filtrados.length}</span> de{" "}
          <span className="tabular">{CLIENTES.length}</span> clientes
        </span>
        <Link to="/pedidos/nuevo" className="hover:text-foreground transition-colors">
          Nuevo pedido →
        </Link>
      </div>

      <ClienteDrawer
        clienteId={selectedCliente}
        onClose={() => setSelectedCliente(null)}
      />

      {/* Alta de cliente: en Boston la aprueba Créditos, así que desde acá solo
          se solicita. Sin backend, la solicitud queda registrada como aviso. */}
      <Dialog open={altaOpen} onOpenChange={setAltaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Solicitar alta de cliente</DialogTitle>
          </DialogHeader>
          <form
            className="px-6 pb-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("Solicitud enviada a Créditos", {
                description: `${altaForm.razonSocial} · RUC ${altaForm.ruc}. Te avisamos cuando la aprueben.`,
              });
              setAltaForm({ razonSocial: "", ruc: "", contacto: "" });
              setAltaOpen(false);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="alta-razon">Razón social</Label>
              <Input
                id="alta-razon"
                required
                value={altaForm.razonSocial}
                onChange={(e) => setAltaForm((f) => ({ ...f, razonSocial: e.target.value }))}
                placeholder="Distribuidora Ejemplo SAC"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alta-ruc">RUC</Label>
              <Input
                id="alta-ruc"
                required
                inputMode="numeric"
                pattern="[0-9]{11}"
                title="11 dígitos"
                value={altaForm.ruc}
                onChange={(e) =>
                  setAltaForm((f) => ({ ...f, ruc: e.target.value.replace(/[^\d]/g, "").slice(0, 11) }))
                }
                placeholder="20512345678"
                className="tabular"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alta-contacto">Contacto</Label>
              <Input
                id="alta-contacto"
                value={altaForm.contacto}
                onChange={(e) => setAltaForm((f) => ({ ...f, contacto: e.target.value }))}
                placeholder="Nombre y teléfono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setAltaOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Enviar solicitud</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
