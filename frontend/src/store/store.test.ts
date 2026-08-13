// Verificación del núcleo del store: numeración, stock derivado y totales.

import { describe, it, expect } from "vitest";
import { semilla } from "@/store/semilla";
import { siguienteNro, reservasPorSku, disponibleDe, resumenes, kpis } from "@/store/selectors";
import { calcularTotales } from "@/lib/pedido-calc";
import { reducer } from "@/store/app-store";
import { nroSolicitudDe } from "@/store/selectors";
import type { AppState } from "@/store/semilla";
import { ESTADOS_QUE_RESERVAN } from "@/features/pedidos/pedido-data";
import { SKUS } from "@/lib/mock-data";


/** Construye la acción de confirmar repartiendo contra el stock disponible. */
function accionConfirmar(state: AppState, nro: string, fecha = "2027-03-15 10:00") {
  const p = state.pedidos[nro];
  const reservas = reservasPorSku(state);
  const pedido = [];
  const solicitud = [];
  for (const item of p.items) {
    const disp = disponibleDe(item.sku, reservas);
    const atendible = Math.max(0, Math.min(item.cantidad, disp));
    const excedente = item.cantidad - atendible;
    if (atendible > 0) pedido.push({ ...item, cantidad: atendible, atendible });
    if (excedente > 0) solicitud.push({ ...item, cantidad: excedente, atendible: 0 });
  }
  const subtotal = pedido.reduce((a, i) => a + i.cantidad * i.precio, 0);
  return {
    type: "pedido/confirmar" as const,
    nro,
    fecha,
    reparto: { pedido, solicitud },
    nroSolicitud: nroSolicitudDe(nro),
    totales: {
      subtotal,
      descuentoTotal: 0,
      igv: 0,
      total: subtotal,
      subtotalSolicitud: solicitud.reduce((a, i) => a + i.cantidad * i.precio, 0),
    },
  };
}

describe("semilla", () => {
  it("rebasea las fechas sobre hoy y conserva los 7 pedidos", () => {
    const hoy = new Date(2027, 2, 15, 12, 0);
    const s = semilla(hoy);
    expect(Object.keys(s.pedidos)).toHaveLength(7);
    const fechas = Object.values(s.pedidos).map((p) => p.fecha).sort();
    expect(fechas[fechas.length - 1].slice(0, 10)).toBe("2027-03-15");
  });
});

describe("numeración", () => {
  it("continúa el correlativo del día", () => {
    const hoy = new Date(2027, 2, 15, 12, 0);
    const s = semilla(hoy);
    const nro = siguienteNro(s, hoy);
    expect(nro.startsWith("2027-0315-")).toBe(true);
    // El más alto del día en la semilla es 014 → el siguiente es 015
    expect(nro).toBe("2027-0315-015");
  });
});

describe("stock derivado", () => {
  it("solo reservan los pedidos vivos; anular devuelve el stock", () => {
    const s = semilla(new Date(2027, 2, 15, 12, 0));
    const confirmado = Object.values(s.pedidos).find((p) => p.estado === "confirmado")!;
    const sku = confirmado.items[0].sku;
    const base = SKUS.find((x) => x.codigo === sku)!;

    // El disponible nunca es negativo: si un pedido compromete más de lo que
    // hay, se muestra 0 y el faltante queda como saldo del pedido.
    const antes = disponibleDe(sku, reservasPorSku(s));
    const esperado = Math.max(
      0,
      base.stock - base.reservado - confirmado.items[0].cantidad
    );
    expect(antes).toBe(esperado);

    // Anularlo devuelve el stock: vuelve a lo que había sin ese pedido.
    const anulado = {
      ...s,
      pedidos: { ...s.pedidos, [confirmado.nro]: { ...confirmado, estado: "anulado" as const } },
    };
    expect(disponibleDe(sku, reservasPorSku(anulado))).toBe(
      base.stock - base.reservado
    );
  });

  it("un borrador no reserva nada", () => {
    const s = semilla(new Date(2027, 2, 15, 12, 0));
    const borrador = Object.values(s.pedidos).find((p) => p.estado === "borrador")!;
    const sku = borrador.items[0].sku;
    const base = SKUS.find((x) => x.codigo === sku)!;
    expect(disponibleDe(sku, reservasPorSku(s))).toBe(base.stock - base.reservado);
  });
});

describe("totales", () => {
  it("aplica inicial, volumen en cascada e IGV 18%", () => {
    // 132 unidades = 11 docenas → nivel 2 (12%)
    const lineas = [
      { cantidad: 48, precio: 30 },
      { cantidad: 60, precio: 24.95 },
      { cantidad: 24, precio: 4.75 },
    ];
    const t = calcularTotales(lineas, { aplicarInicial: true, slot3: 0 });
    expect(t.subtotal).toBeCloseTo(3051, 2);
    expect(t.totalDocenas).toBe(11);
    expect(t.nivel?.porcentaje).toBe(12);
    expect(t.dInicial).toBeCloseTo(3051 * 0.38, 2);
    expect(t.dVolumen).toBeCloseTo((3051 - 3051 * 0.38) * 0.12, 2);
    expect(t.igv).toBeCloseTo(t.base * 0.18, 2);
    expect(t.total).toBeCloseTo(t.base + t.igv, 2);
  });

  it("nunca supera el tope de descuento", () => {
    const t = calcularTotales([{ cantidad: 12000, precio: 10 }], {
      aplicarInicial: true,
      slot3: 50,
    });
    expect(t.descuentoTopeado).toBe(true);
    expect(t.totalDescuento).toBeCloseTo(t.subtotal * 0.6, 2);
    expect(t.base).toBeGreaterThan(0);
  });
});

describe("resumenes y kpis", () => {
  it("el total del resumen coincide con el del detalle", () => {
    const s = semilla(new Date(2027, 2, 15, 12, 0));
    for (const r of resumenes(s)) {
      expect(r.total).toBe(s.pedidos[r.nro].total);
    }
  });

  it("los KPIs cuentan sobre datos reales", () => {
    const hoy = new Date(2027, 2, 15, 12, 0);
    const s = semilla(hoy);
    const k = kpis(s, reservasPorSku(s));
    const borradores = Object.values(s.pedidos).filter((p) => p.estado === "borrador").length;
    expect(k.porConfirmar).toBe(borradores);
    expect(k.montoPorFacturar).toBeCloseTo(
      Object.values(s.pedidos)
        .filter((p) => p.estado === "confirmado")
        .reduce((a, p) => a + p.total, 0),
      2
    );
  });
});

// ===== Ciclo de vida del pedido =====

describe("ciclo de vida del pedido", () => {
  const base = () => semilla(new Date(2027, 2, 15, 12, 0));

  it("borrador → confirmado → facturado → entregado, registrando cada paso", () => {
    let s = base();
    const borrador = Object.values(s.pedidos).find((p) => p.estado === "borrador")!;
    const eventosIniciales = borrador.eventos.length;

    s = reducer(s, accionConfirmar(s, borrador.nro));
    expect(s.pedidos[borrador.nro].estado).toBe("confirmado");

    s = reducer(s, {
      type: "pedido/facturar",
      nro: borrador.nro,
      fecha: "2027-03-15 11:00",
      factura: "F001-12391",
    });
    expect(s.pedidos[borrador.nro].estado).toBe("facturado");
    expect(s.pedidos[borrador.nro].factura).toBe("F001-12391");

    s = reducer(s, { type: "pedido/entregar", nro: borrador.nro, fecha: "2027-03-15 16:00" });
    expect(s.pedidos[borrador.nro].estado).toBe("entregado");

    // Cada transición dejó su rastro: el historial no puede mentir.
    expect(s.pedidos[borrador.nro].eventos).toHaveLength(eventosIniciales + 3);
    expect(s.pedidos[borrador.nro].eventos.map((e) => e.tipo)).toEqual(
      expect.arrayContaining(["confirmado", "facturado", "entregado"])
    );
  });

  it("confirmar con faltante ya no marca saldo: el excedente va a la solicitud", () => {
    let s = base();
    const borrador = Object.values(s.pedidos).find((p) => p.estado === "borrador")!;
    // Se pide mucho más de lo que hay de ese SKU.
    const sku = borrador.items[0].sku;
    const disp = disponibleDe(sku, reservasPorSku(s));
    s = reducer(s, {
      type: "pedido/upsert",
      pedido: {
        ...borrador,
        items: [{ ...borrador.items[0], cantidad: disp + 480 }],
      },
    });

    const nroSol = nroSolicitudDe(borrador.nro);
    s = reducer(s, accionConfirmar(s, borrador.nro));

    const pedido = s.pedidos[borrador.nro];
    const solicitud = s.pedidos[nroSol];

    expect(pedido.estado).toBe("confirmado");
    expect(pedido.tieneSaldo).toBe(false);
    expect(pedido.items[0].cantidad).toBe(disp);
    expect(pedido.documentoHermano).toBe(nroSol);

    expect(solicitud).toBeDefined();
    expect(solicitud.tipo).toBe("solicitud");
    expect(solicitud.estadoSolicitud).toBe("pendiente");
    expect(solicitud.items[0].cantidad).toBe(480);
    expect(solicitud.documentoHermano).toBe(borrador.nro);
  });

  it("anular saca el pedido del cálculo de stock", () => {
    let s = base();
    const confirmado = Object.values(s.pedidos).find((p) => p.estado === "confirmado")!;
    const sku = confirmado.items[0].sku;
    const antes = reservasPorSku(s).get(sku) ?? 0;

    s = reducer(s, { type: "pedido/anular", nro: confirmado.nro, fecha: "2027-03-15 12:00" });
    const despues = reservasPorSku(s).get(sku) ?? 0;

    expect(despues).toBe(antes - confirmado.items[0].cantidad);
    expect(ESTADOS_QUE_RESERVAN).not.toContain(s.pedidos[confirmado.nro].estado);
  });

  it("reiniciar la demo vuelve a los 7 pedidos originales", () => {
    let s = base();
    s = reducer(s, {
      type: "pedido/upsert",
      pedido: { ...Object.values(s.pedidos)[0], nro: "2027-0315-099" },
    });
    expect(Object.keys(s.pedidos)).toHaveLength(8);
    s = reducer(s, { type: "demo/reset", ahora: new Date(2027, 2, 15, 12, 0) });
    expect(Object.keys(s.pedidos)).toHaveLength(7);
  });
});

// ===== RNF-05 · un único cálculo =====

describe("RNF-05 · los importes por línea suman el subtotal", () => {
  const lineas = [
    { cantidad: 48, precio: 30, stockDisponible: 43 },  // 5 und sin stock
    { cantidad: 60, precio: 24.95, stockDisponible: 500 },
    { cantidad: 24, precio: 4.75, stockDisponible: 0 },  // todo saldo
  ];

  it("la suma de los importes es exactamente el subtotal", () => {
    const t = calcularTotales(lineas, { aplicarInicial: true, slot3: 0 });
    const suma = t.lineas.reduce((a, l) => a + l.importe, 0);
    expect(suma).toBeCloseTo(t.subtotal, 6);
  });

  it("cada línea reparte lo solicitado entre atendible y saldo, sin perder unidades", () => {
    const t = calcularTotales(lineas, { aplicarInicial: true, slot3: 0 });
    t.lineas.forEach((l, i) => {
      expect(l.atendible + l.saldo).toBe(lineas[i].cantidad);
    });
    expect(t.totalUnidades + t.totalSaldoUnidades).toBe(t.totalSolicitadoUnidades);
  });

  it("el saldo no entra en el subtotal ni infla el descuento (RF-32)", () => {
    const t = calcularTotales(lineas, { aplicarInicial: true, slot3: 0 });
    // Atendible: 43×30 + 60×24.95 + 0 = 1290 + 1497 = 2787
    expect(t.subtotal).toBeCloseTo(2787, 2);
    // 103 unidades atendibles = 8 docenas → nivel 2 (12%), no el nivel que
    // daría contar las 132 solicitadas (11 docenas, también nivel 2 acá, pero
    // el subtotal sí cambia).
    expect(t.totalUnidades).toBe(103);
    expect(t.totalSaldoUnidades).toBe(29);
    expect(t.totalSaldoMonto).toBeCloseTo(5 * 30 + 24 * 4.75, 2);
  });

  it("sin stockDisponible todo es atendible (compatibilidad)", () => {
    const t = calcularTotales([{ cantidad: 12, precio: 10 }], {
      aplicarInicial: false,
      slot3: 0,
    });
    expect(t.totalSaldoUnidades).toBe(0);
    expect(t.subtotal).toBe(120);
  });
});

// ===== Colaterales de la auditoría =====
describe("colaterales", () => {
  it("la sesión arranca cerrada, entrar la abre y salir la cierra", () => {
    let s = semilla(new Date(2027, 2, 15, 12, 0));
    expect(s.sesion).toBeNull();
    s = reducer(s, { type: "sesion/entrar", usuario: "miguel.quispe" });
    expect(s.sesion).toBe("miguel.quispe");
    s = reducer(s, { type: "sesion/salir" });
    expect(s.sesion).toBeNull();
  });

  it("reiniciar la demo también cierra la sesión", () => {
    let s = reducer(semilla(new Date(2027, 2, 15, 12, 0)), {
      type: "sesion/entrar",
      usuario: "miguel.quispe",
    });
    s = reducer(s, { type: "demo/reset", ahora: new Date(2027, 2, 15, 12, 0) });
    expect(s.sesion).toBeNull();
  });

  it("los pedidos de un cliente se cruzan por código, no por razón social", () => {
    const s = semilla(new Date(2027, 2, 15, 12, 0));
    // Las razones sociales llevan sufijo ("… SAC") y los pedidos guardan el
    // nombre sin él: cruzar por texto daba cero para todos los clientes.
    const conCodigo = Object.values(s.pedidos).filter((p) => p.clienteId === "108671");
    expect(conCodigo.length).toBeGreaterThan(0);
    const porNombre = Object.values(s.pedidos).filter(
      (p) => p.cliente === "Distribuidora Andina del Sur SAC"
    );
    expect(porNombre).toHaveLength(0);
  });
});

// ===== RF-20 a RF-24 · Pedido vs Solicitud =====
describe("RF-20 · el split de la confirmación", () => {
  const base = () => semilla(new Date(2027, 2, 15, 12, 0));

  /** Deja un borrador pidiendo `disp + extra` unidades de un solo SKU. */
  function borradorExcedido(extra: number) {
    let s = base();
    const b = Object.values(s.pedidos).find((p) => p.estado === "borrador")!;
    const sku = b.items[0].sku;
    const disp = disponibleDe(sku, reservasPorSku(s));
    s = reducer(s, {
      type: "pedido/upsert",
      pedido: { ...b, items: [{ ...b.items[0], cantidad: disp + extra }] },
    });
    return { s, nro: b.nro, sku, disp };
  }

  it("una solicitud NO reserva stock (o el excedente se contaría dos veces)", () => {
    const { s, nro, sku, disp } = borradorExcedido(480);
    const despues = reducer(s, accionConfirmar(s, nro));

    // El pedido tomó todo lo disponible: no queda nada libre.
    expect(disponibleDe(sku, reservasPorSku(despues))).toBe(0);
    // Y la reserva es exactamente lo atendible, no las 480 extra.
    expect(reservasPorSku(despues).get(sku)).toBe(disp);
  });

  it("el correlativo del día no se descuadra con solicitudes presentes", () => {
    const { s, nro } = borradorExcedido(480);
    const despues = reducer(s, accionConfirmar(s, nro));
    const hoy = new Date(2027, 2, 15, 12, 0);

    // Existe "…-NNN-S": si entrara en el conteo, slice(-3) leería "N-S".
    expect(Object.keys(despues.pedidos).some((n) => n.endsWith("-S"))).toBe(true);
    const siguiente = siguienteNro(despues, hoy);
    expect(siguiente).toMatch(/^2027-0315-\d{3}$/);
    expect(Number.isNaN(parseInt(siguiente.slice(-3), 10))).toBe(false);
    expect(despues.pedidos[siguiente]).toBeUndefined();
  });

  it("sin excedente no nace ninguna solicitud", () => {
    let s = base();
    const b = Object.values(s.pedidos).find((p) => p.estado === "borrador")!;
    const sku = b.items[0].sku;
    const disp = disponibleDe(sku, reservasPorSku(s));
    s = reducer(s, {
      type: "pedido/upsert",
      pedido: { ...b, items: [{ ...b.items[0], cantidad: Math.min(12, disp) }] },
    });
    const despues = reducer(s, accionConfirmar(s, b.nro));
    expect(despues.pedidos[nroSolicitudDe(b.nro)]).toBeUndefined();
    expect(despues.pedidos[b.nro].documentoHermano).toBeUndefined();
  });

  it("RF-21 · aprobar y rechazar dejan rastro en el historial", () => {
    const { s, nro } = borradorExcedido(480);
    let despues = reducer(s, accionConfirmar(s, nro));
    const nroSol = nroSolicitudDe(nro);
    const eventosAntes = despues.pedidos[nroSol].eventos.length;

    despues = reducer(despues, {
      type: "solicitud/resolver",
      nro: nroSol,
      fecha: "2027-03-16 09:00",
      decision: "aprobada",
    });
    expect(despues.pedidos[nroSol].estadoSolicitud).toBe("aprobada");
    expect(despues.pedidos[nroSol].eventos).toHaveLength(eventosAntes + 1);

    despues = reducer(despues, {
      type: "solicitud/resolver",
      nro: nroSol,
      fecha: "2027-03-16 10:00",
      decision: "rechazada",
      motivo: "Sin reposición prevista",
    });
    expect(despues.pedidos[nroSol].estadoSolicitud).toBe("rechazada");
    expect(despues.pedidos[nroSol].eventos.at(-1)!.detalle).toContain("Sin reposición prevista");
  });

  it("RF-24 · los KPIs no cuentan solicitudes como venta", () => {
    const { s, nro } = borradorExcedido(480);
    const despues = reducer(s, accionConfirmar(s, nro));
    const k = kpis(despues, reservasPorSku(despues));

    // La solicitud aparece como pendiente, no como pedido por facturar.
    expect(k.solicitudesPendientes).toBe(1);
    const montoSoloPedidos = Object.values(despues.pedidos)
      .filter((p) => p.tipo !== "solicitud" && p.estado === "confirmado")
      .reduce((a, p) => a + p.total, 0);
    expect(k.montoPorFacturar).toBeCloseTo(montoSoloPedidos, 2);
  });

  it("los documentos quedan vinculados en los dos sentidos", () => {
    const { s, nro } = borradorExcedido(480);
    const despues = reducer(s, accionConfirmar(s, nro));
    const nroSol = nroSolicitudDe(nro);
    expect(despues.pedidos[nro].documentoHermano).toBe(nroSol);
    expect(despues.pedidos[nroSol].documentoHermano).toBe(nro);
  });
});
