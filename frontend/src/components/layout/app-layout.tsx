import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Users,
  PackageSearch,
  ClipboardList,
  BarChart3,
  Search,
  ShoppingCart,
  ChevronRight,
  RotateCcw,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useStore } from "@/store/app-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CURRENT_USER, CLIENTES, ARTICULOS } from "@/lib/mock-data";

const NAV = [
  { to: "/dashboard", label: "Resumen", icon: LayoutGrid },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/catalogo", label: "Catálogo", icon: PackageSearch },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/informes", label: "Informes", icon: BarChart3 },
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [navAbierto, setNavAbierto] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const { resetDemo, salir } = useStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (path: string) => {
    navigate(path);
    setCmdOpen(false);
  };

  const current = NAV.find((n) => location.pathname.startsWith(n.to));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* ===== Sidebar =====
          Colapsado a 60px (solo iconos). Se expande a 200px al pasar el cursor
          y vuelve a contraerse al salir. Ocupa un riel fijo en el layout para
          que el contenido no se mueva: el panel expandido flota por encima. */}
      <div className="hidden md:block w-[60px] shrink-0" aria-hidden="true" />
      <aside
        onMouseEnter={() => setNavAbierto(true)}
        onMouseLeave={() => setNavAbierto(false)}
        onFocusCapture={() => setNavAbierto(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setNavAbierto(false);
        }}
        className={cn(
          "hidden md:flex fixed inset-y-0 left-0 z-30 flex-col bg-background",
          "transition-[width,box-shadow] duration-200 ease-smooth",
          navAbierto ? "w-[200px] shadow-elevated" : "w-[60px] shadow-rail"
        )}
      >
        <div className="flex h-14 items-center px-[18px]">
          <NavLink to="/dashboard" className="flex items-center gap-2" aria-label="Ir al resumen">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-[11px] font-semibold">
              B
            </div>
            <span
              className={cn(
                "text-[13px] font-semibold tracking-tight whitespace-nowrap transition-opacity duration-200",
                navAbierto ? "opacity-100" : "opacity-0"
              )}
            >
              Boston
            </span>
          </NavLink>
        </div>

        <nav className="flex-1 px-2 py-2">
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  title={navAbierto ? undefined : item.label}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-md px-[9px] py-1.5 text-[13px] transition-colors",
                      isActive
                        ? "bg-surface text-foreground shadow-subtle"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    )
                  }
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  <span
                    className={cn(
                      "whitespace-nowrap transition-opacity duration-200",
                      navAbierto ? "opacity-100" : "opacity-0"
                    )}
                  >
                    {item.label}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-md px-[9px] py-1.5 text-left transition-colors hover:bg-secondary/60">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-medium">
                    {CURRENT_USER.iniciales}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "flex-1 min-w-0 transition-opacity duration-200",
                    navAbierto ? "opacity-100" : "opacity-0"
                  )}
                >
                  <p className="truncate text-[12px] font-medium leading-none">
                    {CURRENT_USER.nombre}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground whitespace-nowrap">
                    cod. {CURRENT_USER.codigo}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setResetOpen(true)}>
                <RotateCcw className="h-3.5 w-3.5" />
                Reiniciar datos demo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  salir();
                  navigate("/login");
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ===== Main ===== */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 shrink-0 items-center gap-3 bg-background px-4 sm:px-6 shadow-bar z-20">
          <div className="flex items-center gap-1.5 text-[13px] min-w-0">
            <NavLink
              to="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors hidden sm:inline"
            >
              Boston
            </NavLink>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50 hidden sm:inline" aria-hidden="true" />
            <span className="font-medium truncate">{current?.label ?? ""}</span>
          </div>

          <button
            onClick={() => setCmdOpen(true)}
            aria-label="Abrir búsqueda o ejecutar comando"
            className="ml-auto flex items-center gap-2 rounded-md border border-border bg-surface shadow-sunken px-2.5 h-8 text-muted-foreground hover:border-border-strong transition-colors min-w-0 sm:min-w-[200px] flex-1 sm:flex-initial max-w-[220px] sm:max-w-none"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[12px] truncate hidden sm:inline">Buscar…</span>
            <kbd className="ml-auto hidden sm:inline-flex h-4 items-center rounded border border-border bg-secondary px-1 text-[9px] font-mono">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={() => navigate("/pedidos/nuevo")}
            aria-label="Crear nuevo pedido"
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 h-8 text-[12px] font-medium hover:bg-primary/90 transition-colors active:scale-[0.98] shrink-0"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Nuevo pedido</span>
          </button>
        </header>

        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* ===== Bottom nav mobile ===== */}
        <nav
          aria-label="Navegación principal"
          className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <ul className="grid grid-cols-6 h-14">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center justify-center gap-0.5 h-full text-[10px] transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )
                  }
                  aria-label={item.label}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="truncate max-w-full">{item.label}</span>
                </NavLink>
              </li>
            ))}
            <li>
              <button
                onClick={() => navigate("/pedidos/nuevo")}
                aria-label="Nuevo pedido"
                className="flex flex-col items-center justify-center gap-0.5 h-full w-full text-[10px] text-primary hover:text-primary/80 transition-colors"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Nuevo</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* ===== Command palette ===== */}
      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Buscar cliente, producto o navegar…" />
        <CommandList>
          <CommandEmpty>No se encontró nada.</CommandEmpty>
          <CommandGroup heading="Navegación">
            {NAV.map((n) => (
              <CommandItem key={n.to} onSelect={() => go(n.to)}>
                <n.icon className="h-4 w-4" />
                <span>{n.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Acciones">
            <CommandItem onSelect={() => go("/pedidos/nuevo")}>
              <ShoppingCart className="h-4 w-4" />
              <span>Crear nuevo pedido</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          {/* Toda la cartera y todo el catálogo: cmdk filtra sobre el value,
              así que basta con listarlos y dejar que él haga el match. */}
          <CommandGroup heading="Clientes">
            {CLIENTES.filter((c) => c.activo).map((c) => (
              <CommandItem
                key={c.codigo}
                value={`${c.razonSocial} ${c.ruc} ${c.codigo}`}
                onSelect={() => go(`/clientes?abrir=${c.codigo}`)}
              >
                <Users className="h-4 w-4" />
                <span>{c.razonSocial}</span>
                <span className="ml-auto tabular text-xs text-muted-foreground">{c.ruc}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Productos">
            {ARTICULOS.filter((a) => a.activo).map((a) => (
              <CommandItem
                key={a.codigo}
                value={`${a.descripcion} ${a.codigo} ${a.linea}`}
                onSelect={() => go(`/catalogo?abrir=${a.codigo}`)}
              >
                <PackageSearch className="h-4 w-4" />
                <span className="truncate">{a.descripcion}</span>
                <span className="ml-auto tabular text-xs text-muted-foreground">{a.codigo}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Volver a los pedidos de ejemplo: necesario para repetir una demo. */}
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        variant="destructive"
        title="Reiniciar datos demo"
        description={
          <>
            Se borran todos los pedidos creados en este navegador y se vuelve a los 7
            pedidos de ejemplo. No se puede deshacer.
          </>
        }
        confirmText="Reiniciar"
        typeToConfirm="REINICIAR"
        onConfirm={() => {
          resetDemo();
          toast.success("Datos de demo restablecidos");
          navigate("/dashboard");
        }}
      />
    </div>
  );
}
