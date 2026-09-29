import { createStore } from "zustand/vanilla";

type UIState = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

// Create per provider/request; never share mutable user state across server requests.
export function createUIStore() {
  return createStore<UIState>()((set) => ({
    sidebarOpen: true,
    setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  }));
}
