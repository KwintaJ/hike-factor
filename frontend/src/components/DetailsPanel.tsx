import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMapStore } from '../store/useMapStore';

interface DetailsPanelProps {
  trailId?: number;
  isLoggedIn: boolean;
  onTitleClick?: () => void;
}

interface TrailConditions {
  trail_name: string;
  distance: number;
  slope: string;
  hikeFactor: number;
  weather: { condition: string; temp_min: number; temp_max: number; wind: number; };
  precipitation24h: { level: number; type: string; };
  surface: { status: string; description: string; };
  avalanche: { level: number; description: string; };
  elevation: { min: number; max: number; };
}

export const DetailsPanel: React.FC<DetailsPanelProps> = ({ trailId, isLoggedIn, onTitleClick }) => {
  const globalSelectedId = useMapStore((state) => state.selectedTrailId);
  const idToUse = trailId !== undefined ? trailId : globalSelectedId;

  const favoriteTrailIds = useMapStore((state) => state.favoriteTrailIds);
  const toggleFavoriteStore = useMapStore((state) => state.toggleFavoriteStore);

  const isFavorite = idToUse !== null && favoriteTrailIds.includes(idToUse);

  const { data, isLoading, error } = useQuery<TrailConditions>({
    queryKey: ['trailConditions', idToUse],
    queryFn: async () => {
      const response = await fetch(`http://localhost:8080/api/trails/conditions?id=${idToUse}`);
      if (!response.ok) throw new Error('Błąd pobierania danych');
      return response.json();
    },
    enabled: idToUse !== null,
  });

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (idToUse === null) return;

    const token = localStorage.getItem('jwt_token');
    const method = isFavorite ? 'DELETE' : 'POST';

    try {
      const response = await fetch(`http://localhost:8080/api/favorites?id=${idToUse}`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.ok) {
        toggleFavoriteStore(idToUse);
      }
    } catch (err) {
      console.error("Problem z synchronizacją ulubionych:", err);
    }
  };

  if (idToUse === null) {
    return (
      <div className="w-full min-h-[70px] border-2 border-dashed border-retro-green/30 rounded-xl flex items-center justify-center uppercase tracking-wide text-retro-blue font-bold text-sm p-4 text-center">
        Wybierz szlak na mapie
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full min-h-[70px] border-2 border-retro-green/20 rounded-xl flex items-center justify-center uppercase tracking-wide text-retro-green font-bold text-sm animate-pulse p-4 text-center">
        Serwer ładuje dane...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full min-h-[70px] bg-retro-rust/10 border-2 border-retro-rust/40 rounded-xl flex items-center uppercase tracking-wide justify-center text-retro-rust font-bold text-sm p-4 text-center">
        Błąd połączenia z serwerem
      </div>
    );
  }

  return (
    <div className="uppercase tracking-wide grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr gap-4 w-full mb-6">
      
      {/* KAFELEK 0: NAZWA SZLAKU */}
      <div className="col-span-full bg-retro-dark py-3 px-4 rounded-xl border-2 border-retro-dark flex items-center justify-center shadow-sm relative">
        <h2 
          onClick={onTitleClick}
          className={`text-lg sm:text-xl font-black text-retro-beige text-center tracking-widest ${
            onTitleClick ? 'cursor-pointer hover:text-retro-orange transition-colors' : ''
          }`}
        >
          {data.trail_name}
        </h2>

        {isLoggedIn && (
          <button
            onClick={handleFavoriteToggle}
            className="absolute right-4 p-1 focus:outline-none transition-transform active:scale-95"
            title={isFavorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
          >
            {isFavorite ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-retro-yellow">
                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-retro-beige/40 hover:text-retro-beige transition-colors">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.151-.326.622-.326.774 0l2.03 4.364 4.743.43c.36.032.503.475.234.724l-3.522 3.256.958 4.677c.073.355-.308.632-.613.441L12 15.022l-4.114 2.31c-.305.191-.686-.086-.613-.441l.958-4.677-3.522-3.256c-.269-.249-.126-.692.234-.723l4.743-.431 2.03-4.364Z" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* KAFELEK 1: HIKE FACTOR */}
      <div className="bg-retro-dark/10 border-2 border-retro-dark/40 p-4 rounded-xl flex items-center justify-between min-h-[105px]">
        <div>
          <h3 className="text-lg font-bold text-retro-dark">Hike Factor</h3>
        </div>
        <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black shadow-md ${
          data.hikeFactor >= 9 ? 'bg-retro-green text-retro-beige' :
          data.hikeFactor >= 7 ? 'bg-retro-yellow text-retro-dark' :
          data.hikeFactor >= 4 ? 'bg-retro-orange text-retro-beige' :
          'bg-retro-rust text-retro-beige'
        }`}>
          {data.hikeFactor}
        </div>
      </div>

      {/* KAFELEK 2: POGODA */}
      <div className="bg-retro-yellow/10 border-2 border-retro-yellow/40 p-4 rounded-xl flex flex-col justify-between min-h-[105px]">
        <span className="text-xs font-bold text-retro-yellow">Pogoda</span>
        <div className="mt-2">
          <span className="text-base leading-tight font-black text-retro-yellow-dark">{data.weather.condition}</span>
        </div>
      </div>

      {/* KAFELEK 3: TEMPERATURA */}
      <div className="bg-retro-orange/10 border-2 border-retro-orange/40 p-4 rounded-xl flex flex-col justify-between min-h-[105px]">
        <span className="text-xs font-bold text-retro-orange">Temperatura</span>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-retro-orange-dark">{data.weather.temp_min}°C</span>
          <span className="text-xl font-bold text-retro-orange">- {data.weather.temp_max}°C</span>
        </div>
      </div>

      {/* KAFELEK 4: WIATR */}
      <div className="bg-retro-teal/10 border-2 border-retro-teal/40 p-4 rounded-xl flex flex-col justify-between min-h-[105px]">
        <span className="text-xs font-bold text-retro-teal">Wiatr</span>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-retro-teal-dark">{data.weather.wind}</span>
          <span className="text-xl font-bold text-retro-teal">km/h</span>
        </div>
      </div>

      {/* KAFELEK 5: OPADY */}
      <div className="bg-retro-blue/10 border-2 border-retro-blue/40 p-4 rounded-xl flex flex-col justify-between min-h-[105px]">
        <span className="text-xs font-bold text-retro-blue">Opady</span>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-retro-blue-dark">{data.precipitation24h.level}</span>
          <span className="text-xl font-bold text-retro-blue">mm {data.precipitation24h.type}</span>
        </div>
      </div>

      {/* KAFELEK 6: NAWIERZCHNIA */}
      <div className="bg-retro-brown/10 border-2 border-retro-brown/40 p-4 rounded-xl flex flex-col justify-between min-h-[105px]">
        <span className="text-xs font-bold text-retro-brown">Nawierzchnia szlaku</span>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className={`px-3 py-1 rounded-lg text-base font-black text-retro-beige shadow-sm ${
            data.surface.status.toLowerCase() === 'sucho' ? 'bg-retro-green' : 'bg-retro-rust'
          }`}>
            {data.surface.status}
          </span>
          <span className="text-base font-bold text-retro-brown-dark text-right">{data.surface.description}</span>
        </div>
      </div>

      {/* KAFELEK 7: STOPIEŃ LAWINOWY */}
      <div className="bg-retro-purple/10 border-2 border-retro-purple/40 p-4 rounded-xl flex flex-col justify-between min-h-[105px]">
        <span className="text-xs font-bold text-retro-purple">Stopień lawinowy</span>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black shadow-sm ${
            data.avalanche.level == 0 ? 'bg-retro-green text-retro-beige' : 
            data.avalanche.level == 1 ? 'bg-retro-yellow text-retro-dark' : 
            data.avalanche.level == 2 ? 'bg-retro-orange text-retro-beige' : 
            'bg-retro-rust text-retro-beige'
          }`}>
            {data.avalanche.level}
          </span>
          <span className="text-base font-bold text-retro-purple-dark text-right">
            {data.avalanche.description}
          </span>
        </div>
      </div>

      {/* KAFELEK 8: PROFIL */}
      <div className="sm:col-span-2 lg:col-span-2 bg-retro-green/10 border-2 border-retro-green/40 p-4 rounded-xl flex flex-col justify-between min-h-[105px]">
        <span className="text-xs font-bold text-retro-green">Profil trasy</span>
        <div className="mt-2 flex items-center justify-between gap-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-retro-green-dark">{data.distance}</span>
            <span className="text-xl font-bold text-retro-green">km</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-retro-green-dark">{data.elevation.min} - </span>
            <span className="text-3xl font-black text-retro-rust whitespace-nowrap"> {data.elevation.max} </span>
            <span className="text-xl font-black text-retro-dark whitespace-nowrap"> m n.p.m.</span>
          </div>
          <div className="flex items-baseline">
            <span className={`px-3 py-1.5 rounded-lg text-base font-black shadow-sm whitespace-nowrap ${
              data.slope === "Bardzo stromo" ? "bg-retro-rust text-white" :
              data.slope === "Stromo" ? "bg-retro-orange text-white" :
              data.slope === "Lekkie nachylenie" ? "bg-retro-yellow text-retro-dark" :
              "bg-retro-green text-retro-beige"
            }`}>
              {data.slope}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};