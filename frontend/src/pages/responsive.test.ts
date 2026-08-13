// RF-15 · guardarraíl contra la regresión que dejó el asistente sin salida en
// móvil y tablet: el panel lateral era `hidden lg:flex` y el footer renderizaba
// un espaciador vacío, así que bajo 1024px no había forma de continuar.
//
// Inspecciona el fuente en vez de renderizar: el proyecto no tiene jsdom ni
// testing-library, y montar esa infraestructura para tres aserciones sería
// desproporcionado. Es frágil ante refactors, pero atrapa exactamente el
// descuido que ocurrió.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const wizard = readFileSync("src/pages/armado-pedido.tsx", "utf-8");

const matriz = readFileSync("src/features/pedidos/matriz-carga.tsx", "utf-8");

describe("RF-15 · la matriz es usable en celular", () => {
  it("hay una vista por color para pantallas chicas", () => {
    // Una tabla de 8 tallas pide ~900px: en celular obligaba a desplazarse
    // en dos ejes a la vez.
    expect(matriz).toContain("sm:hidden");
    expect(matriz).toContain("hidden sm:block overflow-x-auto");
  });

  it("el aviso de atajos de teclado no se muestra en celular", () => {
    expect(matriz).toContain('className="hidden sm:flex items-center gap-2 px-4 py-3');
  });
});

describe("RF-15 · el paso de items no puede ser un callejón sin salida", () => {
  it("el footer ofrece Continuar en el paso 1 por debajo de lg", () => {
    // Antes había un espaciador vacío: <span className="w-[104px]" />
    expect(wizard).not.toContain('w-[104px]');
    const bloque = wizard.slice(wizard.indexOf("{paso === 1 ? ("), wizard.indexOf("{paso === 1 ? (") + 900);
    expect(bloque).toContain("lg:hidden");
    expect(bloque).toContain("Continuar");
  });

  it("el panel de resumen se renderiza también en móvil", () => {
    expect(wizard).not.toContain('hidden lg:flex flex-col gap-5 p-7');
  });

  it("las acciones del panel se ocultan bajo lg para no duplicar el footer", () => {
    expect(wizard).toContain('hidden lg:flex flex-col gap-3');
  });
});
