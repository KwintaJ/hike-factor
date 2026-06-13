import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMapStore } from '../store/useMapStore';

interface TrailConditions {
  hikeFactor: number;
  weather: { condition: string; temp: number; wind: number; };
  precipitation24h: number;
  surface: { status: string; snowDepth: number; };
  avalancheLevel: number;
  elevation: { min: number; max: number; };
}

export const DetailsPanel: React.FC = () => {
  const selectedTrailId = useMapStore((state) => state.selectedTrailId);

  const { data, isLoading, error } = useQuery<TrailConditions>({
    queryKey: ['trailConditions', selectedTrailId],
    queryFn: async () => {
      const response = await fetch(`http://localhost:8080/api/trails/conditions?id=${selectedTrailId}`);
      if (!response.ok) throw new Error('Błąd pobierania danych');
      return response.json();
    },
    enabled: selectedTrailId !== null,
  });

  // 1. Ekran startowy (brak wybranego ID)
  if (selectedTrailId === null) {
    return (
      <div className="w-full min-h-[70px] border-2 border-dashed border-retro-green/30 rounded-xl flex items-center justify-center text-retro-blue font-bold text-sm p-4 text-center">
        📍 Wybierz szlak, aby załadować warunki
      </div>
    );
  }

  // 2. Ekran ładowania
  if (isLoading) {
    return (
      <div className="w-full min-h-[70px] border-2 border-retro-green/20 rounded-xl flex items-center justify-center text-retro-green font-bold text-sm animate-pulse p-4 text-center">
        ⏳ Serwer oblicza dane dla szlaku...
      </div>
    );
  }

  // 3. Ekran błędu
  if (error || !data) {
    return (
      <div className="w-full min-h-[70px] bg-retro-rust/10 border-2 border-retro-rust/40 rounded-xl flex items-center justify-center text-retro-rust font-bold text-sm p-4 text-center">
        ⚠️ Błąd połączenia z serwerem
      </div>
    );
  }

  // 4. KAFELKI (dane z {data})
  return (
    <div className="uppercase tracking-wide grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr gap-4 w-full">
      
      {/* KAFELEK 0: NAZWA SZLAKU */}
      <div className="col-span-full bg-retro-dark text-retro-beige py-2 px-4 rounded-xl border-2 border-retro-dark flex items-center justify-center shadow-sm">
        <h2 className="text-lg sm:text-xl font-black text-center tracking-widest">
          {data.trail_name}
        </h2>
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
          <span 
            className={`px-3 py-1 rounded-lg text-base font-black text-retro-beige shadow-sm ${
              data.surface.status.toLowerCase() === 'sucho' ? 'bg-retro-green' : 'bg-retro-rust'
            }`}
          >
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

      {/* KAFELEK 8: PROFIL (Zielony) */}
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