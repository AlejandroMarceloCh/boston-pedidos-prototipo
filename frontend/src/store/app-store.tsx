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
  reservaVencida,
  type CausaSaldo,
  type ConfirmacionCliente,
  type Partida,
  type PedidoDetalle,
  type PedidoEvento,
  type PedidoItem,
} from "@/features/pedidos/pedido-data";
import { CURRENT_USER, SKUS, type Cliente } from "@/lib/mock-data";
import { calcularTotales, r2 } from "@/lib/pedido-calc";
import { semilla, type AppState } from "./semilla";
import {
  siguienteNro,
  siguienteFactura,
  ahoraTexto,
  reservasPorSku,
  disponibleDe,
  nroSolicitudDe,
  siguienteGuia,
  siguienteNotaCredito,
} from "./selectors";

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
  /** RF-35: código de condición de venta (E/C/L/O/D). */
  condicion?: string;
  /** RF-41/42. Vacío = una sola partida implícita. */
  partidas?: Partida[];
  /** RF-17: fecha de entrega comprometida (ISO `YYYY-MM-DD`). "" si aún no se fijó. */
  fechaEntrega: string;
};

export type Action =
  | { type: "pedido/upsert"; pedido: PedidoDetalle }
  /**
   * El reparto contra el stock lo hace el REDUCER, no quien despacha.
   *
   * El asistente guarda el borrador y lo confirma en el mismo tick: si el
   * reparto se calculara fuera, leería un estado que todavía no contiene el
   * pedido recién creado y la confirmación se perdería en silencio.
   */
  | { type: "pedido/confirmar"; nro: string; fecha: string }
  | {
      type: "pedido/confirmacionCliente";
      nro: string;
      fecha: string;
      valor: ConfirmacionCliente;
      detalle?: string;
    }
  | {
      type: "solicitud/resolver";
      nro: string;
      fecha: string;
      decision: "aprobada" | "rechazada";
      motivo?: string;
    }
  | { type: "pedido/facturar"; nro: string; fecha: string; facturas: string[] }
  | { type: "pedido/entregar"; nro: string; fecha: string; guias: string[] }
  | {
      type: "pedido/anular";
      nro: string;
      fecha: string;
      motivo?: string;
      /** RF-44: solo si estaba facturado. Una por partida facturada. */
      notasCredito?: string[];
    }
  | { type: "pedido/causaSaldo"; nro: string; fecha: string; causa: CausaSaldo }
  | { type: "borrador/activo"; nro: string | null }
  | { type: "sesion/entrar"; usuario: string }
  | { type: "sesion/salir" }
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

      // RF-20: la confirmación parte el requerimiento en dos documentos. El
      // PEDIDO se queda con lo atendible y lo reserva; el excedente —lo que el
      // cliente quiere y hoy no hay— nace como SOLICITUD hermana, que no
      // reserva nada y espera respuesta.
      //
      // Las reservas se calculan sobre el estado de ESTE dispatch, excluyendo
      // el propio pedido: mientras es borrador no reserva, así que no hay nada
      // suyo que descontar, pero si se reconfirma tampoco debe competir consigo
      // mismo.
      const reservas = reservasPorSku({
        ...state,
        pedidos: Object.fromEntries(
          Object.entries(state.pedidos).filter(([nro]) => nro !== action.nro)
        ),
      });

      const itemsPedido: PedidoItem[] = [];
      const itemsSolicitud: PedidoItem[] = [];
      for (const item of p.items) {
        const disponible = disponibleDe(item.sku, reservas);
        const atendible = Math.max(0, Math.min(item.cantidad, disponible));
        const excedente = item.cantidad - atendible;
        if (atendible > 0) itemsPedido.push({ ...item, cantidad: atendible, atendible });
        if (excedente > 0)
          itemsSolicitud.push({ ...item, cantidad: excedente, atendible: 0 });
      }

      const t = calcularTotales(
        itemsPedido.map((i) => ({ cantidad: i.cantidad, precio: i.precio })),
        {
          aplicarInicial: p.aplicarInicial ?? true,
          slot3: p.slot3 ?? 0,
          condicion: p.condicion,
        }
      );
      const nroSolicitud = nroSolicitudDe(action.nro);

      const pedidoConfirmado = conEvento(
        {
          ...p,
          tipo: "pedido" as const,
          estado: "confirmado" as const,
          items: itemsPedido,
          fecha: action.fecha,
          // Con el split ya no se confirma nada por encima del stock, así que
          // un pedido recién confirmado nunca nace con saldo. El saldo queda
          // reservado para el incumplimiento de una entrega comprometida.
          tieneSaldo: false,
          subtotal: r2(t.subtotal),
          descuentoTotal: r2(t.totalDescuento),
          igv: r2(t.igv),
          total: r2(t.total),
          documentoHermano: itemsSolicitud.length > 0 ? nroSolicitud : undefined,
        },
        { fecha: action.fecha, tipo: "confirmado", detalle: "Stock reservado · 48h" }
      );

      const pedidos = { ...state.pedidos, [action.nro]: pedidoConfirmado };

      if (itemsSolicitud.length > 0) {
        const unidades = itemsSolicitud.reduce((a, i) => a + i.cantidad, 0);
        pedidos[nroSolicitud] = {
          ...p,
          nro: nroSolicitud,
          tipo: "solicitud",
          estadoSolicitud: "pendiente",
          documentoHermano: action.nro,
          estado: "borrador",
          items: itemsSolicitud,
          fecha: action.fecha,
          tieneSaldo: false,
          saldoUnidades: undefined,
          causaSaldo: undefined,
          factura: undefined,
          partidas: undefined,
          // Una solicitud no tiene importe comprometido: el precio se pacta
          // cuando se aprueba y se sabe cuándo se puede atender.
          subtotal: r2(itemsSolicitud.reduce((a, i) => a + i.cantidad * i.precio, 0)),
          descuentoTotal: 0,
          igv: 0,
          total: 0,
          eventos: [
            {
              fecha: action.fecha,
              tipo: "creado",
              detalle: `Solicitud de ${unidades} und sin stock · nace del pedido ${action.nro}`,
            },
          ],
        };
      }

      return { ...state, pedidos };
    }

    case "pedido/confirmacionCliente": {
      const p = state.pedidos[action.nro];
      if (!p) return state;
      return {
        ...state,
        pedidos: {
          ...state.pedidos,
          [action.nro]: conEvento(
            { ...p, confirmacionCliente: action.valor },
            {
              fecha: action.fecha,
              tipo: action.valor === "con_reparos" ? "observacion" : "confirmado",
              detalle:
                action.detalle ??
                {
                  sin_enviar: "Confirmación del cliente reiniciada",
                  enviado: "Pedido enviado al cliente para su confirmación",
                  aceptado: "El cliente aceptó el pedido",
                  con_reparos: "El cliente pidió correcciones",
                }[action.valor],
            }
          ),
        },
      };
    }

    case "solicitud/resolver": {
      const p = state.pedidos[action.nro];
      if (!p) return state;
      const aprobada = action.decision === "aprobada";
      return {
        ...state,
        pedidos: {
          ...state.pedidos,
          [action.nro]: conEvento(
            { ...p, estadoSolicitud: action.decision },
            {
              fecha: action.fecha,
              tipo: aprobada ? "confirmado" : "anulado",
              detalle: aprobada
                ? `Solicitud aprobada${action.motivo ? ` · ${action.motivo}` : ""}`
                : `Solicitud rechazada${action.motivo ? ` · ${action.motivo}` : ""}`,
            }
          ),
        },
      };
    }

    case "pedido/facturar": {
      const p = state.pedidos[action.nro];
      if (!p) return state;

      // RF-02: si la reserva venció, el stock volvió a estar disponible y pudo
      // haberse vendido a otro. Facturar sin revalidar sería comprometer
      // unidades que ya no están: se rechaza y hay que reconfirmar.
      if (reservaVencida(p)) return state;

      // RF-41: se emite una factura por partida. Con una sola partida —el caso
      // corriente— esto es exactamente lo de antes: una factura y el pedido
      // pasa a facturado.
      const partidasFacturadas = (p.partidas ?? []).map((par, i) => ({
        ...par,
        factura: par.factura ?? action.facturas[i],
      }));

      let actualizado: PedidoDetalle = {
        ...p,
        estado: "facturado",
        factura: action.facturas[0],
        partidas: partidasFacturadas.length ? partidasFacturadas : undefined,
      };

      // Un evento por factura: el historial tiene que poder explicar a quién se
      // le facturó qué, que es el punto de partir el pedido.
      action.facturas.forEach((nroFactura, i) => {
        const par = partidasFacturadas[i];
        actualizado = conEvento(actualizado, {
          fecha: action.fecha,
          tipo: "facturado",
          detalle: par
            ? `Factura ${nroFactura} · ${par.razonSocial} (RUC ${par.ruc})`
            : `Factura ${nroFactura}`,
        });
      });

      return { ...state, pedidos: { ...state.pedidos, [action.nro]: actualizado } };
    }

    case "pedido/entregar": {
      const p = state.pedidos[action.nro];
      if (!p) return state;

      // RF-43: la guía de remisión acompaña la mercadería, una por destino.
      const partidasConGuia = (p.partidas ?? []).map((par, i) => ({
        ...par,
        guia: par.guia ?? action.guias[i],
      }));

      let actualizado: PedidoDetalle = {
        ...p,
        estado: "entregado",
        partidas: partidasConGuia.length ? partidasConGuia : undefined,
      };
      action.guias.forEach((guia, i) => {
        const par = partidasConGuia[i];
        actualizado = conEvento(actualizado, {
          fecha: action.fecha,
          tipo: "entregado",
          detalle: par
            ? `Guía ${guia} · entregado en destino ${i + 1}`
            : `Guía ${guia} · recibido por el cliente`,
        });
      });
      return { ...state, pedidos: { ...state.pedidos, [action.nro]: actualizado } };
    }

    case "pedido/anular": {
      const p = state.pedidos[action.nro];
      if (!p) return state;
      const liberadas = p.items.reduce((a, i) => a + i.cantidad, 0);
      const notas = action.notasCredito ?? [];

      // RF-44: si ya se había facturado, anular no alcanza — hay que emitir
      // nota de crédito por cada factura emitida.
      const partidasConNota = (p.partidas ?? []).map((par, i) => ({
        ...par,
        notaCredito: par.factura ? par.notaCredito ?? notas[i] : par.notaCredito,
      }));

      let actualizado: PedidoDetalle = {
        ...p,
        estado: "anulado",
        partidas: partidasConNota.length ? partidasConNota : undefined,
      };
      actualizado = conEvento(actualizado, {
        fecha: action.fecha,
        tipo: "anulado",
        detalle: action.motivo
          ? `${action.motivo} · ${liberadas} und liberadas`
          : `Anulado · ${liberadas} und liberadas`,
      });
      notas.forEach((nc) => {
        actualizado = conEvento(actualizado, {
          fecha: action.fecha,
          tipo: "observacion",
          detalle: `Nota de crédito ${nc} emitida`,
        });
      });
      return { ...state, pedidos: { ...state.pedidos, [action.nro]: actualizado } };
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

    case "sesion/entrar":
      return { ...state, sesion: action.usuario };

    case "sesion/salir":
      return { ...state, sesion: null };

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
    // Estados guardados antes de que existiera la sesión: se asume cerrada.
    return { ...guardado, sesion: guardado.sesion ?? null };
  } catch {
    return semilla();
  }
}

// ===== Contexto =====

type StoreValue = {
  state: AppState;
  /** Crea o actualiza un borrador. Devuelve el número del pedido. */
  guardarBorrador: (input: BorradorInput) => string;
  /** Confirma y parte en pedido + solicitud (RF-20). */
  confirmarPedido: (nro: string) => void;
  marcarConfirmacionCliente: (
    nro: string,
    valor: ConfirmacionCliente,
    detalle?: string
  ) => void;
  resolverSolicitud: (
    nro: string,
    decision: "aprobada" | "rechazada",
    motivo?: string
  ) => void;
  facturarPedido: (nro: string) => void;
  entregarPedido: (nro: string) => void;
  anularPedido: (nro: string, motivo?: string) => void;
  /** RF-45: reclasificar de quién es la culpa del saldo. */
  setCausaSaldo: (nro: string, causa: CausaSaldo) => void;
  duplicarPedido: (nro: string) => string;
  setBorradorActivo: (nro: string | null) => void;
  entrar: (usuario: string) => void;
  salir: () => void;
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
        condicion: input.condicion ?? previo?.condicion,
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
        condicion: input.condicion ?? previo?.condicion ?? "L",
        moneda: "PEN",
        descuentoTotal: r2(t.totalDescuento),
        subtotal: r2(t.subtotal),
        igv: r2(t.igv),
        total: r2(t.total),
        tieneSaldo: t.totalSaldoUnidades > 0 || (previo?.tieneSaldo ?? false),
        saldoUnidades: t.totalSaldoUnidades > 0 ? t.totalSaldoUnidades : previo?.saldoUnidades,
        direccionId: input.direccionId,
        partidas: input.partidas?.length ? input.partidas : undefined,
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
      /** RF-20. El reparto lo hace el reducer (ver la acción). */
      confirmarPedido: (nro) =>
        dispatch({ type: "pedido/confirmar", nro, fecha: ahoraTexto() }),
      marcarConfirmacionCliente: (nro, valor, detalle) =>
        dispatch({
          type: "pedido/confirmacionCliente",
          nro,
          fecha: ahoraTexto(),
          valor,
          detalle,
        }),
      resolverSolicitud: (nro, decision, motivo) =>
        dispatch({ type: "solicitud/resolver", nro, fecha: ahoraTexto(), decision, motivo }),
      facturarPedido: (nro) => {
        // Un correlativo por partida, consecutivos entre sí.
        const p = state.pedidos[nro];
        const cuantas = Math.max(1, p?.partidas?.length ?? 1);
        const base = parseInt(siguienteFactura(state).split("-")[1], 10);
        const facturas = Array.from(
          { length: cuantas },
          (_, i) => `F001-${String(base + i).padStart(5, "0")}`
        );
        dispatch({ type: "pedido/facturar", nro, fecha: ahoraTexto(), facturas });
      },
      entregarPedido: (nro) => {
        const p = state.pedidos[nro];
        const cuantas = Math.max(1, p?.partidas?.length ?? 1);
        const base = parseInt(siguienteGuia(state).split("-")[1], 10);
        const guias = Array.from(
          { length: cuantas },
          (_, i) => `T001-${String(base + i).padStart(5, "0")}`
        );
        dispatch({ type: "pedido/entregar", nro, fecha: ahoraTexto(), guias });
      },
      anularPedido: (nro, motivo) => {
        const p = state.pedidos[nro];
        // Solo se emiten notas de crédito si había facturas que revertir.
        const facturadas = (p?.partidas ?? []).filter((par) => par.factura).length;
        const cantidad = p?.estado === "facturado" ? Math.max(1, facturadas) : 0;
        const base = parseInt(siguienteNotaCredito(state).split("-")[1], 10);
        const notasCredito = Array.from(
          { length: cantidad },
          (_, i) => `FC01-${String(base + i).padStart(5, "0")}`
        );
        dispatch({
          type: "pedido/anular",
          nro,
          fecha: ahoraTexto(),
          motivo,
          notasCredito,
        });
      },
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
      entrar: (usuario) => dispatch({ type: "sesion/entrar", usuario }),
      salir: () => dispatch({ type: "sesion/salir" }),
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
