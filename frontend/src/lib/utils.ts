import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-PE").format(value);
}

/**
 * Formatea una fecha ISO `YYYY-MM-DD` como "20 ago".
 * Se parsea a mano y no con `new Date(iso)` porque ese constructor interpreta
 * la cadena como UTC, y en Lima (UTC-5) terminaría mostrando el día anterior.
 */
export function formatFechaISO(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d)
    .toLocaleDateString("es-PE", { day: "numeric", month: "short" })
    .replace(".", "");
}

export function formatDocenas(units: number): string {
  const docenas = Math.floor(units / 12);
  const resto = units % 12;
  if (resto === 0) return `${docenas} doc`;
  return `${docenas} doc + ${resto} und`;
}
