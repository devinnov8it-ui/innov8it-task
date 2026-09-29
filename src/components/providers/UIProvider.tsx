"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createUIStore } from "@/store/ui-store";
type UIStore = ReturnType<typeof createUIStore>;
const UIContext = createContext<UIStore | null>(null);
export function UIProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createUIStore);
  return <UIContext.Provider value={store}>{children}</UIContext.Provider>;
}
export function useUIStore<T>(
  selector: (state: ReturnType<UIStore["getState"]>) => T,
): T {
  const store = useContext(UIContext);
  if (!store) throw new Error("useUIStore must be used within UIProvider.");
  return useStore(store, selector);
}
