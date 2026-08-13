// RF-24 · La demanda que no se pudo atender, que es lo que el split hace
// posible registrar y lo que la reunión conecta con producción.
import { describe, it, expect } from "vitest";
import { semilla } from "@/store/semilla";
import { reducer } from "@/store/app-store";
import {
  demandaNoAtendida,
  demandaPorArticulo,
  disponibleDe,
  reservasPorSku,
  nroSolicitudDe,
} from "@/store/selectors";

const AHORA = new Date(2027, 2, 15, 12, 0);

/** Confirma un borrador pidiendo `extra` unidades más de las que hay. */
function conSolicitud(extra = 480) {
  let s = semilla(AHORA);
  const b = Object.values(s.pedidos).find((p) => p.estado === "borrador")!;
  const sku = b.items[0].sku;
  const disp = disponibleDe(sku, reservasPorSku(s));
  s = reducer(s, {
    type: "pedido/upsert",
    pedido: { ...b, items: [{ ...b.items[0], cantidad: disp + extra }] },
  });
  s = reducer(s, {
    type: "pedido/confirmar",
    nro: b.nro,
    fecha: "2027-03-15 10:00",
  });
  return { s, sku, extra, nroSol: nroSolicitudDe(b.nro), cliente: b.cliente };
}

describe("RF-24 · demanda no atendida", () => {
  it("sin solicitudes no hay demanda que reportar", () => {
    expect(demandaNoAtendida(semilla(AHORA))).toHaveLength(0);
  });

  it("recoge las unidades pedidas sin stock, con su cliente", () => {
    const { s, sku, extra, cliente } = conSolicitud();
    const d = demandaNoAtendida(s);
    expect(d).toHaveLength(1);
    expect(d[0].sku).toBe(sku);
    expect(d[0].unidades).toBe(extra);
    expect(d[0].clientes).toEqual([cliente]);
    expect(d[0].solicitudes).toBe(1);
  });

  it("una solicitud rechazada deja de empujar producción", () => {
    const { s, nroSol } = conSolicitud();
    expect(demandaNoAtendida(s)).toHaveLength(1);

    const despues = reducer(s, {
      type: "solicitud/resolver",
      nro: nroSol,
      fecha: "2027-03-16 09:00",
      decision: "rechazada",
    });
    expect(demandaNoAtendida(despues)).toHaveLength(0);
  });

  it("una solicitud aprobada sí cuenta", () => {
    const { s, nroSol } = conSolicitud();
    const despues = reducer(s, {
      type: "solicitud/resolver",
      nro: nroSol,
      fecha: "2027-03-16 09:00",
      decision: "aprobada",
    });
    expect(demandaNoAtendida(despues)).toHaveLength(1);
  });

  it("agrupa por artículo, que es como se produce", () => {
    const { s, extra } = conSolicitud();
    const porArt = demandaPorArticulo(s);
    expect(porArt).toHaveLength(1);
    expect(porArt[0].unidades).toBe(extra);
    expect(porArt[0].skus).toBe(1);
  });

  it("ordena por unidades, de mayor a menor", () => {
    const { s } = conSolicitud();
    const d = demandaNoAtendida(s);
    for (let i = 1; i < d.length; i++) {
      expect(d[i - 1].unidades).toBeGreaterThanOrEqual(d[i].unidades);
    }
  });
});

describe("contadores no mezclan solicitudes con pedidos", () => {
  it("una solicitud con varios SKUs cuenta como UN documento", () => {
    let s = semilla(AHORA);
    const b = Object.values(s.pedidos).find((p) => p.items.length >= 2)!;
    // Se fuerza una solicitud con dos líneas.
    s = reducer(s, {
      type: "pedido/upsert",
      pedido: {
        ...b,
        nro: `${b.nro}-S`,
        tipo: "solicitud",
        estadoSolicitud: "pendiente",
      },
    });
    const d = demandaNoAtendida(s);
    expect(d.length).toBeGreaterThanOrEqual(2);
    // Cada SKU aparece en un solo documento, no cuenta por ítem.
    d.forEach((x) => expect(x.solicitudes).toBe(1));
  });
});
