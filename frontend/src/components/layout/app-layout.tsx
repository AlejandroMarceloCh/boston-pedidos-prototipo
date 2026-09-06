import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Boxes, ClipboardCheck, LayoutDashboard, LogOut, Menu, PackageSearch, RotateCcw, ShoppingCart, Users } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useStore } from "@/store/app-store";
import { type DemoRole, useRoleStore } from "@/store/role-store";
import { cn } from "@/lib/utils";

const ROLE_META: Record<DemoRole, { label: string; path: string; initials: string; name: string; subtitle: string }> = {
  cliente: { label: "", path: "/cliente", initials: "CD", name: "Comercial Demo Norte", subtitle: "Cuenta mayorista" },
  vendedor: { label: "Gestión de ventas", path: "/vendedor", initials: "VE", name: "Cuenta vendedor", subtitle: "Equipo comercial" },
  mesa: { label: "Mesa comercial", path: "/mesa", initials: "MC", name: "Mesa comercial", subtitle: "Aprobación y asignación" },
  comercial: { label: "Panel comercial", path: "/comercial", initials: "PC", name: "Panel comercial", subtitle: "Indicadores de gestión" },
};

const ROLE_NAV = {
  cliente: [],
  vendedor: [{ to: "/vendedor", label: "Mi día", icon: LayoutDashboard }, { to: "/clientes", label: "Clientes", icon: Users }, { to: "/catalogo", label: "Catálogo", icon: PackageSearch }, { to: "/pedidos", label: "Pedidos", icon: ShoppingCart }, { to: "/informes", label: "Informes", icon: BarChart3 }],
  mesa: [{ to: "/mesa", label: "Torre de control", icon: LayoutDashboard }, { to: "/pedidos", label: "Solicitudes", icon: ClipboardCheck }, { to: "/catalogo", label: "Disponibilidad", icon: Boxes }, { to: "/pedidos", label: "Reservas", icon: ShoppingCart }],
  comercial: [{ to: "/comercial", label: "Resumen", icon: LayoutDashboard }, { to: "/clientes", label: "Clientes", icon: Users }, { to: "/catalogo", label: "Productos", icon: PackageSearch }, { to: "/informes", label: "Inteligencia", icon: BarChart3 }],
};

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useRoleStore();
  const { resetDemo, salir } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const meta = ROLE_META[role];
  const nav = ROLE_NAV[role];

  return (
    <div className={cn("brand-app-shell", role === "cliente" && "brand-client-shell")}>
      <div className="brand-top-line" />
      <header className="brand-app-header">
        {role !== "cliente" && <button className="brand-mobile-menu" onClick={() => setMobileOpen((value) => !value)} aria-label="Abrir navegación"><Menu /></button>}
        <NavLink to={meta.path} className="brand-wordmark" aria-label="Boston inicio">
          <img src="/boston-logo.png" alt="Boston - Calidad en confecciones" />
        </NavLink>
        {role !== "cliente" && <div className="brand-current-area"><span>Área actual</span><strong>{meta.label}</strong></div>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><button className="brand-profile"><span><strong>{meta.name}</strong><small>{meta.subtitle}</small></span><Avatar><AvatarFallback>{meta.initials}</AvatarFallback></Avatar></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56"><DropdownMenuLabel>Demo Boston</DropdownMenuLabel><DropdownMenuSeparator/><DropdownMenuItem onClick={() => setResetOpen(true)}><RotateCcw/>Reiniciar datos</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem className="text-destructive" onClick={() => { salir(); navigate("/login"); }}><LogOut/>Cerrar sesión</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </header>
      <div className="brand-app-body">
        {role !== "cliente" && <aside className={cn("brand-sidebar", mobileOpen && "open")}>
          <div className="brand-sidebar-label">MECSA · B2B</div>
          <nav>{nav.map((item, index) => <NavLink key={`${item.to}-${item.label}`} to={item.to} onClick={() => setMobileOpen(false)} className={({isActive}) => cn(isActive && (location.pathname === item.to || index === 0) && "active")}><item.icon/><span>{item.label}</span></NavLink>)}</nav>
          <div className="brand-sidebar-company"><strong>MERCADEO COMERCIAL S.A.</strong><span>Av. Guzmán Blanco 422<br/>Lima, Perú</span></div>
        </aside>}
        <main className="brand-app-main"><Outlet /></main>
      </div>
      <ConfirmDialog open={resetOpen} onOpenChange={setResetOpen} title="¿Reiniciar datos demo?" description="Se restaurarán los pedidos y solicitudes iniciales." confirmText="Reiniciar" onConfirm={() => { resetDemo(); setResetOpen(false); }} />
    </div>
  );
}
