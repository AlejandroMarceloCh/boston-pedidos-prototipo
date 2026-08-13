// Matriz de carga color × talla: una celda por SKU, cantidades en DOCENAS.
//
// Es la única implementación: antes existía una copia divergente en la página
// de catálogo que cargaba en unidades y no tenía totales ni navegación por
// teclado. Cualquier cambio de comportamiento se hace acá y vale para los dos
// lugares donde se arma un pedido.
import { Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { COLORS, type Articulo, type Sku } from "@/lib/mock-data";
import { useStock } from "@/store/hooks";
import { calcularTotales } from "@/lib/pedido-calc";

/** Debajo de esta cantidad de unidades el stock se marca como escaso. */
const UMBRAL_ESCASO = 48;

export type MatrizProps = {
  art: Articulo;
  skus: Sku[];
  /** Docenas cargadas por SKU. */
  cants: Record<string, number>;
  setCants: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  /** Unidades que ese SKU ya tiene en el pedido en curso, para mostrar "+Nd". */
  enPedido?: Record<string, number>;
};

export function MatrizCarga({ art, skus, cants, setCants, enPedido = {} }: MatrizProps) {
  const { disponible } = useStock();

  // Totales por eje, para la fila de cierre.
  const docPorTalla: Record<string, number> = {};
  for (const [codigo, d] of Object.entries(cants)) {
    if (d <= 0) continue;
    const s = skus.find((x) => x.codigo === codigo);
    if (!s) continue;
    docPorTalla[s.talla] = (docPorTalla[s.talla] ?? 0) + d;
  }

  // Navegación tipo hoja de cálculo entre celdas.
  const moverFoco = (e: React.KeyboardEvent<HTMLInputElement>, ci: number, ti: number) => {
    const salto: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      Enter: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const mov = salto[e.key];
    if (!mov) return;
    // Las flechas horizontales solo saltan de celda si el cursor está en el
    // borde del texto; si no, mueven el cursor dentro del input.
    if (e.key === "ArrowLeft" && e.currentTarget.selectionStart !== 0) return;
    if (
      e.key === "ArrowRight" &&
      e.currentTarget.selectionStart !== e.currentTarget.value.length
    )
      return;
    const destino = document.querySelector<HTMLInputElement>(
      `[data-celda="${ci + mov[0]}-${ti + mov[1]}"]`
    );
    if (!destino || destino.disabled) return;
    e.preventDefault();
    destino.focus();
    destino.select();
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left font-medium text-[12px] text-muted-foreground px-4 py-3 min-w-[150px]">
                Color
              </th>
              {art.tallas.map((t) => (
                <th
                  key={t}
                  className="text-center font-medium text-[13px] py-3 px-2 min-w-[92px] tabular"
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {art.colores.map((cc, ci) => {
              const color = COLORS[cc];
              return (
                <tr key={cc} className="border-b border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-6 w-6 rounded-full border border-black/10 shrink-0 shadow-subtle"
                        style={{ backgroundColor: color.hex }}
                        aria-hidden="true"
                      />
                      <span className="flex flex-col leading-tight">
                        <span className="text-[13.5px] font-semibold">{color.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {cc}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground/70">
                          {color.hex}
                        </span>
                      </span>
                    </div>
                  </td>

                  {art.tallas.map((talla, ti) => {
                    const sku = skus.find((s) => s.talla === talla && s.color === cc);
                    if (!sku) return <td key={talla} />;
                    const avail = disponible(sku.codigo);
                    const sinStock = avail <= 0;
                    const maxDoc = Math.floor(avail / 12);
                    const doc = cants[sku.codigo] ?? 0;
                    const yaEnPedido = enPedido[sku.codigo] ?? 0;
                    const escaso = !sinStock && avail < UMBRAL_ESCASO;

                    return (
                      <td key={talla} className="px-2 py-3 align-top">
                        {/* El disponible se lee como texto: es el dato que el
                            vendedor consulta antes de decidir la cantidad. */}
                        <p
                          className={cn(
                            "text-center text-[11px] tabular mb-1.5",
                            sinStock
                              ? "text-muted-foreground/50"
                              : escaso
                                ? "text-warning font-medium"
                                : "text-muted-foreground"
                          )}
                        >
                          {sinStock ? "sin stock" : `${avail} disp.`}
                          {yaEnPedido > 0 && (
                            <span className="text-primary font-semibold">
                              {" "}
                              · +{Math.round(yaEnPedido / 12)}d
                            </span>
                          )}
                        </p>
                        <input
                          data-celda={`${ci}-${ti}`}
                          value={doc || ""}
                          placeholder="—"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          aria-label={`Docenas de ${color.name} talla ${talla}. ${avail} unidades disponibles, máximo ${maxDoc} docenas`}
                          title={
                            sinStock
                              ? "Sin stock"
                              : `${doc} doc = ${doc * 12} und · máx ${maxDoc} doc (${avail} disponibles)`
                          }
                          onKeyDown={(e) => moverFoco(e, ci, ti)}
                          onChange={(e) =>
                            setCants((p) => ({
                              ...p,
                              [sku.codigo]: Math.max(
                                0,
                                Math.min(
                                  maxDoc,
                                  parseInt(e.target.value.replace(/[^\d]/g, "") || "0", 10)
                                )
                              ),
                            }))
                          }
                          disabled={sinStock}
                          className={cn(
                            "tabular w-full h-10 text-center text-[14px] rounded-lg border transition-colors",
                            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary",
                            doc > 0
                              ? "border-primary bg-primary/[0.07] text-primary font-semibold"
                              : "border-border bg-surface placeholder:text-muted-foreground/40",
                            "disabled:cursor-not-allowed disabled:bg-secondary/40 disabled:border-transparent"
                          )}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-secondary/50">
              <th className="text-left font-semibold text-[13px] px-4 py-3">
                Total por talla
              </th>
              {art.tallas.map((t) => (
                <td key={t} className="text-center py-3 px-2">
                  <span
                    className={cn(
                      "tabular text-[15px]",
                      (docPorTalla[t] ?? 0) > 0
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground/50"
                    )}
                  >
                    {docPorTalla[t] ?? 0}
                  </span>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="flex items-center gap-2 px-4 py-3 text-[12px] text-muted-foreground">
        <Keyboard className="h-4 w-4 shrink-0" aria-hidden="true" />
        Ingresa docenas
        <span className="text-muted-foreground/50">·</span>
        Usa Tab o las flechas para avanzar
      </p>
    </div>
  );
}

/**
 * Panel de resumen que acompaña a la matriz: qué se lleva seleccionado y el
 * subtotal, con la acción principal al lado del número que la justifica.
 */
export function ResumenSeleccion({
  skus,
  cants,
  onLimpiar,
  children,
}: {
  skus: Sku[];
  cants: Record<string, number>;
  onLimpiar: () => void;
  /** Acción principal (Agregar al pedido). */
  children: React.ReactNode;
}) {
  const entradas = Object.entries(cants).filter(([, d]) => d > 0);
  const variantes = entradas.length;
  const docenas = entradas.reduce((a, [, d]) => a + d, 0);
  const unidades = docenas * 12;
  // RNF-05: el importe sale del cálculo central, igual que en el resto del
  // sistema. Acá las celdas ya están topeadas al stock, así que no hay saldo,
  // pero la fórmula debe ser una sola de todos modos.
  const subtotal = calcularTotales(
    entradas.map(([codigo, d]) => ({
      cantidad: d * 12,
      precio: skus.find((s) => s.codigo === codigo)?.precio ?? 0,
    })),
    { aplicarInicial: false, slot3: 0 }
  ).subtotal;

  return (
    <aside className="flex flex-col gap-5 p-6 bg-background border-t md:border-t-0 md:border-l border-border">
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight">Selección</h3>
        <ul className="mt-3 space-y-1.5 text-[13px] text-muted-foreground">
          <li>
            <span className="tabular font-medium text-foreground">{variantes}</span>{" "}
            {variantes === 1 ? "variante" : "variantes"}
          </li>
          <li>
            <span className="tabular font-medium text-foreground">{docenas}</span>{" "}
            {docenas === 1 ? "docena" : "docenas"}
          </li>
          <li>
            <span className="tabular font-medium text-foreground">{unidades}</span> unidades
          </li>
        </ul>
      </div>

      <div className="border-t border-border pt-5">
        <p className="text-[13px] text-muted-foreground">Subtotal</p>
        <p className="mt-1 tabular text-[28px] font-semibold tracking-tight leading-none">
          {new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency: "PEN",
            minimumFractionDigits: 2,
          }).format(subtotal)}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {children}
        {variantes > 0 && (
          <button
            onClick={onLimpiar}
            className="text-[13px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Limpiar selección
          </button>
        )}
      </div>
    </aside>
  );
}
