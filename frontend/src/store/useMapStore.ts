import { create } from 'zustand';

interface MapStore {
  selectedTrailId: number | null;
  isAuthView: boolean;
  setSelectedTrailId: (id: number | null) => void;
  setAuthView: (status: boolean) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  selectedTrailId: null,
  isAuthView: false,
  setSelectedTrailId: (id) => set({ selectedTrailId: id }),
  setAuthView: (status) => set({ isAuthView: status }),
}));