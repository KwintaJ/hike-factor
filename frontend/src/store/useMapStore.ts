import { create } from 'zustand';

interface MapState {
  selectedTrailId: number | null;
  setSelectedTrailId: (id: number | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  selectedTrailId: null,
  setSelectedTrailId: (id) => set({ selectedTrailId: id }),
}));