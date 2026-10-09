import { create } from 'zustand';

export interface ViewState {
  grid: boolean;
  rulers: boolean;
  snap: boolean;
  gridSpacing: number;
  setGrid: (visible: boolean) => void;
  setRulers: (visible: boolean) => void;
  setSnap: (enabled: boolean) => void;
  setGridSpacing: (spacing: number) => void;
  toggleGrid: () => void;
  toggleRulers: () => void;
  toggleSnap: () => void;
}

export const useView = create<ViewState>((set) => ({
  grid: false,
  rulers: true,
  snap: true,
  gridSpacing: 24,
  setGrid: grid => set({ grid }),
  setRulers: rulers => set({ rulers }),
  setSnap: snap => set({ snap }),
  setGridSpacing: gridSpacing => {
    if (Number.isFinite(gridSpacing)) set({ gridSpacing: Math.max(4, Math.min(240, gridSpacing)) });
  },
  toggleGrid: () => set(state => ({ grid: !state.grid })),
  toggleRulers: () => set(state => ({ rulers: !state.rulers })),
  toggleSnap: () => set(state => ({ snap: !state.snap })),
}));
