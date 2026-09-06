import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DemoRole = "cliente" | "vendedor" | "mesa" | "comercial";

type RoleState = {
  role: DemoRole;
  setRole: (role: DemoRole) => void;
};

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      role: "vendedor",
      setRole: (role) => set({ role }),
    }),
    { name: "boston-demo-role" }
  )
);
