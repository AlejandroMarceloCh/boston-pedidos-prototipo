// Lecturas derivadas del estado. Funciones puras: reciben el estado y devuelven
// lo que cada vista necesita, sin guardar nada aparte.
import {
  ESTADOS_QUE_RESERVAN,
  esSolicitud,
  reservaVencida,
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

/**
 * Siguiente correlativo de un documento tributario.
 *
 * Mira **todas** las apariciones del campo: la del pedido y la de cada partida.
 * Antes `siguienteFactura` solo leía `pedido.factura` —la primera de cada
 * pedido—, así que la segunda factura de un pedido partido quedaba invisible y
 * el pedido siguiente reutilizaba ese número. Duplicar un correlativo
 * tributario no es un detalle: es un problema con SUNAT.
 */
function siguienteCorrelativo(
  state: AppState,
  serie: string,
  campo: "factura" | "guia" | "notaCredito",
  desde: number,
  ancho: number
): string {
  const maximo = Object.values(state.pedidos).reduce((max, p) => {
    const docs: (string | undefined)[] = [
      campo === "factura" ? p.factura : undefined,
      ...(p.partidas ?? []).map((par) => par[campo]),
    ];
    return docs.reduce((m, d) => {
      if (!d) return m;
      const [serieDoc, num] = String(d).split("-");
      // Solo compite consigo mismo: una guía no puede correr el correlativo de
      // las facturas ni al revés.
      if (serieDoc !== serie) return m;
      const n = parseInt(num ?? "0", 10);
      return Number.isNaN(n) ? m : Math.max(m, n);
    }, max);
  }, desde);
  return `${serie}-${String(maximo + 1).padStart(ancho, "0")}`;
}

/** Siguiente factura: F001-12391 */
export function siguienteFactura(state: AppState): string {
  return siguienteCorrelativo(state, "F001", "factura", 12390, 5);
}

/** RF-43 · Siguiente guía de remisión: T001-00841 */
export function siguienteGuia(state: AppState): string {
  return siguienteCorrelativo(state, "T001", "guia", 840, 5);
}

/** RF-44 · Siguiente nota de crédito: FC01-00120 */
export function siguienteNotaCredito(state: AppState): string {
  return siguienteCorrelativo(state, "FC01", "notaCredito", 119, 5);
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
export function reservasPorSku(
  state: AppState,
  ahora: Date = new Date()
): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const p of Object.values(state.pedidos)) {
    // RF-02: una reserva vencida deja de retener stock. Se libera sola: no hay
    // un proceso que la caduque, se deduce de la fecha de confirmación.
    if (reservaVencida(p, ahora)) continue;
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

// ===== RF-24 · Demanda no atendida =====

export type DemandaSku = {
  sku: string;
  descripcion: string;
  articulo: string;
  talla: string;
  color: string;
  /** Unidades pedidas que no se pudieron atender. */
  unidades: number;
  /** En cuántas solicitudes distintas aparece. */
  solicitudes: number;
  /** Clientes distintos que lo pidieron. */
  clientes: string[];
  /** Disponible hoy de ese SKU. */
  disponible: number;
  /** Valorizado a precio de lista. */
  monto: number;
};

/**
 * Lo que los clientes pidieron y no se pudo vender, agregado por SKU.
 *
 * Es la razón de ser del split (RF-20): antes esta demanda no se registraba en
 * ninguna parte —el sistema impedía pedirla— y por eso no llegaba a producción.
 *   *"queremos cambiar la lógica de la toma de pedidos (…) tiene que ver con
 *   temas de producción"*
 *
 * Solo cuenta solicitudes pendientes o aprobadas: una rechazada es demanda que
 * la empresa decidió no atender, y no debería empujar producción.
 */
export function demandaNoAtendida(state: AppState): DemandaSku[] {
  const reservas = reservasPorSku(state);
  const porSku = new Map<string, DemandaSku>();

  for (const p of Object.values(state.pedidos)) {
    if (!esSolicitud(p)) continue;
    if (p.estadoSolicitud === "rechazada") continue;

    for (const item of p.items) {
      const sku = SKUS.find((x) => x.codigo === item.sku);
      const previo = porSku.get(item.sku);
      if (previo) {
        previo.unidades += item.cantidad;
        previo.solicitudes += 1;
        previo.monto += item.cantidad * item.precio;
        if (!previo.clientes.includes(p.cliente)) previo.clientes.push(p.cliente);
      } else {
        porSku.set(item.sku, {
          sku: item.sku,
          descripcion: item.descripcion,
          articulo: item.articulo ?? sku?.articulo ?? "",
          talla: item.talla ?? sku?.talla ?? "",
          color: item.color ?? sku?.color ?? "",
          unidades: item.cantidad,
          solicitudes: 1,
          clientes: [p.cliente],
          disponible: disponibleDe(item.sku, reservas),
          monto: item.cantidad * item.precio,
        });
      }
    }
  }

  return [...porSku.values()].sort((a, b) => b.unidades - a.unidades);
}

/** La misma demanda agrupada por artículo, que es como se produce. */
export function demandaPorArticulo(state: AppState) {
  const porArt = new Map<string, { articulo: string; unidades: number; monto: number; skus: number }>();
  for (const d of demandaNoAtendida(state)) {
    const previo = porArt.get(d.articulo);
    if (previo) {
      previo.unidades += d.unidades;
      previo.monto += d.monto;
      previo.skus += 1;
    } else {
      porArt.set(d.articulo, {
        articulo: d.articulo,
        unidades: d.unidades,
        monto: d.monto,
        skus: 1,
      });
    }
  }
  return [...porArt.values()].sort((a, b) => b.unidades - a.unidades);
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
