// P0 · Confirmar un pedido NUEVO desde el asistente.
//
// El asistente hace dos cosas seguidas en el mismo tick: guarda el borrador y
// lo confirma. Si la confirmación depende del `state` capturado en el closure,
// el pedido recién creado todavía no está ahí y la confirmación se pierde en
// silencio: la interfaz muestra éxito y el registro queda en borrador.
//
// Los tests que ejercitan el reducer de a un dispatch no ven esto.
import { describe, it, expect } from "vitest";
import { semilla } from "@/store/semilla";
import { reducer } from "@/store/app-store";
import { reservasPorSku, disponibleDe, siguienteNro } from "@/store/selectors";
import type { PedidoDetalle } from "@/features/pedidos/pedido-data";
import { SKUS } from "@/lib/mock-data";

/** Un SKU con stock de sobra, para no chocar con los que la semilla agota. */
function skuConStock(state: ReturnType<typeof semilla>, minimo = 150): string {
  const reservas = reservasPorSku(state);
  return SKUS.find((s) => disponibleDe(s.codigo, reservas) >= minimo)!.codigo;
}

const AHORA = new Date(2027, 2, 15, 12, 0);

describe("P0 · confirmar un pedido nuevo", () => {
  it("queda confirmado y reserva stock, sin depender de un estado previo", () => {
    const inicial = semilla(AHORA);
    const nro = siguienteNro(inicial, AHORA);
    const sku = skuConStock(inicial);
    const disp = disponibleDe(sku, reservasPorSku(inicial));

    const nuevo: PedidoDetalle = {
      nro,
      tipo: "pedido",
      cliente: "Distribuidora Andina del Sur SAC",
      clienteId: "108671",
      fecha: "2027-03-15 12:00",
      estado: "borrador",
      items: [
        {
          sku,
          descripcion: "Artículo con stock",
          cantidad: 12,
          precio: 30,
          atendible: 12,
        },
      ],
      condicion: "C",
      moneda: "PEN",
      descuentoTotal: 0,
      subtotal: 360,
      igv: 64.8,
      total: 424.8,
      tieneSaldo: false,
      fechaEntrega: "2027-03-20",
      eventos: [{ fecha: "2027-03-15 12:00", tipo: "creado", detalle: "Cargado" }],
    };

    // Los dos dispatches del asistente, uno tras otro.
    let s = reducer(inicial, { type: "pedido/upsert", pedido: nuevo });
    s = reducer(s, { type: "pedido/confirmar", nro, fecha: "2027-03-15 12:01" });

    const guardado = s.pedidos[nro];
    expect(guardado).toBeDefined();
    expect(guardado.estado).toBe("confirmado");
    // Y el stock quedó efectivamente reservado.
    expect(disponibleDe(sku, reservasPorSku(s))).toBe(disp - 12);
  });

  it("si se pidió más de lo que hay, crea la solicitud hermana", () => {
    const inicial = semilla(AHORA);
    const nro = siguienteNro(inicial, AHORA);
    const sku = skuConStock(inicial);
    const disp = disponibleDe(sku, reservasPorSku(inicial));

    const nuevo: PedidoDetalle = {
      nro,
      tipo: "pedido",
      cliente: "X",
      clienteId: "108671",
      fecha: "2027-03-15 12:00",
      estado: "borrador",
      items: [
        { sku, descripcion: "d", cantidad: disp + 480, precio: 30, atendible: disp },
      ],
      condicion: "C",
      moneda: "PEN",
      descuentoTotal: 0,
      subtotal: 0,
      igv: 0,
      total: 0,
      tieneSaldo: false,
      eventos: [],
    };

    let s = reducer(inicial, { type: "pedido/upsert", pedido: nuevo });
    s = reducer(s, { type: "pedido/confirmar", nro, fecha: "2027-03-15 12:01" });

    expect(s.pedidos[nro].estado).toBe("confirmado");
    expect(s.pedidos[nro].items[0].cantidad).toBe(disp);
    const solicitud = s.pedidos[`${nro}-S`];
    expect(solicitud).toBeDefined();
    expect(solicitud.items[0].cantidad).toBe(480);
  });

  it("conserva condición, partidas y fecha comprometida al confirmar", () => {
    const inicial = semilla(AHORA);
    const nro = siguienteNro(inicial, AHORA);
    const nuevo: PedidoDetalle = {
      nro,
      tipo: "pedido",
      cliente: "X",
      clienteId: "108671",
      fecha: "2027-03-15 12:00",
      estado: "borrador",
      items: [
        { sku: skuConStock(inicial), descripcion: "d", cantidad: 12, precio: 30, atendible: 12 },
      ],
      condicion: "O",
      moneda: "PEN",
      descuentoTotal: 0,
      subtotal: 360,
      igv: 0,
      total: 360,
      tieneSaldo: false,
      fechaEntrega: "2027-03-20",
      direccionId: "2",
      partidas: [
        {
          id: "1",
          ruc: "20512345671",
          razonSocial: "X",
          direccionId: "2",
          items: [{ sku: skuConStock(inicial), cantidad: 12 }],
        },
      ],
      eventos: [],
    };

    let s = reducer(inicial, { type: "pedido/upsert", pedido: nuevo });
    s = reducer(s, { type: "pedido/confirmar", nro, fecha: "2027-03-15 12:01" });

    const g = s.pedidos[nro];
    expect(g.condicion).toBe("O");
    expect(g.fechaEntrega).toBe("2027-03-20");
    expect(g.partidas).toHaveLength(1);
    expect(g.partidas![0].ruc).toBe("20512345671");
    expect(g.direccionId).toBe("2");
  });
});

// ===== Hallazgos de la auditoría externa =====
import { calcularTotales } from "@/lib/pedido-calc";
import { siguienteFactura, siguienteGuia, siguienteNotaCredito } from "@/store/selectors";
import { HORAS_RESERVA } from "@/features/pedidos/pedido-data";

describe("correlativos tributarios", () => {
  it("cada serie corre por su cuenta: una guía no mueve el correlativo de facturas", () => {
    let s = semilla(AHORA);
    const p = Object.values(s.pedidos)[0];
    s = reducer(s, {
      type: "pedido/upsert",
      pedido: {
        ...p,
        factura: "F001-12500",
        partidas: [
          { id: "1", ruc: "1", razonSocial: "A", direccionId: "1", items: [], guia: "T001-00900" },
        ],
      },
    });
    // La guía alta no debe empujar la factura, ni al revés.
    expect(siguienteFactura(s)).toBe("F001-12501");
    expect(siguienteGuia(s)).toBe("T001-00901");
    expect(siguienteNotaCredito(s)).toBe("FC01-00120");
  });

  it("ve la segunda factura de un pedido partido, sin reutilizar su número", () => {
    let s = semilla(AHORA);
    const p = Object.values(s.pedidos)[0];
    s = reducer(s, {
      type: "pedido/upsert",
      pedido: {
        ...p,
        factura: "F001-12391",
        partidas: [
          { id: "1", ruc: "1", razonSocial: "A", direccionId: "1", items: [], factura: "F001-12391" },
          { id: "2", ruc: "2", razonSocial: "B", direccionId: "2", items: [], factura: "F001-12392" },
        ],
      },
    });
    // Antes devolvía 12392, que ya estaba emitida.
    expect(siguienteFactura(s)).toBe("F001-12393");
  });
});

describe("RF-35 · obsequio y donación no cobran", () => {
  const lineas = [{ cantidad: 24, precio: 30 }];

  it("una venta normal genera base e IGV", () => {
    const t = calcularTotales(lineas, { aplicarInicial: false, slot3: 0, condicion: "C" });
    expect(t.base).toBeGreaterThan(0);
    expect(t.igv).toBeGreaterThan(0);
    expect(t.total).toBeCloseTo(t.base * 1.18, 2);
  });

  it("un obsequio conserva el subtotal pero no genera cobro ni IGV", () => {
    const t = calcularTotales(lineas, { aplicarInicial: false, slot3: 0, condicion: "O" });
    expect(t.subtotal).toBe(720);       // se valoriza
    expect(t.base).toBe(0);             // no se cobra
    expect(t.igv).toBe(0);
    expect(t.total).toBe(0);
    expect(t.totalUnidades).toBe(24);   // y mueve stock igual
  });

  it("una donación tampoco", () => {
    const t = calcularTotales(lineas, { aplicarInicial: false, slot3: 0, condicion: "D" });
    expect(t.total).toBe(0);
  });
});

describe("RF-02 · una reserva vencida no se puede facturar", () => {
  it("facturar no hace nada si la reserva ya venció", () => {
    let s = semilla(AHORA);
    const conf = Object.values(s.pedidos).find((p) => p.estado === "confirmado")!;
    // El reducer compara contra la hora real, así que la confirmación se
    // envejece respecto de ahora, no de la fecha simulada de la semilla.
    const viejo = new Date(Date.now() - (HORAS_RESERVA + 5) * 3600_000);
    const dd = (n: number) => String(n).padStart(2, "0");
    // La hora también, o según el momento del día la resta caía dentro del
    // plazo y el test pasaba o fallaba por azar.
    const fechaVieja =
      `${viejo.getFullYear()}-${dd(viejo.getMonth() + 1)}-${dd(viejo.getDate())}` +
      ` ${dd(viejo.getHours())}:${dd(viejo.getMinutes())}`;
    s = reducer(s, {
      type: "pedido/upsert",
      pedido: {
        ...conf,
        fecha: fechaVieja,
        eventos: [{ fecha: fechaVieja, tipo: "confirmado", detalle: "Stock reservado" }],
      },
    });

    const despues = reducer(s, {
      type: "pedido/facturar",
      nro: conf.nro,
      fecha: "2027-03-15 12:00",
      facturas: ["F001-12391"],
    });
    // Sigue confirmado: hay que reconfirmar contra el stock actual.
    expect(despues.pedidos[conf.nro].estado).toBe("confirmado");
  });
});

describe("máquina de estados", () => {
  const nroDe = (s: ReturnType<typeof semilla>, estado: string) =>
    Object.values(s.pedidos).find((p) => p.estado === estado)!.nro;

  it("no se puede facturar un borrador", () => {
    const s = semilla(AHORA);
    const nro = nroDe(s, "borrador");
    const d = reducer(s, {
      type: "pedido/facturar",
      nro,
      fecha: "2027-03-16 09:00",
      facturas: ["F001-12391"],
    });
    expect(d.pedidos[nro].estado).toBe("borrador");
  });

  it("no se puede entregar algo que no se facturó", () => {
    const s = semilla(AHORA);
    const nro = nroDe(s, "confirmado");
    const d = reducer(s, {
      type: "pedido/entregar",
      nro,
      fecha: "2027-03-16 09:00",
      guias: ["T001-00841"],
    });
    expect(d.pedidos[nro].estado).toBe("confirmado");
  });

  it("reconfirmar no destruye el pedido", () => {
    const s = semilla(AHORA);
    const nro = nroDe(s, "confirmado");
    const antes = s.pedidos[nro].items.map((i) => i.cantidad);
    const d = reducer(s, { type: "pedido/confirmar", nro, fecha: "2027-03-16 09:00" });
    // Antes, reconfirmar competía contra su propia reserva y mandaba todo a
    // solicitud dejando el pedido vacío.
    expect(d.pedidos[nro].items.map((i) => i.cantidad)).toEqual(antes);
    expect(d.pedidos[`${nro}-S`]).toBeUndefined();
  });

  it("un pedido anulado no revive", () => {
    const s = semilla(AHORA);
    const nro = nroDe(s, "anulado");
    const d = reducer(s, { type: "pedido/confirmar", nro, fecha: "2027-03-16 09:00" });
    expect(d.pedidos[nro].estado).toBe("anulado");
  });
});
