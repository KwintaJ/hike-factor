import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMapStore } from '../store/useMapStore';
import { CloudRain, Thermometer, Wind, ShieldAlert, Compass } from 'lucide-react';

interface ConditionData {
  trail_id: number;
  hike_factor: { score: number; label: string; description: string };
  weather_forecast: { temp_celsius: number; wind_speed_kmh: number; conditions: string };
  avalanche_danger_level: number;
}

export const DetailsPanel: React.FC = () => {
  const selectedTrailId = useMapStore((state) => state.selectedTrailId);

  // TanStack Query pobiera dane automatycznie tylko, gdy selectedTrailId nie jest nullem (Server-state)
  const { data, isLoading, error } = useQuery<ConditionData, { error: string; code: number }>({
    queryKey: ['conditions', selectedTrailId],
    queryFn: async () => {
      const res = await fetch(`http://localhost:8080/api/trails/${selectedTrailId}/conditions`);
      if (!res.ok) {
        const errorData = await res.json();
        throw errorData; // Przekazujemy spójną strukturę błędu z Go (R6)
      }
      return res.json();
    },
    enabled: !!selectedTrailId, // Zapobiega odpytywaniu API, gdy nie wybrano szlaku
    staleTime: 1000 * 60 * 5,    // Dane są uznawane za świeże przez 5 minut
  });

  if (!selectedTrailId) {
    return (
      <div className="w-full bg-retro-beige border-2 border-dashed border-retro-green/20 rounded-2xl p-8 text-center text-retro-green/60 font-medium">
        Wybierz szlak turystyczny na mapie powyżej, aby przeanalizować warunki atmosferyczne i współczynnik bezpieczeństwa.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full bg-retro-beige border-2 border-retro-green/20 rounded-2xl p-8 text-center animate-pulse text-retro-green font-medium">
        Agregacja danych z API pogodowych i komunikatów TOPR...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-retro-beige border-2 border-retro-rust/40 rounded-2xl p-6 text-retro-rust bg-retro-rust/5">
        <h4 className="font-bold text-lg mb-1 flex items-center gap-2">
          <ShieldAlert size={20} /> Błąd pobierania danych (Kod {error.code || 500})
        </h4>
        <p className="text-sm font-medium">{error.error || 'Nie udało się połączyć z serwerem API.'}</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-retro-beige border-2 border-retro-green rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 transition-all duration-300">
      
      {/* GŁÓWNY WSKAŹNIK - HIKE FACTOR */}
      <div className="flex-1 bg-retro-green text-retro-beige p-5 rounded-xl flex flex-col justify-between border border-retro-green">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-retro-blue">Wskaźnik Bezpieczeństwa</span>
          <h3 className="text-2xl font-bold mt-1 mb-2 text-retro-beige">Hike Factor</h3>
          <p className="text-sm text-retro-beige/80 leading-relaxed">{data?.hike_factor.description}</p>
        </div>
        <div className="flex items-baseline gap-3 mt-4">
          <span className="text-5xl font-black text-retro-rust">{data?.hike_factor.score}</span>
          <span className="text-lg font-bold text-retro-blue">/ 100 ({data?.hike_factor.label})</span>
        </div>
      </div>

      {/* PROGNOZA POGODY */}
      <div className="flex-1 border border-retro-green/20 p-5 rounded-xl flex flex-col justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-retro-green/60">Bieżące warunki (24h)</span>
          <h3 className="text-xl font-bold text-retro-green mt-1 mb-4 flex items-center gap-2">
            <CloudRain size={20} className="text-retro-blue" /> Prognoza Meteo
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Thermometer size={18} className="text-retro-rust" />
              <div>
                <p className="text-xs text-retro-green/60 font-medium">Temperatura</p>
                <p className="font-bold text-retro-dark">{data?.weather_forecast.temp_celsius} °C</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Wind size={18} className="text-retro-blue" />
              <div>
                <p className="text-xs text-retro-green/60 font-medium">Wiatr</p>
                <p className="font-bold text-retro-dark">{data?.weather_forecast.wind_speed_kmh} km/h</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-retro-green/10 text-xs font-bold text-retro-green/80">
          Status: {data?.weather_forecast.conditions}
        </div>
      </div>

      {/* TOPR / LAWINY */}
      <div className="w-full md:w-64 border border-retro-green/20 p-5 rounded-xl flex flex-col justify-between bg-retro-rust/5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-retro-rust/80">Komunikat Lawinowy</span>
          <h3 className="text-xl font-bold text-retro-dark mt-1 mb-2 flex items-center gap-2">
            <ShieldAlert size={20} className="text-retro-rust" /> Stopień Zagrożenia
          </h3>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="w-14 h-14 bg-retro-rust text-retro-beige rounded-lg flex items-center justify-center text-3xl font-black">
            {data?.avalanche_danger_level}
          </div>
          <p className="text-xs font-medium text-retro-green/80 leading-snug">
            {data?.avalanche_danger_level && data.avalanche_danger_level >= 2 
              ? 'Wymagane doświadczenie w ocenie lokalnego ryzyka. Poruszaj się rozważnie.'
              : 'Warunki ogólnie stabilne.'}
          </p>
        </div>
      </div>

    </div>
  );
};