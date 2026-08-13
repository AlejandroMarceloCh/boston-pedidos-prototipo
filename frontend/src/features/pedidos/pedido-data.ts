// Datos semilla de los pedidos. En tiempo de ejecución la fuente de verdad es
// el store (src/store/app-store.tsx); esto solo alimenta la primera carga y el
// botón de reiniciar la demo.
export type PedidoItem = {
  sku: string;
  descripcion: string;
  /** Unidades solicitadas por el cliente. */
  cantidad: number;
  precio: number;
  /**
   * RNF-05: unidades que se pudieron atender con el stock del momento. El
   * importe de la línea sale de acá, no de `cantidad`; si no, los renglones
   * del detalle no suman el subtotal guardado, que es de lo atendible (RF-32).
   * Ausente en los pedidos semilla: se asume que todo se atendió.
   */
  atendible?: number;
  // Se completan al hidratar desde SKUS cuando el ítem semilla no los trae.
  articulo?: string;
  talla?: string;
  color?: string;
};

export type PedidoEvento = {
  fecha: string;
  tipo: "creado" | "confirmado" | "facturado" | "entregado" | "anulado" | "observacion";
  detalle: string;
};

/**
 * RF-20: un requerimiento se parte en dos documentos de naturaleza distinta.
 *
 *   *"una cosa es la compra y otra cosa es la solicitud de compra"*
 *   *"el pedido está en base al stock y la solicitud sobre lo que deseo"*
 *
 * El **pedido** es compra en firme: solo contiene lo que hay stock, y lo
 * reserva. La **solicitud** es lo que el cliente quiere y no se puede atender
 * hoy; no reserva nada y se aprueba o se rechaza (RF-21).
 */
export type TipoDocumento = "pedido" | "solicitud";

/** RF-21: *"o lo atiendo o no lo atiendo"*. */
export type EstadoSolicitud = "pendiente" | "aprobada" | "rechazada" | "atendida";

export const ESTADO_SOLICITUD_LABEL: Record<EstadoSolicitud, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  atendida: "Atendida",
};

export type EstadoPedido =
  | "borrador"
  | "confirmado"
  | "facturado"
  | "entregado"
  | "anulado";

/**
 * RF-45: por qué quedó saldo. No es lo mismo no tener el insumo que haberse
 * comprometido y no llegar: solo el segundo caso es responsabilidad de Boston,
 * y es el que habilita RF-38 (respetar el descuento original del saldo).
 *
 * Al confirmar, un saldo siempre nace como `insumo`: en ese instante lo único
 * que se sabe es que no alcanzaba el stock. Pasa a `boston` cuando vence la
 * fecha comprometida (RF-17) sin haber entregado, o cuando alguien lo
 * reclasifica a mano desde el detalle.
 */
export type CausaSaldo = "insumo" | "boston";

/**
 * RF-62 + RF-63: qué dijo el cliente sobre su pedido.
 *
 *   *"al momento que cierren la toma del pedido, automáticamente uno se refleje
 *   acá y otro se dispara al cliente para que te lo confirme"*
 *
 * Hoy el envío es manual (se abre WhatsApp) y la respuesta se registra a mano.
 * El disparo automático y el canal donde el cliente confirma solo necesitan
 * backend: ver RF-62 en REQUISITOS.md.
 */
export type ConfirmacionCliente = "sin_enviar" | "enviado" | "aceptado" | "con_reparos";

export const CONFIRMACION_LABEL: Record<ConfirmacionCliente, string> = {
  sin_enviar: "Sin enviar",
  enviado: "Enviado, esperando respuesta",
  aceptado: "Aceptado por el cliente",
  con_reparos: "El cliente pidió correcciones",
};

export const CAUSA_SALDO_LABEL: Record<CausaSaldo, string> = {
  insumo: "Falta de insumo",
  boston: "Responsabilidad de Boston",
};

/**
 * RF-41 + RF-42: un pedido puede facturarse partido entre varios RUC y
 * entregarse en varios destinos.
 *
 *   *"de esas 100,000, 45,000 me las facturas a mí. De estas 25,000 me las
 *   facturas a ella. Y además quiero que esa me la entregues en ese sitio, y en
 *   ese otro sitio."*
 *
 * Cada partida se lleva un subconjunto de las líneas del pedido, con su RUC de
 * facturación y su dirección de entrega. Un pedido normal tiene una sola
 * partida, así que el flujo habitual no cambia.
 */
export type Partida = {
  id: string;
  /** RUC al que se factura. Por defecto, el del cliente del pedido. */
  ruc: string;
  /** A nombre de quién se emite. */
  razonSocial: string;
  /** Dirección de entrega, de las que tiene cargadas el cliente. */
  direccionId: string;
  /** SKU de las líneas del pedido que van en esta partida. */
  skus: string[];
  /** Factura emitida para esta partida, si ya se facturó. */
  factura?: string;
};

/**
 * Partidas efectivas de un pedido. Sin partidas explícitas se devuelve una
 * sola, con el cliente y la dirección del pedido: así el resto del código no
 * necesita distinguir entre un pedido partido y uno normal.
 */
export function partidasDe(p: PedidoDetalle, rucCliente = ""): Partida[] {
  if (p.partidas?.length) return p.partidas;
  return [
    {
      id: "1",
      ruc: rucCliente,
      razonSocial: p.cliente,
      direccionId: p.direccionId ?? "1",
      skus: p.items.map((i) => i.sku),
      factura: p.factura,
    },
  ];
}

/** Importe de una partida: la suma de lo atendible de sus líneas. */
export function importeDePartida(p: PedidoDetalle, partida: Partida): number {
  return p.items
    .filter((i) => partida.skus.includes(i.sku))
    .reduce((a, i) => a + (i.atendible ?? i.cantidad) * i.precio, 0);
}

/** Un documento es solicitud solo si lo dice; todo lo anterior era pedido. */
export function esSolicitud(p: PedidoDetalle): boolean {
  return p.tipo === "solicitud";
}

/** Estados que ocupan stock. Un borrador o un anulado no reservan nada. */
export const ESTADOS_QUE_RESERVAN: EstadoPedido[] = [
  "confirmado",
  "facturado",
  "entregado",
];

export type PedidoDetalle = {
  nro: string;
  /**
   * RF-20. Ausente en los datos semilla y en todo lo guardado antes del split:
   * se interpreta como "pedido", que es lo que eran.
   */
  tipo?: TipoDocumento;
  /** Solo en las solicitudes. */
  estadoSolicitud?: EstadoSolicitud;
  /** Número del documento hermano nacido de la misma confirmación. */
  documentoHermano?: string;
  cliente: string;
  /** null en un borrador armado desde el catálogo, antes de elegir cliente. */
  clienteId: string | null;
  fecha: string;
  estado: EstadoPedido;
  items: PedidoItem[];
  condicion: string;
  moneda: string;
  descuentoTotal: number;
  subtotal: number;
  igv: number;
  total: number;
  tieneSaldo: boolean;
  saldoUnidades?: number;
  /** RF-45: causa del saldo. Solo tiene sentido si `tieneSaldo`. */
  causaSaldo?: CausaSaldo;
  /** RF-62/63. Ausente = todavía no se envió nada al cliente. */
  confirmacionCliente?: ConfirmacionCliente;
  /**
   * RF-17: fecha de entrega comprometida (ISO `YYYY-MM-DD`). Sin ella no se
   * puede saber si un saldo es responsabilidad de Boston: es la referencia
   * contra la que se mide el incumplimiento (habilita RF-45).
   * Opcional en un borrador; obligatoria para confirmar.
   */
  fechaEntrega?: string;
  eventos: PedidoEvento[];
  // Lo que el asistente necesita para poder retomar un borrador tal como quedó.
  direccionId?: string;
  /**
   * RF-41/RF-42. Ausente = una sola partida implícita (ver `partidasDe`), que
   * es el caso de todo lo guardado antes y del pedido corriente.
   */
  partidas?: Partida[];
  nota?: string;
  aplicarInicial?: boolean;
  slot3?: number;
  factura?: string;
};

/**
 * RF-45 + RF-17: el saldo venció si se comprometió una fecha, ya pasó, y el
 * pedido sigue sin entregarse. Es la señal de que la causa probablemente ya no
 * es "falta de insumo" sino incumplimiento, pero no lo reclasifica solo:
 * quién asume la culpa es una decisión de negocio, no un cálculo.
 */
export function saldoVencido(p: PedidoDetalle, hoyISO?: string): boolean {
  if (!p.tieneSaldo || !p.fechaEntrega) return false;
  if (p.estado === "entregado" || p.estado === "anulado") return false;
  const hoy = hoyISO ?? new Date().toISOString().slice(0, 10);
  return p.fechaEntrega < hoy;
}

export const PEDIDOS_DETALLE: Record<string, PedidoDetalle> = {
  "2026-0811-014": {
    nro: "2026-0811-014",
    cliente: "Distribuidora Andina del Sur",
    clienteId: "108671",
    fecha: "2026-08-11 09:42",
    estado: "confirmado",
    items: [
      { sku: "048LHSURP", descripcion: "Pantalón pijama tela plana BOSTON", cantidad: 48, precio: 30.0 },
      { sku: "049MNEGRP", descripcion: "Boxer tela plana BOSTON", cantidad: 60, precio: 24.95 },
      { sku: "157LAMARP", descripcion: "Trusa clásica malla SWEET COTTON", cantidad: 24, precio: 4.75 },
    ],
    condicion: "Letras a 30 días",
    moneda: "PEN",
    descuentoTotal: 1386.37,
    subtotal: 3051.0,
    igv: 299.63,
    total: 1964.26,
    tieneSaldo: false,
    eventos: [
      { fecha: "2026-08-11 09:42", tipo: "creado", detalle: "Cargado por Miguel Quispe" },
      { fecha: "2026-08-11 09:43", tipo: "confirmado", detalle: "Stock reservado · 48h" },
    ],
  },
  "2026-0811-013": {
    nro: "2026-0811-013",
    cliente: "Modas Princesa Junior",
    clienteId: "108673",
    fecha: "2026-08-11 08:15",
    estado: "confirmado",
    items: [
      { sku: "203LNEGRP", descripcion: "Bikini damas encaje SWEET COTTON", cantidad: 36, precio: 18.9 },
      { sku: "689MNEGRP", descripcion: "Panty colaless microfibra", cantidad: 48, precio: 6.5 },
    ],
    condicion: "Letras a 30 días",
    moneda: "PEN",
    descuentoTotal: 450.95,
    subtotal: 992.4,
    igv: 97.46,
    total: 638.91,
    tieneSaldo: false,
    eventos: [
      { fecha: "2026-08-11 08:15", tipo: "creado", detalle: "Cargado por Miguel Quispe" },
      { fecha: "2026-08-11 08:16", tipo: "confirmado", detalle: "Stock reservado · 48h" },
    ],
  },
  "2026-0810-008": {
    nro: "2026-0810-008",
    cliente: "Grupo Retail Cencosur",
    clienteId: "108675",
    fecha: "2026-08-10 11:20",
    estado: "facturado",
    items: [
      { sku: "048XHSURP", descripcion: "Pantalón pijama tela plana BOSTON", cantidad: 240, precio: 30.0 },
      { sku: "049XLNEGRP", descripcion: "Boxer tela plana BOSTON", cantidad: 240, precio: 24.95 },
    ],
    condicion: "Contado",
    moneda: "PEN",
    descuentoTotal: 5992.63,
    subtotal: 13188.0,
    igv: 1295.17,
    total: 8490.54,
    tieneSaldo: true,
    saldoUnidades: 24,
    eventos: [
      { fecha: "2026-08-10 11:20", tipo: "creado", detalle: "Cargado por Alfredo Salazar" },
      { fecha: "2026-08-10 11:22", tipo: "confirmado", detalle: "Stock reservado" },
      { fecha: "2026-08-10 14:00", tipo: "facturado", detalle: "Factura F001-12384" },
      { fecha: "2026-08-11 09:00", tipo: "observacion", detalle: "Saldo de 24 und por falta de stock de 048XHSURP" },
    ],
  },
  "2026-0810-007": {
    nro: "2026-0810-007",
    cliente: "Confecciones Textiles Perú",
    clienteId: "108672",
    fecha: "2026-08-10 09:05",
    estado: "confirmado",
    items: [
      { sku: "478MNEGRP", descripcion: "Media deportiva pack x6 CLASSIC", cantidad: 36, precio: 35.0 },
    ],
    condicion: "Letras a 30 días",
    moneda: "PEN",
    descuentoTotal: 564.73,
    subtotal: 1260.0,
    igv: 125.15,
    total: 820.42,
    tieneSaldo: true,
    saldoUnidades: 12,
    eventos: [
      { fecha: "2026-08-10 09:05", tipo: "creado", detalle: "Cargado por Miguel Quispe" },
      { fecha: "2026-08-10 09:06", tipo: "confirmado", detalle: "Stock reservado parcial" },
      { fecha: "2026-08-10 09:06", tipo: "observacion", detalle: "Saldo de 12 und pendiente de reposición" },
    ],
  },
  "2026-0811-012": {
    nro: "2026-0811-012",
    cliente: "Importaciones Marisol",
    clienteId: "108674",
    fecha: "2026-08-10 17:50",
    estado: "borrador",
    items: [
      { sku: "157SAMARP", descripcion: "Trusa clásica malla SWEET COTTON", cantidad: 24, precio: 4.75 },
    ],
    condicion: "Contado",
    moneda: "PEN",
    descuentoTotal: 51.09,
    subtotal: 114.0,
    igv: 11.32,
    total: 74.23,
    tieneSaldo: false,
    eventos: [
      { fecha: "2026-08-10 17:50", tipo: "creado", detalle: "Cargado por Miguel Quispe · en borrador" },
    ],
  },
  "2026-0809-003": {
    nro: "2026-0809-003",
    cliente: "Boutique Luciernaga",
    clienteId: "108676",
    fecha: "2026-08-09 16:30",
    estado: "entregado",
    items: [
      { sku: "689SNEGRP", descripcion: "Panty colaless microfibra", cantidad: 12, precio: 6.5 },
    ],
    condicion: "Contra entrega",
    moneda: "PEN",
    descuentoTotal: 34.96,
    subtotal: 78.0,
    igv: 7.75,
    total: 50.79,
    tieneSaldo: false,
    eventos: [
      { fecha: "2026-08-09 16:30", tipo: "creado", detalle: "Cargado por Miguel Quispe" },
      { fecha: "2026-08-09 16:31", tipo: "confirmado", detalle: "Pago contra entrega" },
      { fecha: "2026-08-09 18:00", tipo: "facturado", detalle: "Factura F001-12390" },
      { fecha: "2026-08-10 11:00", tipo: "entregado", detalle: "Recibido por el cliente" },
    ],
  },
  "2026-0808-001": {
    nro: "2026-0808-001",
    cliente: "Comercializadora Taki",
    clienteId: "108677",
    fecha: "2026-08-08 10:12",
    estado: "anulado",
    items: [
      { sku: "203MNEGRP", descripcion: "Bikini damas encaje SWEET COTTON", cantidad: 48, precio: 18.9 },
    ],
    condicion: "Letras a 30 días",
    moneda: "PEN",
    descuentoTotal: 406.61,
    subtotal: 907.2,
    igv: 90.11,
    total: 590.7,
    tieneSaldo: false,
    eventos: [
      { fecha: "2026-08-08 10:12", tipo: "creado", detalle: "Cargado por Alfredo Salazar" },
      { fecha: "2026-08-08 10:13", tipo: "confirmado", detalle: "Stock reservado" },
      { fecha: "2026-08-09 12:00", tipo: "anulado", detalle: "Cancelado por el cliente · stock liberado" },
    ],
  },
};

// Resumen para listados (Mis pedidos, Dashboard). Se deriva del detalle en
// src/store/selectors.ts para que no existan dos fuentes de verdad: el total de
// la tabla y el del detalle son siempre el mismo número.
export type PedidoResumen = {
  nro: string;
  cliente: string;
  fecha: string;
  estado: EstadoPedido;
  items: number;
  total: number;
  saldo: boolean;
  tipo: TipoDocumento;
  estadoSolicitud?: EstadoSolicitud;
};
