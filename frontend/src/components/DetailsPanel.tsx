import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMapStore } from '../store/useMapStore'; // Import Twojego store

interface TrailConditions {
  hikeFactor: number;
  weather: { condition: string; temp: number; wind: number; };
  precipitation24h: number;
  surface: { status: string; snowDepth: number; };
  avalancheLevel: number;
  elevation: { min: number; max: number; };
}

export const DetailsPanel: React.FC = () => {
  // Pobieramy ID z Twojego store'a (ustawianego przez kliknięcie na mapie)
  const selectedTrailId = useMapStore((state) => state.selectedTrailId);

  const { data, isLoading, error } = useQuery<TrailConditions>({
    queryKey: ['trailConditions', selectedTrailId],
    queryFn: async () => {
      // Backend w Go teraz obsługuje parametry typu ?id=123
      const response = await fetch(`http://localhost:8080/api/trails/conditions?id=${selectedTrailId}`);
      if (!response.ok) throw new Error('Błąd pobierania danych');
      return response.json();
    },
    // Zapytanie odpala się tylko gdy ID jest ustawione
    enabled: selectedTrailId !== null,
  });

  // 1. Ekran startowy (brak wybranego ID)
  if (selectedTrailId === null) {
    return (
      <div className="w-full min-h-[105px] border-2 border-dashed border-retro-green/30 rounded-xl flex items-center justify-center text-retro-blue font-bold text-sm p-4 text-center">
        📍 Wybierz szlak na mapie, aby załadować warunki
      </div>
    );
  }

  // 2. Ekran ładowania
  if (isLoading) {
    return (
      <div className="w-full min-h-[105px] border-2 border-retro-green/20 rounded-xl flex items-center justify-center text-retro-green font-bold text-sm animate-pulse p-4 text-center">
        ⏳ Backend Go oblicza dane dla szlaku {selectedTrailId}...
      </div>
    );
  }

  // 3. Ekran błędu
  if (error || !data) {
    return (
      <div className="w-full min-h-[105px] bg-retro-rust/10 border-2 border-retro-rust/40 rounded-xl flex items-center justify-center text-retro-rust font-bold text-sm p-4 text-center">
        ⚠️ Błąd połączenia z serwerem. Upewnij się, że backend obsługuje parametr ID.
      </div>
    );
  }

  // 4. TWÓJ ZATWIERDZONY SZABLON (dane z {data})
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
      {/* KAFELEK 1: HIKE FACTOR */}
      <div className="bg-retro-dark text-retro-beige p-4 rounded-xl flex items-center justify-between border-2 border-retro-dark min-h-[105px]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-retro-yellow">Hike Factor</h3>
          <p className="text-sm font-medium opacity-90 mt-1">Ogólna ocena komfortu</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-retro-rust text-white flex items-center justify-center text-xl font-black shadow-md">
          {data.hikeFactor}
        </div>
      </div>

      {/* KAFELEK 2: POGODA */}
      <div className="bg-retro-yellow/10 border-2 border-retro-yellow/40 p-4 rounded-xl flex flex-col justify-between min-h-[105px]">
        <span className="text-xs font-bold text-retro-yellow uppercase tracking-wider">Pogoda</span>
        <div className="mt-2 flex justify-between items-baseline">
          <span className="text-base font-black text-retro-dark">{data.weather.condition}</span>
          <span className="text-sm font-bold text-retro-rust">{data.weather.temp}°C | {data.weather.wind} km/h</span>
        </div>
      </div>

      {/* KAFELEK 3: OPADY */}
      <div className="bg-retro-blue/10 border-2 border-retro-blue/40 p-4 rounded-xl flex flex-col justify-between min-h-[105px]">
        <span className="text-xs font-bold text-retro-blue uppercase tracking-wider">Opady (24h)</span>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-retro-dark">{data.precipitation24h}</span>
          <span className="text-sm font-bold text-retro-blue">mm wody</span>
        </div>
      </div>

      {/* KAFELEK 4: NAWIERZCHNIA */}
      <div className="bg-retro-rust/10 border-2 border-retro-rust/40 p-4 rounded-xl flex flex-col justify-between min-h-[105px]">
        <span className="text-xs font-bold text-retro-rust uppercase tracking-wider">Nawierzchnia szlaku</span>
        <div className="mt-2 flex items-center gap-3">
          <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide bg-retro-rust text-white shadow-sm">
            {data.surface.status}
          </span>
          {data.surface.snowDepth > 0 && <span className="text-sm text-retro-dark font-bold">{data.surface.snowDepth} cm</span>}
        </div>
      </div>

      {/* KAFELEK 5: STOPIEŃ LAWINOWY */}
      <div className="bg-white border-2 border-retro-green/20 p-4 rounded-xl flex flex-col justify-between min-h-[105px]">
        <span className="text-xs font-bold text-retro-green/60 uppercase tracking-wider">Stopień lawinowy</span>
        <div className="mt-2 flex items-center gap-3">
          <span className={`w-7 h-7 rounded-lg text-sm font-black flex items-center justify-center shadow-sm ${data.avalancheLevel === 1 ? 'bg-retro-green text-retro-beige' : 'bg-retro-rust text-white'}`}>
            {data.avalancheLevel}
          </span>
          <span className="text-sm font-bold text-retro-dark tracking-wide">{data.avalancheLevel === 1 ? 'TPN: NISKIE' : 'TPN: PODWYŻSZONE'}</span>
        </div>
      </div>

      {/* KAFELEK 6: PROFIL */}
      <div className="bg-retro-green/10 border-2 border-retro-green/40 p-4 rounded-xl flex flex-col justify-between min-h-[105px]">
        <div className="flex justify-between items-center text-xs font-bold text-retro-green uppercase tracking-wider">
          <span>Profil trasy</span>
          <span className="font-black text-retro-dark">{data.elevation.min}m - <span className="text-retro-rust">{data.elevation.max}m</span></span>
        </div>
      </div>
    </div>
  );
};