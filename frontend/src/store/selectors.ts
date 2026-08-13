// Lecturas derivadas del estado. Funciones puras: reciben el estado y devuelven
// lo que cada vista necesita, sin guardar nada aparte.
import {
  ESTADOS_QUE_RESERVAN,
  type PedidoDetalle,
  type PedidoResumen,
} from "@/features/pedidos/pedido-data";
import { SKUS } from "@/lib/mock-data";
import type { AppState } from "./semilla";

const dosDigitos = (n: number) => String(n).padStart(2, "0");

/** "2026-08-12 14:05" — el formato que usan fechas y eventos. */
export function ahoraTexto(d: Date = new Date()): string {
  return (
    `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}` +
    ` ${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`
  );
}

/**
 * Siguiente número correlativo del día: "2026-0812-001".
 * Se calcula mirando los pedidos existentes, sin contador aparte: así el
 * reinicio de la demo no puede dejar el correlativo descuadrado.
 */
export function siguienteNro(state: AppState, ahora: Date = new Date()): string {
  const prefijo = `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}${dosDigitos(
    ahora.getDate()
  )}`;
  const maximo = Object.keys(state.pedidos)
    .filter((nro) => nro.startsWith(prefijo))
    .reduce((max, nro) => Math.max(max, parseInt(nro.slice(-3), 10) || 0), 0);
  return `${prefijo}-${String(maximo + 1).padStart(3, "0")}`;
}

/** Siguiente correlativo de factura: F001-12391 */
export function siguienteFactura(state: AppState): string {
  const maximo = Object.values(state.pedidos).reduce((max, p) => {
    const n = parseInt(p.factura?.split("-")[1] ?? "0", 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 12390);
  return `F001-${maximo + 1}`;
}

// ===== Listados =====

export function resumenes(state: AppState): PedidoResumen[] {
  return Object.values(state.pedidos)
    .map((p) => ({
      nro: p.nro,
      cliente: p.cliente,
      fecha: p.fecha,
      estado: p.estado,
      items: p.items.reduce((a, i) => a + i.cantidad, 0),
      total: p.total,
      saldo: p.tieneSaldo,
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

// ===== Stock =====

/**
 * Unidades comprometidas por pedidos vivos, por SKU. Un borrador no reserva
 * nada; un pedido anulado deja de reservar por el solo hecho de estar anulado.
 */
export function reservasPorSku(state: AppState): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const p of Object.values(state.pedidos)) {
    if (!ESTADOS_QUE_RESERVAN.includes(p.estado)) continue;
    for (const item of p.items) {
      mapa.set(item.sku, (mapa.get(item.sku) ?? 0) + item.cantidad);
    }
  }
  return mapa;
}

/**
 * Disponible real de un SKU. `sku.reservado` de los datos base se interpreta
 * como reservas de otros vendedores, y se le suma lo de este sistema.
 */
export function disponibleDe(
  skuCodigo: string,
  reservas: Map<string, number>
): number {
  const sku = SKUS.find((s) => s.codigo === skuCodigo);
  if (!sku) return 0;
  return Math.max(0, sku.stock - sku.reservado - (reservas.get(skuCodigo) ?? 0));
}

/** Unidades que un pedido no alcanza a cubrir con el stock disponible. */
export function saldoAlConfirmar(
  pedido: PedidoDetalle,
  reservas: Map<string, number>
): number {
  return pedido.items.reduce((saldo, item) => {
    const faltan = item.cantidad - disponibleDe(item.sku, reservas);
    return saldo + Math.max(0, faltan);
  }, 0);
}

// ===== KPIs del dashboard =====

export type Kpis = {
  pedidosHoy: number;
  porConfirmar: number;
  skusCriticos: number;
  montoPorFacturar: number;
  reservados: number;
};

export function kpis(state: AppState, reservas: Map<string, number>): Kpis {
  const hoy = ahoraTexto().slice(0, 10);
  const pedidos = Object.values(state.pedidos);

  const confirmados = pedidos.filter((p) => p.estado === "confirmado");

  return {
    pedidosHoy: pedidos.filter((p) => p.fecha.startsWith(hoy) && p.estado !== "anulado")
      .length,
    porConfirmar: pedidos.filter((p) => p.estado === "borrador").length,
    // "Crítico" = queda menos de una docena disponible de un SKU activo.
    skusCriticos: SKUS.filter((s) => disponibleDe(s.codigo, reservas) < 12).length,
    montoPorFacturar: confirmados.reduce((a, p) => a + p.total, 0),
    reservados: confirmados.length,
  };
}
