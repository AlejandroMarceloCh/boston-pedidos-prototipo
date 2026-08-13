// RF-41 + RF-42 · Facturación partida y multi-destino.
// La invariante que importa: la suma de las partidas es el total del pedido.
// Facturar de más, o dejar items fuera de toda factura, no es cosmético.
import { describe, it, expect } from "vitest";
import { semilla } from "@/store/semilla";
import { reducer } from "@/store/app-store";
import {
  partidasDe,
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
      skus: original.items.slice(0, 2).map((i) => i.sku),
    },
    {
      id: "2",
      ruc: "20587654321",
      razonSocial: "Confecciones Textiles Perú EIRL",
      direccionId: "2",
      skus: original.items.slice(2).map((i) => i.sku),
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
    expect(partidas[0].skus).toEqual(p.items.map((i) => i.sku));
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
    const asignados = p.partidas!.flatMap((par) => par.skus);
    expect(asignados).toHaveLength(p.items.length);
    expect(new Set(asignados).size).toBe(p.items.length);
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
    s = reducer(s, { type: "pedido/entregar", nro, fecha: "2027-03-17 10:00" });
    expect(s.pedidos[nro].estado).toBe("entregado");

    // Y anular sigue liberando: las partidas no alteran el ciclo de vida.
    s = reducer(s, { type: "pedido/anular", nro, fecha: "2027-03-17 11:00" });
    expect(s.pedidos[nro].estado).toBe("anulado");
    expect(s.pedidos[nro].partidas).toHaveLength(2);
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
