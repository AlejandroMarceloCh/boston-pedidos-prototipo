import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useStore } from "@/store/app-store";
import { AppLayout } from "@/components/layout/app-layout";
import LoginPage from "@/pages/login";
import { ClienteCart, ClienteHome, ComercialHome, MesaHome, VendedorHome } from "@/pages/role-home";
import ClientesPage from "@/pages/clientes";
import CatalogoPage from "@/pages/catalogo";
import ArmadoPedidoPage from "@/pages/armado-pedido";
import MisPedidosPage from "@/pages/mis-pedidos";
import InformesPage from "@/pages/informes";
import { type DemoRole, useRoleStore } from "@/store/role-store";

const ROLE_PATH: Record<DemoRole, string> = {
  cliente: "/cliente",
  vendedor: "/vendedor",
  mesa: "/mesa",
  comercial: "/comercial",
};

function InicioRol() {
  const { role } = useRoleStore();
  return <Navigate to={ROLE_PATH[role]} replace />;
}

function RutaRol({ role, children }: { role: DemoRole; children: React.ReactNode }) {
  const { role: activeRole } = useRoleStore();
  return activeRole === role ? <>{children}</> : <Navigate to={ROLE_PATH[activeRole]} replace />;
}

function RutaOperativa({ children }: { children: React.ReactNode }) {
  const { role } = useRoleStore();
  return role === "cliente" ? <Navigate to="/cliente" replace /> : <>{children}</>;
}

/**
 * Sin sesión abierta no se entra a las pantallas internas. Sin backend esto no
 * es seguridad —el estado vive en el navegador— pero evita que /dashboard se
 * abra escribiendo la URL, que es lo que se ve en una demo.
 */
function RutaPrivada({ children }: { children: React.ReactNode }) {
  const { state } = useStore();
  const location = useLocation();
  if (!state.sesion) {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RutaPrivada>
            <AppLayout />
          </RutaPrivada>
        }
      >
        <Route path="/" element={<InicioRol />} />
        <Route path="/dashboard" element={<InicioRol />} />
        <Route path="/cliente" element={<RutaRol role="cliente"><ClienteHome /></RutaRol>} />
        <Route path="/cliente/solicitud" element={<RutaRol role="cliente"><ClienteCart /></RutaRol>} />
        <Route path="/vendedor" element={<RutaRol role="vendedor"><VendedorHome /></RutaRol>} />
        <Route path="/mesa" element={<RutaRol role="mesa"><MesaHome /></RutaRol>} />
        <Route path="/comercial" element={<RutaRol role="comercial"><ComercialHome /></RutaRol>} />
        <Route path="/clientes" element={<RutaOperativa><ClientesPage /></RutaOperativa>} />
        <Route path="/catalogo" element={<RutaOperativa><CatalogoPage /></RutaOperativa>} />
        <Route path="/pedidos/nuevo" element={<RutaOperativa><ArmadoPedidoPage /></RutaOperativa>} />
        {/* Retomar un borrador existente: el asistente se hidrata desde el store. */}
        <Route path="/pedidos/:nro/editar" element={<RutaOperativa><ArmadoPedidoPage /></RutaOperativa>} />
        <Route path="/pedidos" element={<RutaOperativa><MisPedidosPage /></RutaOperativa>} />
        <Route path="/informes" element={<RutaOperativa><InformesPage /></RutaOperativa>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
