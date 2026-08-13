// RF-41 + RF-42 · Facturación partida y multi-destino.
// La invariante que importa: la suma de las partidas es el total del pedido.
// Facturar de más, o dejar items fuera de toda factura, no es cosmético.
import { describe, it, expect } from "vitest";
import { semilla } from "@/store/semilla";
import { reducer } from "@/store/app-store";
import {
  partidasCuadran,
  partidasDe,
  unidadesDePartida,
  importeDePartida,
  type Partida,
  type PedidoDetalle,
} from "@/features/pedidos/pedido-data";

const base = () => semilla(new Date(2027, 2, 15, 12, 0));

/** Pedido de 3 líneas repartido en 2 partidas: dos SKU a una, uno a la otra. */
function pedidoPartido(): { estado: ReturnType<typeof base>; nro: string; p: PedidoDetalle } {
  let s = base();
  const original = Object.values(s.pedidos).find((x) => x.items.length >= 3)!;
  const partidas: Partida[] = [
    {
      id: "1",
      ruc: "20512345671",
      razonSocial: "Distribuidora Andina del Sur SAC",
      direccionId: "1",
      items: original.items.slice(0, 2).map((i) => ({ sku: i.sku, cantidad: i.atendible ?? i.cantidad })),
    },
    {
      id: "2",
      ruc: "20587654321",
      razonSocial: "Confecciones Textiles Perú EIRL",
      direccionId: "2",
      items: original.items.slice(2).map((i) => ({ sku: i.sku, cantidad: i.atendible ?? i.cantidad })),
    },
  ];
  const p = { ...original, estado: "confirmado" as const, partidas };
  s = reducer(s, { type: "pedido/upsert", pedido: p });
  return { estado: s, nro: p.nro, p };
}

describe("partidas", () => {
  it("sin partidas explícitas hay una sola, con todo el pedido", () => {
    const s = base();
    const p = Object.values(s.pedidos)[0];
    const partidas = partidasDe(p, "20512345671");
    expect(partidas).toHaveLength(1);
    expect(partidas[0].items.map((i) => i.sku)).toEqual(p.items.map((i) => i.sku));
  });

  it("la suma de las partidas es exactamente el total de las líneas", () => {
    const { p } = pedidoPartido();
    const suma = p.partidas!.reduce((a, par) => a + importeDePartida(p, par), 0);
    const totalLineas = p.items.reduce(
      (a, i) => a + (i.atendible ?? i.cantidad) * i.precio,
      0
    );
    expect(suma).toBeCloseTo(totalLineas, 6);
  });

  it("ninguna línea queda fuera ni se repite entre partidas", () => {
    const { p } = pedidoPartido();
    // Cada línea repartida exactamente: ni de más ni de menos.
    expect(partidasCuadran(p)).toBe(true);
  });

  it("facturar emite una factura por partida, con su RUC en el historial", () => {
    const { estado, nro, p } = pedidoPartido();
    const eventosAntes = p.eventos.length;
    const s = reducer(estado, {
      type: "pedido/facturar",
      nro,
      fecha: "2027-03-16 09:00",
      facturas: ["F001-12391", "F001-12392"],
    });
    const facturado = s.pedidos[nro];

    expect(facturado.estado).toBe("facturado");
    expect(facturado.partidas!.map((x) => x.factura)).toEqual([
      "F001-12391",
      "F001-12392",
    ]);
    // Un evento por factura, y cada uno dice a quién se le facturó.
    expect(facturado.eventos).toHaveLength(eventosAntes + 2);
    expect(facturado.eventos.at(-2)!.detalle).toContain("20512345671");
    expect(facturado.eventos.at(-1)!.detalle).toContain("20587654321");
  });

  it("las transiciones siguen funcionando con un pedido partido", () => {
    const { estado, nro } = pedidoPartido();
    let s = reducer(estado, {
      type: "pedido/facturar",
      nro,
      fecha: "2027-03-16 09:00",
      facturas: ["F001-12391", "F001-12392"],
    });
    s = reducer(s, {
      type: "pedido/entregar",
      nro,
      fecha: "2027-03-17 10:00",
      guias: ["T001-00841", "T001-00842"],
    });
    expect(s.pedidos[nro].estado).toBe("entregado");
    expect(s.pedidos[nro].partidas).toHaveLength(2);

    // Un entregado ya no se anula: la mercadería está con el cliente. Para
    // revertir hay que emitir nota de crédito sobre el facturado.
    s = reducer(s, { type: "pedido/anular", nro, fecha: "2027-03-17 11:00" });
    expect(s.pedidos[nro].estado).toBe("entregado");
  });

  it("un pedido de una sola partida factura igual que antes", () => {
    let s = base();
    const p = Object.values(s.pedidos).find((x) => x.estado === "confirmado")!;
    s = reducer(s, {
      type: "pedido/facturar",
      nro: p.nro,
      fecha: "2027-03-16 09:00",
      facturas: ["F001-12391"],
    });
    expect(s.pedidos[p.nro].estado).toBe("facturado");
    expect(s.pedidos[p.nro].factura).toBe("F001-12391");
  });
});

// ===== RF-62 / RF-63 · Confirmación del cliente (parte manual) =====
describe("confirmación del cliente", () => {
  it("recorre sin enviar → enviado → aceptado, dejando rastro", () => {
    let s = base();
    const p = Object.values(s.pedidos).find((x) => x.estado === "confirmado")!;
    expect(p.confirmacionCliente).toBeUndefined();

    const antes = p.eventos.length;
    s = reducer(s, {
      type: "pedido/confirmacionCliente",
      nro: p.nro,
      fecha: "2027-03-16 09:00",
      valor: "enviado",
    });
    expect(s.pedidos[p.nro].confirmacionCliente).toBe("enviado");

    s = reducer(s, {
      type: "pedido/confirmacionCliente",
      nro: p.nro,
      fecha: "2027-03-16 10:00",
      valor: "aceptado",
    });
    expect(s.pedidos[p.nro].confirmacionCliente).toBe("aceptado");
    expect(s.pedidos[p.nro].eventos).toHaveLength(antes + 2);
  });

  it("los reparos del cliente quedan como observación, no como confirmación", () => {
    let s = base();
    const p = Object.values(s.pedidos).find((x) => x.estado === "confirmado")!;
    s = reducer(s, {
      type: "pedido/confirmacionCliente",
      nro: p.nro,
      fecha: "2027-03-16 09:00",
      valor: "con_reparos",
      detalle: "Pidió cambiar el color de 2 líneas",
    });
    const ev = s.pedidos[p.nro].eventos.at(-1)!;
    expect(ev.tipo).toBe("observacion");
    expect(ev.detalle).toContain("color");
  });

  it("no altera el estado del pedido", () => {
    let s = base();
    const p = Object.values(s.pedidos).find((x) => x.estado === "confirmado")!;
    s = reducer(s, {
      type: "pedido/confirmacionCliente",
      nro: p.nro,
      fecha: "2027-03-16 09:00",
      valor: "aceptado",
    });
    expect(s.pedidos[p.nro].estado).toBe("confirmado");
  });
});

describe("RF-41 · el caso literal del audio", () => {
  // "de esas 100,000, 45,000 me las facturas a mí. De estas 25,000 me las
  // facturas a ella." — el MISMO artículo repartido entre dos RUC.
  it("reparte cantidades de un mismo SKU entre dos partidas", () => {
    let s = base();
    const p0 = Object.values(s.pedidos)[0];
    const sku = p0.items[0].sku;

    const p: PedidoDetalle = {
      ...p0,
      estado: "confirmado",
      items: [{ ...p0.items[0], cantidad: 70000, atendible: 70000, precio: 10 }],
      partidas: [
        {
          id: "1",
          ruc: "20512345671",
          razonSocial: "Yo",
          direccionId: "1",
          items: [{ sku, cantidad: 45000 }],
        },
        {
          id: "2",
          ruc: "20587654321",
          razonSocial: "Ella",
          direccionId: "2",
          items: [{ sku, cantidad: 25000 }],
        },
      ],
    };
    s = reducer(s, { type: "pedido/upsert", pedido: p });

    // El reparto cuadra exactamente con la línea del pedido.
    expect(partidasCuadran(p)).toBe(true);
    expect(unidadesDePartida(p.partidas![0])).toBe(45000);
    expect(unidadesDePartida(p.partidas![1])).toBe(25000);
    // Y cada una se valoriza a su cantidad, no al SKU completo.
    expect(importeDePartida(p, p.partidas![0])).toBe(450000);
    expect(importeDePartida(p, p.partidas![1])).toBe(250000);
  });

  it("detecta un reparto incompleto", () => {
    const s = base();
    const p0 = Object.values(s.pedidos)[0];
    const p: PedidoDetalle = {
      ...p0,
      items: [{ ...p0.items[0], cantidad: 100, atendible: 100 }],
      partidas: [
        {
          id: "1",
          ruc: "1",
          razonSocial: "A",
          direccionId: "1",
          items: [{ sku: p0.items[0].sku, cantidad: 60 }],
        },
      ],
    };
    // Faltan 40: no se puede facturar así.
    expect(partidasCuadran(p)).toBe(false);
  });
});
