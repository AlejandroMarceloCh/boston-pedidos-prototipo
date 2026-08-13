import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useStore } from "@/store/app-store";
import { AppLayout } from "@/components/layout/app-layout";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ClientesPage from "@/pages/clientes";
import CatalogoPage from "@/pages/catalogo";
import ArmadoPedidoPage from "@/pages/armado-pedido";
import MisPedidosPage from "@/pages/mis-pedidos";

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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/catalogo" element={<CatalogoPage />} />
        <Route path="/pedidos/nuevo" element={<ArmadoPedidoPage />} />
        {/* Retomar un borrador existente: el asistente se hidrata desde el store. */}
        <Route path="/pedidos/:nro/editar" element={<ArmadoPedidoPage />} />
        <Route path="/pedidos" element={<MisPedidosPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
