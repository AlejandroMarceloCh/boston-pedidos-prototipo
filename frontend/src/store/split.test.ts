// Recorrido completo del split, como lo haría un vendedor.
import { describe, it, expect } from "vitest";
import { semilla } from "@/store/semilla";
import { reducer } from "@/store/app-store";
import { reservasPorSku, disponibleDe, nroSolicitudDe, kpis, resumenesPedidos, resumenesSolicitudes } from "@/store/selectors";

describe("e2e · pedir 500 cuando hay 20", () => {
  it("genera pedido de lo que hay y solicitud del resto, y el stock cuadra", () => {
    let s = semilla(new Date(2027, 2, 15, 12, 0));
    const b = Object.values(s.pedidos).find((p) => p.estado === "borrador")!;
    const sku = b.items[0].sku;
    const hay = disponibleDe(sku, reservasPorSku(s));

    // El vendedor pide 500 de un SKU del que hay `hay`.
    s = reducer(s, {
      type: "pedido/upsert",
      pedido: { ...b, items: [{ ...b.items[0], cantidad: 500 }] },
    });

    const reservas = reservasPorSku(s);
    const atendible = Math.min(500, disponibleDe(sku, reservas));
    const excedente = 500 - atendible;

    s = reducer(s, {
      type: "pedido/confirmar",
      nro: b.nro,
      fecha: "2027-03-15 10:00",
    });

    const pedido = s.pedidos[b.nro];
    const solicitud = s.pedidos[nroSolicitudDe(b.nro)];

    // 1. Dos documentos vinculados
    expect(pedido.tipo).toBe("pedido");
    expect(solicitud.tipo).toBe("solicitud");
    expect(pedido.documentoHermano).toBe(solicitud.nro);

    // 2. Nada se perdió: lo pedido = lo atendido + lo solicitado
    expect(pedido.items[0].cantidad + solicitud.items[0].cantidad).toBe(500);
    expect(pedido.items[0].cantidad).toBe(hay);

    // 3. El stock se reservó solo por lo atendible
    expect(disponibleDe(sku, reservasPorSku(s))).toBe(0);

    // 4. Los listados los separan
    expect(resumenesPedidos(s).some((p) => p.nro === pedido.nro)).toBe(true);
    expect(resumenesSolicitudes(s).map((p) => p.nro)).toEqual([solicitud.nro]);

    // 5. La solicitud no cuenta como venta
    expect(kpis(s, reservasPorSku(s)).solicitudesPendientes).toBe(1);

    // 6. Anular el pedido devuelve el stock, y la solicitud sigue viva
    s = reducer(s, { type: "pedido/anular", nro: pedido.nro, fecha: "2027-03-15 12:00" });
    expect(disponibleDe(sku, reservasPorSku(s))).toBe(hay);
    expect(s.pedidos[solicitud.nro].estadoSolicitud).toBe("pendiente");
  });
});

describe("RF-21 · atender una solicitud aprobada", () => {
  it("crea el pedido que la cumple y reserva stock", () => {
    let s = semilla(new Date(2027, 2, 15, 12, 0));
    const b = Object.values(s.pedidos).find((p) => p.estado === "borrador")!;
    const sku = b.items[0].sku;
    const disp = disponibleDe(sku, reservasPorSku(s));

    // Se pide de más y se confirma: nace la solicitud.
    s = reducer(s, {
      type: "pedido/upsert",
      pedido: { ...b, items: [{ ...b.items[0], cantidad: disp + 24 }] },
    });
    s = reducer(s, { type: "pedido/confirmar", nro: b.nro, fecha: "2027-03-15 10:00" });
    const nroSol = nroSolicitudDe(b.nro);
    expect(s.pedidos[nroSol].estadoSolicitud).toBe("pendiente");

    // Aprobar sola no atiende nada.
    s = reducer(s, {
      type: "solicitud/resolver",
      nro: nroSol,
      fecha: "2027-03-16 09:00",
      decision: "aprobada",
      fechaEntrega: "2027-04-01",
    });
    expect(s.pedidos[nroSol].fechaEntrega).toBe("2027-04-01");

    // Llega reposición: se anula el pedido original para liberar stock.
    s = reducer(s, { type: "pedido/anular", nro: b.nro, fecha: "2027-03-17 09:00" });

    // Ahora atenderla crea un pedido confirmado de verdad.
    s = reducer(s, {
      type: "solicitud/atender",
      nro: nroSol,
      fecha: "2027-03-17 10:00",
      nroPedido: "2027-0317-500",
    });
    const nuevo = s.pedidos["2027-0317-500"];
    expect(nuevo).toBeDefined();
    expect(nuevo.tipo).toBe("pedido");
    expect(nuevo.estado).toBe("confirmado");
    expect(nuevo.documentoHermano).toBe(nroSol);
    expect(s.pedidos[nroSol].estadoSolicitud).toBe("atendida");
    // Y ahora sí reserva stock, cosa que la solicitud nunca hizo.
    expect(reservasPorSku(s).get(sku)).toBe(nuevo.items[0].cantidad);
  });

  it("no se puede atender una solicitud que no fue aprobada", () => {
    let s = semilla(new Date(2027, 2, 15, 12, 0));
    const b = Object.values(s.pedidos).find((p) => p.estado === "borrador")!;
    const sku = b.items[0].sku;
    const disp = disponibleDe(sku, reservasPorSku(s));
    s = reducer(s, {
      type: "pedido/upsert",
      pedido: { ...b, items: [{ ...b.items[0], cantidad: disp + 24 }] },
    });
    s = reducer(s, { type: "pedido/confirmar", nro: b.nro, fecha: "2027-03-15 10:00" });

    const d = reducer(s, {
      type: "solicitud/atender",
      nro: nroSolicitudDe(b.nro),
      fecha: "2027-03-17 10:00",
      nroPedido: "2027-0317-500",
    });
    expect(d.pedidos["2027-0317-500"]).toBeUndefined();
  });
});
