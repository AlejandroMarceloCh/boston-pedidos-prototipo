import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ClientesPage from "@/pages/clientes";
import CatalogoPage from "@/pages/catalogo";
import ArmadoPedidoPage from "@/pages/armado-pedido";
import MisPedidosPage from "@/pages/mis-pedidos";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
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
