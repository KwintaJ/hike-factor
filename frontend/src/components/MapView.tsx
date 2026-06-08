import React from 'react';
import { useMapStore } from '../store/useMapStore';
import { MapPin } from 'lucide-react';

export const MapView: React.FC = () => {
  const { selectedTrailId, setSelectedTrailId } = useMapStore();

  return (
    <div className="relative w-full h-[60vh] bg-retro-blue/20 rounded-2xl border-2 border-retro-green/30 overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Siatka topograficzna w tle (retro sznyt) */}
      <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#1B3B2B_1px,transparent_1px),linear-gradient(to_bottom,#1B3B2B_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      
      <div className="text-center z-10">
        <h2 className="text-retro-green font-bold text-lg mb-2">Interaktywna Mapa Tatr (Mock)</h2>
        <p className="text-sm text-retro-green/80 mb-6 max-w-md">
          Kliknij na jeden z poniższych szlaków testowych, aby zaktualizować stan aplikacji i sprawdzić wskaźnik Hike-Factor.
        </p>
      </div>

      <div className="flex gap-4 z-10">
        <button
          onClick={() => setSelectedTrailId(1)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium border-2 transition-all ${
            selectedTrailId === 1
              ? 'bg-retro-green text-retro-beige border-retro-green shadow-md'
              : 'bg-retro-beige text-retro-green border-retro-green/40 hover:border-retro-green'
          }`}
        >
          <MapPin size={18} className={selectedTrailId === 1 ? 'text-retro-rust' : 'text-retro-blue'} />
          Szlakiem na Giewont (ID: 1)
        </button>

        <button
          onClick={() => setSelectedTrailId(999)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium border-2 transition-all ${
            selectedTrailId === 999
              ? 'bg-retro-green text-retro-beige border-retro-green shadow-md'
              : 'bg-retro-beige text-retro-green border-retro-green/40 hover:border-retro-green'
          }`}
        >
          <MapPin size={18} className="text-gray-400" />
          Nieistniejący Szlak (ID: 999)
        </button>
      </div>

      {selectedTrailId && (
        <button 
          onClick={() => setSelectedTrailId(null)}
          className="absolute top-4 right-4 text-xs text-retro-rust underline font-medium hover:text-retro-dark"
        >
          Resetuj zaznaczenie
        </button>
      )}
    </div>
  );
};