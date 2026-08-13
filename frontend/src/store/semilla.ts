// Datos con los que arranca la demo la primera vez (y a los que vuelve el
// botón "Reiniciar datos demo").
//
// Las fechas de la semilla se reproyectan sobre la fecha actual conservando la
// distancia entre pedidos. Sin esto, el KPI "Pedidos hoy" mostraría 0 en
// cualquier demostración posterior al 11 de agosto y parecería roto.
import { PEDIDOS_DETALLE, type PedidoDetalle } from "@/features/pedidos/pedido-data";

export type AppState = {
  version: 1;
  pedidos: Record<string, PedidoDetalle>;
  /** Borrador que el catálogo alimenta cuando no se está dentro del asistente. */
  borradorActivo: string | null;
  /**
   * Usuario con sesión abierta. Sin backend no hay token: alcanza con saber si
   * alguien entró, para que las rutas internas no se abran escribiendo la URL.
   */
  sesion: string | null;
};

/** "2026-08-11 09:42" → Date */
function parseFecha(f: string): Date {
  const [dia, hora = "00:00"] = f.split(" ");
  const [y, m, d] = dia.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

const dosDigitos = (n: number) => String(n).padStart(2, "0");

function formatFecha(d: Date): string {
  return (
    `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}` +
    ` ${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`
  );
}

/** Segmento de fecha de un número de pedido: "2026-0811-014" → "2026-0811" */
function prefijoNro(d: Date): string {
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}${dosDigitos(d.getDate())}`;
}

const DIA_MS = 24 * 60 * 60 * 1000;

export function semilla(ahora: Date = new Date()): AppState {
  const originales = Object.values(PEDIDOS_DETALLE);

  // El pedido más reciente de la semilla pasa a ser "hoy"; el resto conserva
  // su distancia en días respecto de él.
  const masReciente = originales.reduce(
    (max, p) => Math.max(max, parseFecha(p.fecha).getTime()),
    0
  );

  const corrida = (fecha: string): Date => {
    const original = parseFecha(fecha);
    const diasAtras = Math.round((masReciente - original.getTime()) / DIA_MS);
    const nueva = new Date(ahora);
    nueva.setDate(nueva.getDate() - diasAtras);
    nueva.setHours(original.getHours(), original.getMinutes(), 0, 0);
    return nueva;
  };

  const pedidos: Record<string, PedidoDetalle> = {};
  for (const p of originales) {
    const fecha = corrida(p.fecha);
    // El correlativo (los últimos 3 dígitos) se conserva; solo se recalcula la fecha.
    const correlativo = p.nro.slice(-3);
    const nro = `${prefijoNro(fecha)}-${correlativo}`;

    pedidos[nro] = {
      ...p,
      nro,
      fecha: formatFecha(fecha),
      eventos: p.eventos.map((e) => ({ ...e, fecha: formatFecha(corrida(e.fecha)) })),
    };
  }

  return { version: 1, pedidos, borradorActivo: null, sesion: null };
}
