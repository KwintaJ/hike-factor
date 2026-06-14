import { create } from 'zustand';

interface MapStore {
  selectedTrailId: number | null;
  isAuthView: boolean;
  favoriteTrailIds: number[]; 
  setSelectedTrailId: (id: number | null) => void;
  setAuthView: (status: boolean) => void;
  setFavoriteTrailIds: (ids: number[]) => void;
  toggleFavoriteStore: (id: number) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  selectedTrailId: null,
  isAuthView: false,
  favoriteTrailIds: [],
  setSelectedTrailId: (id) => set({ selectedTrailId: id }),
  setAuthView: (status) => set({ isAuthView: status }),
  setFavoriteTrailIds: (ids) => set({ favoriteTrailIds: ids }),
  toggleFavoriteStore: (id) => set((state) => ({
    favoriteTrailIds: state.favoriteTrailIds.includes(id)
      ? state.favoriteTrailIds.filter((fId) => fId !== id)
      : [...state.favoriteTrailIds, id]
  })),
}));