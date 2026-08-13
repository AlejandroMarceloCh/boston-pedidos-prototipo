// RF-02 vencimiento de la reserva · RF-43 guía de remisión · RF-44 nota de crédito.
import { describe, it, expect } from "vitest";
import { semilla } from "@/store/semilla";
import { reducer } from "@/store/app-store";
import { reservasPorSku, disponibleDe } from "@/store/selectors";
import { reservaVencida, HORAS_RESERVA } from "@/features/pedidos/pedido-data";

const AHORA = new Date(2027, 2, 15, 12, 0);
const base = () => semilla(AHORA);

describe("RF-02 · vencimiento de la reserva", () => {
  it("una reserva reciente sigue reteniendo stock", () => {
    const s = base();
    const conf = Object.values(s.pedidos).find((p) => p.estado === "confirmado")!;
    expect(reservaVencida(conf, AHORA)).toBe(false);
    expect(reservasPorSku(s, AHORA).get(conf.items[0].sku)).toBeGreaterThan(0);
  });

  it("pasadas las horas de reserva el stock se libera solo", () => {
    const s = base();
    const conf = Object.values(s.pedidos).find((p) => p.estado === "confirmado")!;
    const sku = conf.items[0].sku;

    const despues = new Date(AHORA.getTime() + (HORAS_RESERVA + 1) * 3600_000);
    expect(reservaVencida(conf, despues)).toBe(true);
    // Ya no retiene: el disponible sube respecto de antes.
    const antes = disponibleDe(sku, reservasPorSku(s, AHORA));
    const luego = disponibleDe(sku, reservasPorSku(s, despues));
    expect(luego).toBeGreaterThan(antes);
  });

  it("un pedido facturado ya consumió el stock: su reserva no vence", () => {
    const s = base();
    const fact = Object.values(s.pedidos).find((p) => p.estado === "facturado")!;
    const muyDespues = new Date(AHORA.getTime() + 30 * 24 * 3600_000);
    expect(reservaVencida(fact, muyDespues)).toBe(false);
  });
});

describe("RF-43 · guía de remisión", () => {
  it("entregar emite una guía y la deja en el historial", () => {
    let s = base();
    const fact = Object.values(s.pedidos).find((p) => p.estado === "facturado")!;
    s = reducer(s, {
      type: "pedido/entregar",
      nro: fact.nro,
      fecha: "2027-03-16 10:00",
      guias: ["T001-00841"],
    });
    expect(s.pedidos[fact.nro].estado).toBe("entregado");
    expect(s.pedidos[fact.nro].eventos.at(-1)!.detalle).toContain("T001-00841");
  });

  it("un pedido con dos destinos recibe una guía por cada uno", () => {
    let s = base();
    const p = Object.values(s.pedidos).find((x) => x.items.length >= 2)!;
    s = reducer(s, {
      type: "pedido/upsert",
      pedido: {
        ...p,
        estado: "facturado",
        partidas: [
          { id: "1", ruc: "1", razonSocial: "A", direccionId: "1", items: [{ sku: p.items[0].sku, cantidad: p.items[0].cantidad }], factura: "F001-1" },
          { id: "2", ruc: "2", razonSocial: "B", direccionId: "2", items: p.items.slice(1).map((i) => ({ sku: i.sku, cantidad: i.cantidad })), factura: "F001-2" },
        ],
      },
    });
    s = reducer(s, {
      type: "pedido/entregar",
      nro: p.nro,
      fecha: "2027-03-16 10:00",
      guias: ["T001-00841", "T001-00842"],
    });
    expect(s.pedidos[p.nro].partidas!.map((x) => x.guia)).toEqual([
      "T001-00841",
      "T001-00842",
    ]);
  });
});

describe("RF-44 · nota de crédito", () => {
  it("anular un pedido FACTURADO emite nota de crédito", () => {
    let s = base();
    const p = Object.values(s.pedidos).find((x) => x.items.length >= 1)!;
    s = reducer(s, {
      type: "pedido/upsert",
      pedido: {
        ...p,
        estado: "facturado",
        partidas: [
          { id: "1", ruc: "1", razonSocial: "A", direccionId: "1", items: p.items.map((i) => ({ sku: i.sku, cantidad: i.cantidad })), factura: "F001-1" },
        ],
      },
    });
    s = reducer(s, {
      type: "pedido/anular",
      nro: p.nro,
      fecha: "2027-03-16 12:00",
      notasCredito: ["FC01-00120"],
    });
    expect(s.pedidos[p.nro].estado).toBe("anulado");
    expect(s.pedidos[p.nro].partidas![0].notaCredito).toBe("FC01-00120");
    expect(s.pedidos[p.nro].eventos.at(-1)!.detalle).toContain("FC01-00120");
  });

  it("anular un pedido solo CONFIRMADO no emite nada: no había qué revertir", () => {
    let s = base();
    const conf = Object.values(s.pedidos).find((x) => x.estado === "confirmado")!;
    const antes = conf.eventos.length;
    s = reducer(s, {
      type: "pedido/anular",
      nro: conf.nro,
      fecha: "2027-03-16 12:00",
      notasCredito: [],
    });
    // Un solo evento: la anulación. Sin nota de crédito.
    expect(s.pedidos[conf.nro].eventos).toHaveLength(antes + 1);
    expect(
      s.pedidos[conf.nro].eventos.some((e) => e.detalle.includes("Nota de crédito"))
    ).toBe(false);
  });
});

// ===== Precisión monetaria =====
import { calcularTotales, centimos } from "@/lib/pedido-calc";

describe("dinero exacto", () => {
  it("un precio con más de dos decimales se normaliza antes de calcular", () => {
    const t = calcularTotales([{ cantidad: 100, precio: 30.009 }], {
      aplicarInicial: false,
      slot3: 0,
    });
    // 30.009 se recorta a 30.01, que es lo que muestra la pantalla.
    expect(t.subtotal).toBe(centimos(100 * 30.01));
  });

  it("subtotal − descuento + IGV es exactamente el total", () => {
    const t = calcularTotales(
      [
        { cantidad: 37, precio: 18.9 },
        { cantidad: 13, precio: 4.75 },
        { cantidad: 7, precio: 24.95 },
      ],
      { aplicarInicial: true, slot3: 7 }
    );
    expect(centimos(t.base + t.igv)).toBe(t.total);
    expect(centimos(t.subtotal - t.totalDescuento)).toBe(t.base);
  });

  it("los importes por línea suman el subtotal al céntimo", () => {
    const t = calcularTotales(
      [
        { cantidad: 3, precio: 33.333 },
        { cantidad: 7, precio: 1.005 },
      ],
      { aplicarInicial: false, slot3: 0 }
    );
    const suma = centimos(t.lineas.reduce((a, l) => a + l.importe, 0));
    expect(suma).toBe(t.subtotal);
  });
});
