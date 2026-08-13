// Lecturas derivadas del estado. Funciones puras: reciben el estado y devuelven
// lo que cada vista necesita, sin guardar nada aparte.
import {
  ESTADOS_QUE_RESERVAN,
  esSolicitud,
  type PedidoDetalle,
  type PedidoResumen,
  type TipoDocumento,
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
    // Las solicitudes comparten el correlativo de su pedido con el sufijo -S
    // ("…-014-S"): si entraran acá, `slice(-3)` leería "4-S" y el conteo se
    // descuadraría. Se numeran a partir del pedido, no por su cuenta.
    .filter((nro) => !nro.endsWith(SUFIJO_SOLICITUD))
    .reduce((max, nro) => Math.max(max, parseInt(nro.slice(-3), 10) || 0), 0);
  return `${prefijo}-${String(maximo + 1).padStart(3, "0")}`;
}

/** Sufijo que distingue a una solicitud de su pedido hermano. */
export const SUFIJO_SOLICITUD = "-S";

/** Número de la solicitud hermana de un pedido: "2026-0813-001" → "…-001-S". */
export function nroSolicitudDe(nroPedido: string): string {
  return `${nroPedido}${SUFIJO_SOLICITUD}`;
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

/**
 * Resúmenes de TODOS los documentos. Cada consumidor decide si quiere pedidos,
 * solicitudes o ambos: mezclarlos sin filtro descuadraría los contadores.
 */
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
      tipo: (p.tipo ?? "pedido") as TipoDocumento,
      estadoSolicitud: p.estadoSolicitud,
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Solo compras en firme. Es lo que va a listados de pedidos y a los KPIs. */
export function resumenesPedidos(state: AppState): PedidoResumen[] {
  return resumenes(state).filter((p) => p.tipo === "pedido");
}

/** Solo demanda no atendida. */
export function resumenesSolicitudes(state: AppState): PedidoResumen[] {
  return resumenes(state).filter((p) => p.tipo === "solicitud");
}

// ===== Stock =====

/**
 * Unidades comprometidas por pedidos vivos, por SKU. Un borrador no reserva
 * nada; un pedido anulado deja de reservar por el solo hecho de estar anulado.
 */
export function reservasPorSku(state: AppState): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const p of Object.values(state.pedidos)) {
    // Una solicitud es demanda registrada, no compromiso: no toca el stock.
    // Si contara, el excedente se descontaría dos veces (RF-20).
    if (esSolicitud(p)) continue;
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
  /** RF-24: demanda registrada que espera respuesta. No es venta. */
  solicitudesPendientes: number;
};

export function kpis(state: AppState, reservas: Map<string, number>): Kpis {
  const hoy = ahoraTexto().slice(0, 10);
  const todos = Object.values(state.pedidos);
  // RF-24: la proyección de demanda no debe alimentarse de solicitudes, que
  // son deseo y no compra. *"si el pedido te inflan, te engañas tú solo."*
  const pedidos = todos.filter((p) => !esSolicitud(p));

  const confirmados = pedidos.filter((p) => p.estado === "confirmado");

  return {
    pedidosHoy: pedidos.filter((p) => p.fecha.startsWith(hoy) && p.estado !== "anulado")
      .length,
    porConfirmar: pedidos.filter((p) => p.estado === "borrador").length,
    // "Crítico" = queda menos de una docena disponible de un SKU activo.
    skusCriticos: SKUS.filter((s) => disponibleDe(s.codigo, reservas) < 12).length,
    montoPorFacturar: confirmados.reduce((a, p) => a + p.total, 0),
    reservados: confirmados.length,
    solicitudesPendientes: todos.filter(
      (p) => esSolicitud(p) && p.estadoSolicitud === "pendiente"
    ).length,
  };
}
