/**
 * El recorrido real del vendedor, hecho con clics.
 *
 * Por qué existe este archivo: había 53 tests verdes mientras confirmar un
 * pedido nuevo no confirmaba nada. Todos llamaban al reducer directamente, y
 * el defecto estaba en que la PANTALLA no llegaba a llamarlo. Ningún test de
 * lógica podía verlo; una auditoría en navegador lo encontró en minutos.
 *
 * Estos tests montan la aplicación de verdad y la operan como un usuario.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppStoreProvider } from "@/store/app-store";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "@/App";

/** Monta la aplicación completa en una ruta, con sesión ya abierta. */
function montar(ruta: string) {
  // El guard de ruta exige sesión; se abre por el store, no por la pantalla
  // de login, para que cada test empiece donde le interesa.
  localStorage.setItem(
    "boston.pedidos.v1",
    JSON.stringify({
      ...JSON.parse(localStorage.getItem("boston.pedidos.v1") ?? "{}"),
      version: 1,
      pedidos: {},
      borradorActivo: null,
      sesion: "vendedor.boston",
    })
  );
  return {
    user: userEvent.setup(),
    ...render(
      <AppStoreProvider>
        <TooltipProvider>
          <MemoryRouter initialEntries={[ruta]}>
            <App />
          </MemoryRouter>
        </TooltipProvider>
      </AppStoreProvider>
    ),
  };
}

/** Lo que el store dejó guardado, que es la única prueba de que algo pasó. */
function guardado() {
  return JSON.parse(localStorage.getItem("boston.pedidos.v1") ?? "{}");
}

describe("armar y confirmar un pedido, como lo hace un vendedor", () => {
  beforeEach(() => localStorage.clear());

  it("un pedido nuevo queda CONFIRMADO, no en borrador", async () => {
    const { user } = montar("/pedidos/nuevo");

    // Paso 1 · elegir cliente
    const clientes = await screen.findAllByRole("button", { name: /Cliente Demo/i });
    await user.click(clientes[0]);
    await user.click(screen.getByRole("button", { name: /Continuar al paso 2/i }));

    // Paso 2 · agregar un artículo desde el catálogo
    await user.click(await screen.findByRole("button", { name: /Agregar producto/i }));
    const modal = await screen.findByRole("dialog");
    const articulos = within(modal).getAllByRole("button", { name: /^Artículo \d+,/i });
    await user.click(articulos[0]);

    // Cargar una docena en la primera celda con stock
    const celdas = within(await screen.findByRole("dialog")).getAllByRole("textbox", {
      name: /Docenas de/i,
    });
    const libre = celdas.find((c) => !(c as HTMLInputElement).disabled)!;
    await user.type(libre, "1");
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /Agregar \d+ unidades/i })
    );

    // Paso 3 · descuentos
    await user.click(await screen.findByRole("button", { name: /Continuar al paso 3/i }));
    // Paso 4 · confirmar
    await user.click(await screen.findByRole("button", { name: /Continuar al paso 4/i }));

    // Fecha de entrega comprometida, obligatoria
    const fecha = await screen.findByLabelText(/Fecha de entrega comprometida/i);
    await user.type(fecha, "2027-12-20");

    await user.click(screen.getByRole("button", { name: /Confirmar pedido, abrir/i }));
    const dialogo = await screen.findByRole("dialog");
    await user.type(within(dialogo).getByRole("textbox"), "CONFIRMAR");
    await user.click(within(dialogo).getByRole("button", { name: /^Confirmar$/i }));

    // Lo único que prueba que pasó algo: el estado guardado.
    await waitFor(() => {
      const pedidos = Object.values(guardado().pedidos ?? {}) as { estado: string }[];
      expect(pedidos.length).toBeGreaterThan(0);
      // Este era el defecto: la interfaz anunciaba éxito y esto decía "borrador".
      expect(pedidos.some((p) => p.estado === "confirmado")).toBe(true);
    });
  }, 30_000);

  it("la condición de venta elegida se guarda, no se pierde", async () => {
    const { user } = montar("/pedidos/nuevo");

    const clientes = await screen.findAllByRole("button", { name: /Cliente Demo/i });
    await user.click(clientes[0]);
    await user.click(screen.getByRole("button", { name: /Continuar al paso 2/i }));

    await user.click(await screen.findByRole("button", { name: /Agregar producto/i }));
    const modal = await screen.findByRole("dialog");
    await user.click(within(modal).getAllByRole("button", { name: /^Artículo \d+,/i })[0]);
    const celdas = within(await screen.findByRole("dialog")).getAllByRole("textbox", {
      name: /Docenas de/i,
    });
    await user.type(celdas.find((c) => !(c as HTMLInputElement).disabled)!, "1");
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /Agregar \d+ unidades/i })
    );

    await user.click(await screen.findByRole("button", { name: /Continuar al paso 3/i }));
    await user.click(await screen.findByRole("button", { name: /Continuar al paso 4/i }));

    // Obsequio: no debe cobrarse ni perderse
    const condicion = await screen.findByLabelText(/Condición de venta/i);
    await user.selectOptions(condicion, "O");
    await user.type(await screen.findByLabelText(/Fecha de entrega/i), "2027-12-20");

    await user.click(screen.getByRole("button", { name: /^Guardar borrador$/i }));

    await waitFor(() => {
      const pedidos = Object.values(guardado().pedidos ?? {}) as {
        condicion: string;
        total: number;
      }[];
      const p = pedidos[0];
      expect(p).toBeDefined();
      // Antes se guardaba siempre "L" y con total cobrado.
      expect(p.condicion).toBe("O");
      expect(p.total).toBe(0);
    });
  }, 30_000);
});

describe("lo que la interfaz promete tiene que ser cierto", () => {
  beforeEach(() => localStorage.clear());

  it("el catálogo alimenta un borrador real, no solo un aviso", async () => {
    const { user } = montar("/catalogo");

    await user.click((await screen.findAllByRole("button", { name: /Art\. \d+/i }))[0]);
    const celdas = within(await screen.findByRole("dialog")).getAllByRole("textbox", {
      name: /Docenas de/i,
    });
    await user.type(celdas.find((c) => !(c as HTMLInputElement).disabled)!, "2");
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /Agregar \d+ unidades/i })
    );

    await waitFor(() => {
      const pedidos = Object.values(guardado().pedidos ?? {}) as {
        items: unknown[];
      }[];
      // Antes esto era solo un toast: nada quedaba guardado.
      expect(pedidos.length).toBe(1);
      expect(pedidos[0].items.length).toBeGreaterThan(0);
    });
  }, 30_000);

  it("sin sesión, /dashboard manda al login", async () => {
    localStorage.clear();
    render(
      <AppStoreProvider>
        <TooltipProvider>
          <MemoryRouter initialEntries={["/dashboard"]}>
            <App />
          </MemoryRouter>
        </TooltipProvider>
      </AppStoreProvider>
    );
    // La pantalla de login, no el dashboard.
    expect(await screen.findByLabelText(/Usuario/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Contraseña/i)).not.toBeInTheDocument();
  });
});
