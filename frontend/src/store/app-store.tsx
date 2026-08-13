// Fuente de verdad del prototipo. No hay backend: el estado vive en memoria y
// se refleja en localStorage, así que lo que se crea sobrevive a un F5.
//
// Solo se persisten los PEDIDOS. El stock reservado NO se guarda: se deriva de
// los pedidos vivos (ver selectors.ts). Así es imposible que se descuadre —
// anular un pedido devuelve el stock por definición, no por una resta a mano.
import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import {
  CAUSA_SALDO_LABEL,
  type CausaSaldo,
  type PedidoDetalle,
  type PedidoEvento,
  type PedidoItem,
} from "@/features/pedidos/pedido-data";
import { CURRENT_USER, SKUS, type Cliente } from "@/lib/mock-data";
import { calcularTotales, r2 } from "@/lib/pedido-calc";
import { semilla, type AppState } from "./semilla";
import { siguienteNro, siguienteFactura, ahoraTexto, reservasPorSku, disponibleDe } from "./selectors";

const STORAGE_KEY = "boston.pedidos.v1";

// ===== Acciones =====

export type Linea = {
  sku: string;
  descripcion: string;
  articulo: string;
  talla: string;
  color: string;
  cantidad: number;
  precio: number;
};

export type BorradorInput = {
  /** null = pedido nuevo. */
  nro: string | null;
  cliente: Cliente | null;
  direccionId: string;
  lineas: Linea[];
  aplicarInicial: boolean;
  slot3: number;
  nota: string;
  /** RF-17: fecha de entrega comprometida (ISO `YYYY-MM-DD`). "" si aún no se fijó. */
  fechaEntrega: string;
};

export type Action =
  | { type: "pedido/upsert"; pedido: PedidoDetalle }
  | { type: "pedido/confirmar"; nro: string; fecha: string; saldoUnidades: number }
  | { type: "pedido/facturar"; nro: string; fecha: string; factura: string }
  | { type: "pedido/entregar"; nro: string; fecha: string }
  | { type: "pedido/anular"; nro: string; fecha: string; motivo?: string }
  | { type: "pedido/causaSaldo"; nro: string; fecha: string; causa: CausaSaldo }
  | { type: "borrador/activo"; nro: string | null }
  | { type: "demo/reset"; ahora: Date };

/** Cada transición cambia el estado Y deja su rastro en el historial. Nunca una sin la otra. */
function conEvento(p: PedidoDetalle, evento: PedidoEvento): PedidoDetalle {
  return { ...p, eventos: [...p.eventos, evento] };
}

/** Exportado para poder verificar las transiciones en los tests. */
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "pedido/upsert":
      return {
        ...state,
        pedidos: { ...state.pedidos, [action.pedido.nro]: action.pedido },
      };

    case "pedido/confirmar": {
      const p = state.pedidos[action.nro];
      if (!p) return state;
      const conSaldo = action.saldoUnidades > 0;
      let actualizado = conEvento(
        { ...p, estado: "confirmado", tieneSaldo: conSaldo, fecha: action.fecha },
        {
          fecha: action.fecha,
          tipo: "confirmado",
          detalle: "Stock reservado · 48h",
        }
      );
      if (conSaldo) {
        // RF-45: al confirmar, el saldo siempre nace como "falta de insumo".
        // En este instante lo único conocido es que no alcanzaba el stock;
        // que sea responsabilidad de Boston solo se sabe al vencer la fecha.
        actualizado = conEvento(
          { ...actualizado, saldoUnidades: action.saldoUnidades, causaSaldo: "insumo" },
          {
            fecha: action.fecha,
            tipo: "observacion",
            detalle: `Saldo de ${action.saldoUnidades} und por falta de stock`,
          }
        );
      }
      return { ...state, pedidos: { ...state.pedidos, [action.nro]: actualizado } };
    }

    case "pedido/facturar": {
      const p = state.pedidos[action.nro];
      if (!p) return state;
      return {
        ...state,
        pedidos: {
          ...state.pedidos,
          [action.nro]: conEvento(
            { ...p, estado: "facturado", factura: action.factura },
            { fecha: action.fecha, tipo: "facturado", detalle: `Factura ${action.factura}` }
          ),
        },
      };
    }

    case "pedido/entregar": {
      const p = state.pedidos[action.nro];
      if (!p) return state;
      return {
        ...state,
        pedidos: {
          ...state.pedidos,
          [action.nro]: conEvento(
            { ...p, estado: "entregado" },
            { fecha: action.fecha, tipo: "entregado", detalle: "Recibido por el cliente" }
          ),
        },
      };
    }

    case "pedido/anular": {
      const p = state.pedidos[action.nro];
      if (!p) return state;
      const liberadas = p.items.reduce((a, i) => a + i.cantidad, 0);
      return {
        ...state,
        pedidos: {
          ...state.pedidos,
          [action.nro]: conEvento(
            { ...p, estado: "anulado" },
            {
              fecha: action.fecha,
              tipo: "anulado",
              detalle: action.motivo
                ? `${action.motivo} · ${liberadas} und liberadas`
                : `Anulado · ${liberadas} und liberadas`,
            }
          ),
        },
      };
    }

    case "pedido/causaSaldo": {
      const p = state.pedidos[action.nro];
      // Reclasificar la causa de un pedido sin saldo no significa nada.
      if (!p || !p.tieneSaldo || p.causaSaldo === action.causa) return state;
      return {
        ...state,
        pedidos: {
          ...state.pedidos,
          [action.nro]: conEvento(
            { ...p, causaSaldo: action.causa },
            {
              fecha: action.fecha,
              tipo: "observacion",
              detalle: `Causa del saldo: ${CAUSA_SALDO_LABEL[action.causa]}`,
            }
          ),
        },
      };
    }

    case "borrador/activo":
      return { ...state, borradorActivo: action.nro };

    case "demo/reset":
      return semilla(action.ahora);

    default:
      return state;
  }
}

// ===== Persistencia =====

function cargar(): AppState {
  try {
    const crudo = localStorage.getItem(STORAGE_KEY);
    if (!crudo) return semilla();
    const guardado = JSON.parse(crudo) as AppState;
    // Si cambió la forma del estado, se re-siembra en vez de migrar: es un prototipo.
    if (guardado?.version !== 1 || !guardado.pedidos) return semilla();
    return guardado;
  } catch {
    return semilla();
  }
}

// ===== Contexto =====

type StoreValue = {
  state: AppState;
  /** Crea o actualiza un borrador. Devuelve el número del pedido. */
  guardarBorrador: (input: BorradorInput) => string;
  confirmarPedido: (nro: string, saldoUnidades?: number) => void;
  facturarPedido: (nro: string) => void;
  entregarPedido: (nro: string) => void;
  anularPedido: (nro: string, motivo?: string) => void;
  /** RF-45: reclasificar de quién es la culpa del saldo. */
  setCausaSaldo: (nro: string, causa: CausaSaldo) => void;
  duplicarPedido: (nro: string) => string;
  setBorradorActivo: (nro: string | null) => void;
  resetDemo: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

/** Completa articulo/talla/color de un ítem a partir del catálogo. */
function itemDesdeLinea(l: Linea): PedidoItem {
  return {
    sku: l.sku,
    descripcion: l.descripcion,
    cantidad: l.cantidad,
    precio: l.precio,
    articulo: l.articulo,
    talla: l.talla,
    color: l.color,
  };
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, cargar);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Cuota llena o modo privado: la sesión sigue funcionando en memoria.
    }
  }, [state]);

  const value = useMemo<StoreValue>(() => {
    const guardarBorrador = (input: BorradorInput): string => {
      const ahora = new Date();
      const fecha = ahoraTexto(ahora);
      const nro = input.nro ?? siguienteNro(state, ahora);
      const previo = input.nro ? state.pedidos[input.nro] : undefined;

      // RF-32: descuento sobre lo atendible. El store es source of truth del stock.
      const reservas = reservasPorSku(state);
      const lineasConStock = input.lineas.map((l) => ({
        cantidad: l.cantidad,
        precio: l.precio,
        stockDisponible: disponibleDe(l.sku, reservas),
      }));

      const t = calcularTotales(lineasConStock, {
        aplicarInicial: input.aplicarInicial,
        slot3: input.slot3,
      });

      const pedido: PedidoDetalle = {
        nro,
        cliente: input.cliente?.razonSocial ?? "Sin cliente",
        clienteId: input.cliente?.codigo ?? null,
        fecha: previo?.fecha ?? fecha,
        estado: previo?.estado ?? "borrador",
        // Cada ítem guarda lo solicitado y lo atendible: el detalle necesita
        // ambos para que los importes cuadren con el subtotal (RNF-05).
        items: input.lineas.map((l, i) => ({
          ...itemDesdeLinea(l),
          atendible: t.lineas[i]?.atendible ?? l.cantidad,
        })),
        condicion: previo?.condicion ?? "Letras a 30 días",
        moneda: "PEN",
        descuentoTotal: r2(t.totalDescuento),
        subtotal: r2(t.subtotal),
        igv: r2(t.igv),
        total: r2(t.total),
        tieneSaldo: t.totalSaldoUnidades > 0 || (previo?.tieneSaldo ?? false),
        saldoUnidades: t.totalSaldoUnidades > 0 ? t.totalSaldoUnidades : previo?.saldoUnidades,
        direccionId: input.direccionId,
        nota: input.nota,
        fechaEntrega: input.fechaEntrega || previo?.fechaEntrega,
        aplicarInicial: input.aplicarInicial,
        slot3: input.slot3,
        factura: previo?.factura,
        eventos: previo?.eventos ?? [
          {
            fecha,
            tipo: "creado",
            detalle: `Cargado por ${CURRENT_USER.nombre} · en borrador`,
          },
        ],
      };

      dispatch({ type: "pedido/upsert", pedido });
      return nro;
    };

    return {
      state,
      guardarBorrador,
      confirmarPedido: (nro, saldoUnidades = 0) =>
        dispatch({ type: "pedido/confirmar", nro, fecha: ahoraTexto(), saldoUnidades }),
      facturarPedido: (nro) =>
        dispatch({
          type: "pedido/facturar",
          nro,
          fecha: ahoraTexto(),
          factura: siguienteFactura(state),
        }),
      entregarPedido: (nro) =>
        dispatch({ type: "pedido/entregar", nro, fecha: ahoraTexto() }),
      anularPedido: (nro, motivo) =>
        dispatch({ type: "pedido/anular", nro, fecha: ahoraTexto(), motivo }),
      setCausaSaldo: (nro, causa) =>
        dispatch({ type: "pedido/causaSaldo", nro, fecha: ahoraTexto(), causa }),
      duplicarPedido: (nro) => {
        const origen = state.pedidos[nro];
        if (!origen) return nro;
        const lineas: Linea[] = origen.items.map((i) => {
          const sku = SKUS.find((s) => s.codigo === i.sku);
          return {
            sku: i.sku,
            descripcion: i.descripcion,
            articulo: i.articulo ?? sku?.articulo ?? "",
            talla: i.talla ?? sku?.talla ?? "",
            color: i.color ?? sku?.color ?? "",
            cantidad: i.cantidad,
            precio: i.precio,
          };
        });
        return guardarBorrador({
          nro: null,
          cliente: origen.clienteId
            ? ({ codigo: origen.clienteId, razonSocial: origen.cliente } as Cliente)
            : null,
          direccionId: origen.direccionId ?? "1",
          lineas,
          aplicarInicial: origen.aplicarInicial ?? true,
          slot3: origen.slot3 ?? 0,
          nota: "",
          // Un duplicado es un compromiso nuevo: la fecha de entrega no se hereda.
          fechaEntrega: "",
        });
      },
      setBorradorActivo: (nro) => dispatch({ type: "borrador/activo", nro }),
      resetDemo: () => dispatch({ type: "demo/reset", ahora: new Date() }),
    };
  }, [state]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de AppStoreProvider");
  return ctx;
}
