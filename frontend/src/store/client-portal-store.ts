import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ClientCart = Record<string, number>;

export type ClientRequest = {
  id: string;
  createdAt: string;
  status: "enviada" | "cotizada";
  items: ClientCart;
  response?: string;
};

type ClientPortalState = {
  carts: Record<string, ClientCart>;
  requests: Record<string, ClientRequest[]>;
  setQuantity: (user: string, code: string, quantity: number) => void;
  clearCart: (user: string) => void;
  submitRequest: (user: string) => ClientRequest;
};

export const useClientPortalStore = create<ClientPortalState>()(
  persist(
    (set, get) => ({
      carts: {},
      requests: {},
      setQuantity: (user, code, quantity) => set((state) => {
        const cart = { ...(state.carts[user] ?? {}) };
        const safeQuantity = Math.max(0, Math.floor(quantity || 0));
        if (safeQuantity === 0) delete cart[code];
        else cart[code] = safeQuantity;
        return { carts: { ...state.carts, [user]: cart } };
      }),
      clearCart: (user) => set((state) => ({ carts: { ...state.carts, [user]: {} } })),
      submitRequest: (user) => {
        const request: ClientRequest = {
          id: `SC-${String(Date.now()).slice(-6)}`,
          createdAt: new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date()),
          status: "enviada",
          items: { ...(get().carts[user] ?? {}) },
        };
        set((state) => ({
          carts: { ...state.carts, [user]: {} },
          requests: { ...state.requests, [user]: [request, ...(state.requests[user] ?? [])] },
        }));
        return request;
      },
    }),
    { name: "boston-client-portal-v1" }
  )
);
