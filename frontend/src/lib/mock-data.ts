// Datos mock basados en audit real del PCP (2026-08-11).
// SKUs: estructura articulo + talla + color + 'P', ej: 048LHSURP
// Precios referenciales de tbllistaprecio (aunque está congelada desde 2017,
// el sistema nuevo usa último facturado editable por línea).

export type Color = {
  code: string;
  name: string;
  hex: string;
};

export const COLORS: Record<string, Color> = {
  HSUR: { code: "HSUR", name: "Hueco sur", hex: "#1e293b" },
  BLAN: { code: "BLAN", name: "Blanco", hex: "#fafafa" },
  NEGR: { code: "NEGR", name: "Negro", hex: "#0a0a0a" },
  AMAR: { code: "AMAR", name: "Amarillo", hex: "#facc15" },
  CELE: { code: "CELE", name: "Celeste", hex: "#7dd3fc" },
  ACER: { code: "ACER", name: "Azul acero", hex: "#475569" },
  ALAM: { code: "ALAM", name: "Azul marino AL", hex: "#1e3a8a" },
  ROJO: { code: "ROJO", name: "Rojo", hex: "#dc2626" },
  MARO: { code: "MARO", name: "Marrón", hex: "#7c2d12" },
  VERD: { code: "VERD", name: "Verde", hex: "#15803d" },
  GRAF: { code: "GRAF", name: "Grafíteo", hex: "#374151" },
  VINO: { code: "VINO", name: "Vino", hex: "#7f1d1d" },
};

export const TALLAS_ADULTO = ["S", "M", "L", "XL", "XXL"] as const;
export const TALLAS_NINO = ["2", "4", "6", "8", "10", "12", "14", "16"] as const;

export type Articulo = {
  codigo: string;
  descripcion: string;
  genero: "CAB" | "DAM" | "NIN" | "UNI";
  linea: "BOSTON" | "SWEET COTTON" | "CLASSIC";
  subfamilia: "01" | "02";
  precioRef: number;
  tallas: readonly string[];
  colores: string[];
  activo: boolean;
};

export const ARTICULOS: Articulo[] = [
  {
    codigo: "048",
    descripcion: "Pantalón pijama tela plana",
    genero: "CAB",
    linea: "BOSTON",
    subfamilia: "01",
    precioRef: 30.0,
    tallas: TALLAS_ADULTO,
    colores: ["HSUR", "NEGR", "ACER", "MARO"],
    activo: true,
  },
  {
    codigo: "049",
    descripcion: "Boxer tela plana",
    genero: "CAB",
    linea: "BOSTON",
    subfamilia: "01",
    precioRef: 24.95,
    tallas: TALLAS_ADULTO,
    colores: ["HSUR", "BLAN", "NEGR", "ALAM", "GRAF"],
    activo: true,
  },
  {
    codigo: "157",
    descripcion: "Trusa clásica malla",
    genero: "CAB",
    linea: "SWEET COTTON",
    subfamilia: "01",
    precioRef: 4.75,
    tallas: TALLAS_ADULTO,
    colores: ["AMAR", "BLAN", "CELE", "ROJO", "VERD"],
    activo: true,
  },
  {
    codigo: "203",
    descripcion: "Bikini damas encaje",
    genero: "DAM",
    linea: "SWEET COTTON",
    subfamilia: "02",
    precioRef: 18.9,
    tallas: TALLAS_ADULTO,
    colores: ["NEGR", "ROJO", "VINO", "BLAN", "GRAF"],
    activo: true,
  },
  {
    codigo: "211",
    descripcion: "Bralette soft",
    genero: "DAM",
    linea: "SWEET COTTON",
    subfamilia: "02",
    precioRef: 22.5,
    tallas: TALLAS_ADULTO,
    colores: ["NEGR", "BLAN", "CELE", "ROJO"],
    activo: true,
  },
  {
    codigo: "332",
    descripcion: "Pijama infantil algodón",
    genero: "NIN",
    linea: "BOSTON",
    subfamilia: "02",
    precioRef: 28.0,
    tallas: TALLAS_NINO,
    colores: ["CELE", "ROJO", "AMAR", "VERD"],
    activo: true,
  },
  {
    codigo: "478",
    descripcion: "Media deportiva pack x6",
    genero: "UNI",
    linea: "CLASSIC",
    subfamilia: "01",
    precioRef: 35.0,
    tallas: ["M", "L", "XL"],
    colores: ["NEGR", "BLAN", "GRAF"],
    activo: true,
  },
  {
    codigo: "512",
    descripcion: "Boxer microfibra pack x3",
    genero: "CAB",
    linea: "CLASSIC",
    subfamilia: "01",
    precioRef: 42.0,
    tallas: TALLAS_ADULTO,
    colores: ["HSUR", "NEGR", "ALAM"],
    activo: true,
  },
  {
    codigo: "689",
    descripcion: "Panty colaless microfibra",
    genero: "DAM",
    linea: "SWEET COTTON",
    subfamilia: "02",
    precioRef: 6.5,
    tallas: TALLAS_ADULTO,
    colores: ["NEGR", "BLAN", "ROJO", "VINO", "CELE", "AMAR"],
    activo: true,
  },
];

// Genera los SKUs (articuloid + talla + color + 'P')
export type Sku = {
  codigo: string;
  articulo: string;
  talla: string;
  color: string;
  descripcion: string;
  precio: number;
  stock: number;
  reservado: number;
};

function skuFor(art: Articulo, talla: string, color: string): Sku {
  const codigo = `${art.codigo}${talla}${color}P`;
  // Stock simulado con variabilidad realista
  const seed = art.codigo.charCodeAt(0) + talla.charCodeAt(0) + color.charCodeAt(0);
  const stock = (seed * 37) % 240;
  const reservado = Math.floor(stock * 0.18);
  return {
    codigo,
    articulo: art.codigo,
    talla,
    color,
    descripcion: `${art.descripcion} "${art.linea}"`,
    precio: art.precioRef,
    stock,
    reservado,
  };
}

export const SKUS: Sku[] = ARTICULOS.filter((a) => a.activo).flatMap((art) =>
  art.tallas.flatMap((talla) => art.colores.map((color) => skuFor(art, talla, color)))
);

export function skusByArticulo(articuloCodigo: string): Sku[] {
  return SKUS.filter((s) => s.articulo === articuloCodigo);
}

// ===== Clientes =====
export type Cliente = {
  codigo: string;
  razonSocial: string;
  ruc: string;
  vendedor: string;
  distribuidor: boolean;
  activo: boolean;
  fechaRegistro: string;
  direccionesEntrega: { id: string; nombre: string; direccion: string }[];
  preferencial: boolean;
  notas?: string;
  telefono?: string;
  email?: string;
};

export const CLIENTES: Cliente[] = [
  {
    codigo: "108671",
    razonSocial: "Cliente Demo Norte SAC",
    telefono: "+51 900 000 001",
    email: "compras.norte@example.com",
    ruc: "20000000001",
    vendedor: "003",
    distribuidor: true,
    activo: true,
    preferencial: true,
    fechaRegistro: "2018-12-07",
    direccionesEntrega: [
      { id: "1", nombre: "Depósito central", direccion: "Dirección demo 001, Lima" },
      { id: "2", nombre: "Local secundario", direccion: "Dirección demo 002, Lima" },
    ],
    notas: "Buen pagador. Compra mensual promedio 480 docenas.",
  },
  {
    codigo: "108672",
    razonSocial: "Cliente Demo Centro EIRL",
    telefono: "+51 900 000 002",
    email: "compras.centro@example.com",
    ruc: "20000000002",
    vendedor: "003",
    distribuidor: false,
    activo: true,
    preferencial: false,
    fechaRegistro: "2020-03-15",
    direccionesEntrega: [
      { id: "1", nombre: "Local principal", direccion: "Dirección demo 003, Lima" },
    ],
  },
  {
    codigo: "108673",
    razonSocial: "Cliente Demo Costa SAC",
    telefono: "+51 900 000 003",
    email: "compras.costa@example.com",
    ruc: "20000000003",
    vendedor: "005",
    distribuidor: true,
    activo: true,
    preferencial: true,
    fechaRegistro: "2019-06-22",
    direccionesEntrega: [
      { id: "1", nombre: "Local 1", direccion: "Dirección demo 004, Lima" },
      { id: "2", nombre: "Local 2", direccion: "Dirección demo 005, Lima" },
      { id: "3", nombre: "Local 3", direccion: "Dirección demo 006, Lima" },
    ],
    notas: "Cliente norte. Pago puntual con letras a 30 días.",
  },
  {
    codigo: "108674",
    razonSocial: "Cliente Demo Sur SAC",
    telefono: "+51 900 000 004",
    email: "compras.sur@example.com",
    ruc: "20000000004",
    vendedor: "005",
    distribuidor: false,
    activo: true,
    preferencial: false,
    fechaRegistro: "2022-09-30",
    direccionesEntrega: [
      { id: "1", nombre: "Local centro", direccion: "Dirección demo 007, Lima" },
    ],
  },
  {
    codigo: "108675",
    razonSocial: "Cadena Demo Nacional SAC",
    telefono: "+51 900 000 005",
    email: "compras.cadena@example.com",
    ruc: "20000000005",
    vendedor: "007",
    distribuidor: true,
    activo: true,
    preferencial: true,
    fechaRegistro: "2017-02-11",
    direccionesEntrega: [
      { id: "1", nombre: "Centro de distribución 1", direccion: "Dirección demo 008, Lima" },
      { id: "2", nombre: "Centro de distribución 2", direccion: "Dirección demo 009, Lima" },
    ],
    notas: "Cadena. Volumen alto, requiere split de facturación siempre.",
  },
  {
    codigo: "108676",
    razonSocial: "Cliente Demo Boutique EIRL",
    telefono: "+51 900 000 006",
    email: "compras.boutique@example.com",
    ruc: "20000000006",
    vendedor: "003",
    distribuidor: false,
    activo: true,
    preferencial: false,
    fechaRegistro: "2023-11-04",
    direccionesEntrega: [{ id: "1", nombre: "Local", direccion: "Dirección demo 010, Lima" }],
  },
  {
    codigo: "108677",
    razonSocial: "Cliente Demo Mayorista SAC",
    telefono: "+51 900 000 007",
    email: "compras.mayorista@example.com",
    ruc: "20000000007",
    vendedor: "007",
    distribuidor: false,
    activo: true,
    preferencial: false,
    fechaRegistro: "2024-02-20",
    direccionesEntrega: [{ id: "1", nombre: "Local", direccion: "Dirección demo 011, Lima" }],
  },
  {
    codigo: "108678",
    razonSocial: "Cliente Demo Inactivo SAC",
    ruc: "20000000008",
    vendedor: "003",
    distribuidor: true,
    activo: false,
    preferencial: false,
    fechaRegistro: "2020-07-12",
    direccionesEntrega: [{ id: "1", nombre: "Local", direccion: "Dirección demo 012, Lima" }],
    notas: "Inactivo desde 2025-05. Pendiente nota de crédito.",
  },
];

// ===== Vendedores =====
export type Vendedor = {
  codigo: string;
  nombre: string;
  activo: boolean;
};

export const VENDEDORES: Vendedor[] = [
  { codigo: "003", nombre: "Vendedor Demo 01", activo: true },
  { codigo: "005", nombre: "Vendedor Demo 02", activo: true },
  { codigo: "007", nombre: "Vendedor Demo 03", activo: true },
  { codigo: "010", nombre: "Vendedor Demo 04", activo: true },
];

// ===== Usuario autenticado (mock) =====
export const CURRENT_USER = {
  nombre: "Vendedor",
  apellido: "Demo",
  usuario: "vendedor.boston",
  rol: "vendedor",
  iniciales: "VD",
  codigo: "003",
};

// ===== Reglas de descuento (sacadas del audit) =====
export type EscalaDescuento = {
  nivel: number;
  desde: number;
  hasta: number;
  porcentaje: number;
};

export const ESCALAS_DESCUENTO: EscalaDescuento[] = [
  { nivel: 1, desde: 0, hasta: 4, porcentaje: 11 },
  { nivel: 2, desde: 5, hasta: 49, porcentaje: 12 },
  { nivel: 3, desde: 50, hasta: 99, porcentaje: 13 },
  { nivel: 4, desde: 100, hasta: 199, porcentaje: 14 },
  { nivel: 5, desde: 200, hasta: 249, porcentaje: 15 },
  { nivel: 6, desde: 250, hasta: 999999, porcentaje: 18 },
];

export const DESCUENTO_INICIAL = 38; // %

// Techo del descuento acumulado (inicial + volumen + slot manual) sobre el subtotal.
// Sin esto, 38% + 18% de nivel 6 + 50% manual dejaba la base en ~0.8% del subtotal.
export const DESCUENTO_MAX = 60; // %

export function calcularNivelDescuento(docenasTotales: number): EscalaDescuento | null {
  return (
    ESCALAS_DESCUENTO.find((e) => docenasTotales >= e.desde && docenasTotales <= e.hasta) ?? null
  );
}
