import { create } from 'zustand';

export interface ViewState {
  grid: boolean;
  rulers: boolean;
  snap: boolean;
  gridSpacing: number;
  /** Scale at which the slide fits the workspace; the displayed scale is `fitScale * zoom`. */
  fitScale: number;
  /** Incremented to ask the canvas to fit the slide and reset panning and scrolling. */
  fitRequest: number;
  setGrid: (visible: boolean) => void;
  setRulers: (visible: boolean) => void;
  setSnap: (enabled: boolean) => void;
  setGridSpacing: (spacing: number) => void;
  setFitScale: (scale: number) => void;
  requestFit: () => void;
  toggleGrid: () => void;
  toggleRulers: () => void;
  toggleSnap: () => void;
}

export const useView = create<ViewState>((set) => ({
  grid: false,
  rulers: true,
  snap: true,
  gridSpacing: 24,
  fitScale: 1,
  fitRequest: 0,
  setGrid: grid => set({ grid }),
  setRulers: rulers => set({ rulers }),
  setSnap: snap => set({ snap }),
  setGridSpacing: gridSpacing => {
    if (Number.isFinite(gridSpacing)) set({ gridSpacing: Math.max(4, Math.min(240, gridSpacing)) });
  },
  setFitScale: fitScale => {
    if (Number.isFinite(fitScale) && fitScale > 0) set({ fitScale });
  },
  requestFit: () => set(state => ({ fitRequest: state.fitRequest + 1 })),
  toggleGrid: () => set(state => ({ grid: !state.grid })),
  toggleRulers: () => set(state => ({ rulers: !state.rulers })),
  toggleSnap: () => set(state => ({ snap: !state.snap })),
}));
