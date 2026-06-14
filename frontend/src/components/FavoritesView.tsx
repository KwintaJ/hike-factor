import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DetailsPanel } from './DetailsPanel';
import { useMapStore } from '../store/useMapStore';

interface FavoritesViewProps {
  onViewChange: (view: string) => void;
  isLoggedIn: boolean;
}

interface FavoriteItem {
  id: number;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({ onViewChange, isLoggedIn }) => {
  const setSelectedTrailId = useMapStore((state) => state.setSelectedTrailId);

  const { data: favorites, isLoading, error } = useQuery<FavoriteItem[]>({
    queryKey: ['favoriteTrailsList'],
    queryFn: async () => {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch('http://localhost:8080/api/favorites', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Nie udało się pobrać ulubionych szlaków');
      return response.json();
    },
    enabled: isLoggedIn,
  });

  const viewWrapperClass = "w-full min-h-screen pt-28 pb-16 px-4 md:px-8 flex flex-col items-center";

  if (isLoading) {
    return (
      <div className={viewWrapperClass}>
        <div className="w-full text-center text-retro-green font-bold animate-pulse uppercase tracking-wider py-10">
          Ładowanie listy ulubionych szlaków...
        </div>
      </div>
    );
  }

  if (error || !favorites || favorites.length === 0) {
    return (
      <div className={viewWrapperClass}>
        <div className="w-full max-w-4xl text-center text-retro-brown font-bold uppercase tracking-wider py-10 bg-white/50 rounded-xl border border-dashed border-retro-brown/30">
          Brak ulubionych szlaków na Twojej liście.
        </div>
      </div>
    );
  }

  return (
    <div className={viewWrapperClass}>
      <div className="w-full flex flex-col gap-6">
        
        <h2 className="text-xl font-black text-retro-dark mb-2 tracking-widest uppercase text-center sm:text-left">
          Twoje ulubione szlaki ({favorites.length})
        </h2>
        
        <div className="w-full flex flex-col gap-8">
          {favorites.map((trail) => (
            <div key={trail.id} className="border-b-2 border-retro-brown/10 pb-6 last:border-none">
              <DetailsPanel 
                trailId={trail.id} 
                isLoggedIn={isLoggedIn}
                onTitleClick={() => {
                  setSelectedTrailId(trail.id);
                  onViewChange('home');
                }}
              />
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};