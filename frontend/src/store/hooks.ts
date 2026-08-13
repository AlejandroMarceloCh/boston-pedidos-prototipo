// Hooks finos sobre el store. Memorizan los cálculos derivados para que las
// vistas no los repitan en cada render.
import { useMemo } from "react";
import { useStore } from "./app-store";
import {
  disponibleDe,
  kpis,
  reservasPorSku,
  resumenes,
  resumenesPedidos,
  resumenesSolicitudes,
  saldoAlConfirmar,
} from "./selectors";
import type { PedidoDetalle } from "@/features/pedidos/pedido-data";

export function usePedidos() {
  const { state } = useStore();
  return useMemo(() => {
    const lista = resumenes(state);
    return {
      /** Todos los documentos. Para listados que muestran ambos. */
      resumenes: lista,
      /** Solo compras en firme. */
      pedidos: resumenesPedidos(state),
      /** Solo demanda no atendida (RF-20). */
      solicitudes: resumenesSolicitudes(state),
      borradores: lista.filter((p) => p.estado === "borrador"),
      pedido: (nro: string | null): PedidoDetalle | undefined =>
        nro ? state.pedidos[nro] : undefined,
      /** Pedidos vivos de un cliente, cruzados por código y no por nombre. */
      porCliente: (codigo: string | null) =>
        codigo
          ? Object.values(state.pedidos)
              .filter((p) => p.clienteId === codigo && p.estado !== "anulado")
              .map((p) => ({
                nro: p.nro,
                total: p.total,
                items: p.items.reduce((a, i) => a + (i.atendible ?? i.cantidad), 0),
              }))
          : [],
      total: lista.length,
    };
  }, [state]);
}

export function useStock() {
  const { state } = useStore();
  return useMemo(() => {
    const reservas = reservasPorSku(state);
    return {
      reservas,
      disponible: (skuCodigo: string) => disponibleDe(skuCodigo, reservas),
      saldoDe: (pedido: PedidoDetalle) => saldoAlConfirmar(pedido, reservas),
    };
  }, [state]);
}

export function useKpis() {
  const { state } = useStore();
  return useMemo(() => kpis(state, reservasPorSku(state)), [state]);
}
