// Cálculo de totales de un pedido. Vive acá y no en la pantalla del asistente
// porque el store necesita el mismo número al guardar: si hubiera dos fórmulas,
// el total de la tabla y el del detalle podrían no coincidir.
//
// RF-32 (REQUISITOS.md): el descuento se calcula sobre lo ATENDIBLE (lo que hay
// en stock), no sobre lo solicitado. Lo que excede stock entra como SALDO y no
// participa del descuento ni del total a facturar. Esto evita inflar descuentos
// pidiendo cantidades que no se pueden cumplir.
import {
  calcularNivelDescuento,
  DESCUENTO_INICIAL,
  DESCUENTO_MAX,
  type EscalaDescuento,
} from "@/lib/mock-data";

export const IGV = 0.18;

/**
 * Céntimos exactos.
 *
 * El dinero se redondea en un solo lugar y siempre igual. Antes cada campo se
 * redondeaba por su cuenta al persistir, así que `subtotal − descuento + IGV`
 * podía no dar el total guardado: diferencias de un céntimo que en un documento
 * tributario no se pueden explicar.
 *
 * Un precio con más de dos decimales se recorta al entrar: si la pantalla
 * muestra 30.01 el sistema no puede estar calculando con 30.009.
 */
export function centimos(n: number): number {
  return Math.round(n * 100) / 100;
}

export type LineaCalculable = {
  cantidad: number;
  precio: number;
  /** Stock disponible para esta línea. Default: infinito (sin tope). */
  stockDisponible?: number;
};

export type OpcionesDescuento = {
  aplicarInicial: boolean;
  /** Descuento manual adicional, en % (el "slot 3"). */
  slot3: number;
  /**
   * RF-35 · Condición de venta (E/C/L/O/D). Obsequio y donación **no cobran**:
   * el pedido conserva sus unidades y su valorización, pero no genera importe
   * a facturar ni IGV. Sin esto, un obsequio salía con total e IGV como una
   * venta normal.
   */
  condicion?: string;
};

/** Condiciones que no generan cobro. Ver CONDICIONES_VENTA en pedido-data. */
const SIN_COBRO = ["O", "D"];

/**
 * Desglose de una línea. RNF-05: las pantallas deben pintar ESTOS importes y no
 * calcular los suyos, o los renglones dejan de sumar el subtotal que muestran
 * al lado — que es justo lo que pasaba cuando cada vista hacía su propia suma.
 */
export type LineaCalculada = {
  /** Unidades que se pueden entregar hoy. */
  atendible: number;
  /** Unidades solicitadas que no alcanza a cubrir el stock. */
  saldo: number;
  /** Importe de lo atendible: es lo que se factura. */
  importe: number;
  /** Importe del saldo, a precio de lista. */
  importeSaldo: number;
};

export type TotalesPedido = {
  /** Desglose por línea, en el mismo orden en que se pasaron. */
  lineas: LineaCalculada[];
  /** Unidades que efectivamente se pueden entregar (min entre pedido y stock). */
  totalUnidades: number;
  /** Unidades solicitadas en total (para info, no se descuenta). */
  totalSolicitadoUnidades: number;
  /** Unidades que quedan como saldo por falta de stock. */
  totalSaldoUnidades: number;
  /** Monto del saldo a precio de lista (no se descuenta ni se factura acá). */
  totalSaldoMonto: number;
  totalDocenas: number;
  /** Subtotal sobre lo atendible. Base del cálculo de descuentos. */
  subtotal: number;
  nivel: EscalaDescuento | null;
  dInicial: number;
  dVolumen: number;
  dSlot3: number;
  totalDescuento: number;
  /** true si el acumulado superó DESCUENTO_MAX y hubo que recortarlo. */
  descuentoTopeado: boolean;
  base: number;
  igv: number;
  total: number;
};

export function calcularTotales(
  lineas: LineaCalculable[],
  { aplicarInicial, slot3, condicion }: OpcionesDescuento
): TotalesPedido {
  const cobra = !SIN_COBRO.includes(condicion ?? "");
  // Normalizar: por cada línea, atendible = min(solicitado, stock disponible).
  // Si stockDisponible no viene, se asume que todo es atendible (compat hacia atrás).
  const lineasNorm = lineas.map((l) => {
    const cap = l.stockDisponible ?? Number.POSITIVE_INFINITY;
    return {
      ...l,
      // El precio se normaliza a céntimos acá, una sola vez.
      precio: centimos(l.precio),
      atendible: Math.max(0, Math.min(l.cantidad, cap)),
      saldo: Math.max(0, l.cantidad - cap),
    };
  });

  const totalUnidades = lineasNorm.reduce((a, l) => a + l.atendible, 0);
  const totalSolicitadoUnidades = lineasNorm.reduce((a, l) => a + l.cantidad, 0);
  const totalSaldoUnidades = lineasNorm.reduce((a, l) => a + l.saldo, 0);
  const totalDocenas = Math.floor(totalUnidades / 12);
  // Se redondea el importe de CADA línea, y el subtotal es la suma de esos
  // importes ya redondeados: así los renglones visibles suman el total exacto.
  const importes = lineasNorm.map((l) => centimos(l.atendible * l.precio));
  const subtotal = centimos(importes.reduce((a, i) => a + i, 0));
  const totalSaldoMonto = centimos(
    lineasNorm.reduce((a, l) => a + centimos(l.saldo * l.precio), 0)
  );

  const nivel = calcularNivelDescuento(totalDocenas);
  const dInicial = centimos(aplicarInicial ? subtotal * (DESCUENTO_INICIAL / 100) : 0);
  const dVolumen = centimos(nivel ? (subtotal - dInicial) * (nivel.porcentaje / 100) : 0);
  // TODO (definir con Comercial): el slot manual se aplica sobre el subtotal BRUTO,
  // mientras que inicial y volumen van en cascada. Si la regla real es cascada,
  // cambiar a: (subtotal - dInicial - dVolumen) * (slot3 / 100).
  const dSlot3 = centimos(slot3 > 0 ? subtotal * (slot3 / 100) : 0);

  const descuentoBruto = centimos(dInicial + dVolumen + dSlot3);
  const totalDescuento = centimos(
    Math.min(descuentoBruto, subtotal * (DESCUENTO_MAX / 100))
  );
  const descuentoTopeado = descuentoBruto > totalDescuento + 0.005;

  // Un obsequio o una donación se entregan: mueven stock y se valorizan, pero
  // no se cobran. La base imponible y el IGV son cero.
  const base = centimos(cobra ? subtotal - totalDescuento : 0);
  const igv = centimos(base * IGV);

  return {
    lineas: lineasNorm.map((l, i) => ({
      atendible: l.atendible,
      saldo: l.saldo,
      importe: importes[i],
      importeSaldo: centimos(l.saldo * l.precio),
    })),
    totalUnidades,
    totalSolicitadoUnidades,
    totalSaldoUnidades,
    totalSaldoMonto,
    totalDocenas,
    subtotal,
    nivel,
    dInicial,
    dVolumen,
    dSlot3,
    totalDescuento,
    descuentoTopeado,
    base,
    igv,
    total: centimos(base + igv),
  };
}

/** @deprecated Usar `centimos`, que es la única política de redondeo. */
export const r2 = centimos;
