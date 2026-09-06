import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Boxes, ClipboardCheck, FileText, LayoutDashboard, LogOut, Menu, PackageSearch, RotateCcw, ShoppingCart, Truck, Users } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useStore } from "@/store/app-store";
import { type DemoRole, useRoleStore } from "@/store/role-store";
import { cn } from "@/lib/utils";

const ROLE_META: Record<DemoRole, { label: string; path: string; initials: string; name: string; subtitle: string }> = {
  cliente: { label: "Cliente", path: "/cliente", initials: "LC", name: "Luis Chávez", subtitle: "Distribuidor mayorista" },
  vendedor: { label: "Vendedor", path: "/vendedor", initials: "MQ", name: "Miguel Quispe", subtitle: "Ejecutivo comercial" },
  mesa: { label: "Mesa", path: "/mesa", initials: "FM", name: "Flor Mendoza", subtitle: "Mesa comercial" },
  comercial: { label: "Comercial", path: "/comercial", initials: "GC", name: "Gerencia Comercial", subtitle: "Mercadeo Comercial S.A." },
};

const ROLE_NAV = {
  cliente: [{ to: "/cliente", label: "Inicio", icon: LayoutDashboard }, { to: "/catalogo", label: "Catálogo", icon: PackageSearch }, { to: "/pedidos", label: "Solicitudes", icon: FileText }, { to: "/pedidos", label: "Seguimiento", icon: Truck }],
  vendedor: [{ to: "/vendedor", label: "Mi día", icon: LayoutDashboard }, { to: "/clientes", label: "Clientes", icon: Users }, { to: "/catalogo", label: "Catálogo", icon: PackageSearch }, { to: "/pedidos", label: "Pedidos", icon: ShoppingCart }, { to: "/informes", label: "Informes", icon: BarChart3 }],
  mesa: [{ to: "/mesa", label: "Torre de control", icon: LayoutDashboard }, { to: "/pedidos", label: "Solicitudes", icon: ClipboardCheck }, { to: "/catalogo", label: "Disponibilidad", icon: Boxes }, { to: "/pedidos", label: "Reservas", icon: ShoppingCart }],
  comercial: [{ to: "/comercial", label: "Resumen", icon: LayoutDashboard }, { to: "/clientes", label: "Clientes", icon: Users }, { to: "/catalogo", label: "Productos", icon: PackageSearch }, { to: "/informes", label: "Inteligencia", icon: BarChart3 }],
};

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, setRole } = useRoleStore();
  const { resetDemo, salir } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const meta = ROLE_META[role];
  const nav = ROLE_NAV[role];
  const chooseRole = (nextRole: DemoRole) => { setRole(nextRole); navigate(ROLE_META[nextRole].path); setMobileOpen(false); };

  return (
    <div className="brand-app-shell">
      <div className="brand-top-line" />
      <header className="brand-app-header">
        <button className="brand-mobile-menu" onClick={() => setMobileOpen((value) => !value)} aria-label="Abrir navegación"><Menu /></button>
        <NavLink to={meta.path} className="brand-wordmark" aria-label="Boston inicio">BOSTON<span>CALIDAD EN CONFECCIONES</span></NavLink>
        <nav className="brand-role-switch" aria-label="Cambiar experiencia de la demostración">
          {(Object.keys(ROLE_META) as DemoRole[]).map((item) => <button key={item} onClick={() => chooseRole(item)} aria-current={role === item ? "page" : undefined}>{ROLE_META[item].label}</button>)}
        </nav>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><button className="brand-profile"><span><strong>{meta.name}</strong><small>{meta.subtitle}</small></span><Avatar><AvatarFallback>{meta.initials}</AvatarFallback></Avatar></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56"><DropdownMenuLabel>Demo Boston</DropdownMenuLabel><DropdownMenuSeparator/><DropdownMenuItem onClick={() => setResetOpen(true)}><RotateCcw/>Reiniciar datos</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem className="text-destructive" onClick={() => { salir(); navigate("/login"); }}><LogOut/>Cerrar sesión</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </header>
      <div className="brand-app-body">
        <aside className={cn("brand-sidebar", mobileOpen && "open")}>
          <div className="brand-sidebar-label">MECSA · B2B</div>
          <nav>{nav.map((item, index) => <NavLink key={`${item.to}-${item.label}`} to={item.to} onClick={() => setMobileOpen(false)} className={({isActive}) => cn(isActive && (location.pathname === item.to || index === 0) && "active")}><item.icon/><span>{item.label}</span></NavLink>)}</nav>
          <div className="brand-sidebar-company"><strong>MERCADEO COMERCIAL S.A.</strong><span>Av. Guzmán Blanco 422<br/>Lima, Perú</span></div>
        </aside>
        <main className="brand-app-main"><Outlet /></main>
      </div>
      <ConfirmDialog open={resetOpen} onOpenChange={setResetOpen} title="¿Reiniciar datos demo?" description="Se restaurarán los pedidos y solicitudes iniciales." confirmText="Reiniciar" onConfirm={() => { resetDemo(); setResetOpen(false); }} />
    </div>
  );
}
