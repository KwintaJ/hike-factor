import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MapView } from './components/MapView';
import { DetailsPanel } from './components/DetailsPanel';
import { Compass } from 'lucide-react';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-retro-beige px-4 py-6 md:px-12 flex flex-col gap-6 max-w-7xl mx-auto">
        
        <header className="flex justify-between items-center pb-4 border-b-2 border-retro-green/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-retro-green text-retro-beige rounded-lg">
              <Compass size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-retro-dark">hike<span className="text-retro-rust">-factor</span></h1>
              <p className="text-xs font-medium text-retro-green/60">Tatrzański agregator warunków i komfortu wędrówki</p>
            </div>
          </div>
          <div className="text-xs font-bold text-retro-green border border-retro-green/30 px-3 py-1.5 rounded-md bg-white/50">
            Status API: <span className="text-green-700">Połączono (Mock Go)</span>
          </div>
        </header>

        {/* SEKCJA MAPY */}
        <main className="flex flex-col gap-6">
          <MapView />
          <DetailsPanel />
        </main>

        {/* STOPKA */}
        <footer className="text-center text-xs text-retro-green/40 font-medium pt-4 border-t border-retro-green/10 mt-auto">
          hike-factor • © 2026 Jan Kwinta
        </footer>

      </div>
    </QueryClientProvider>
  );
}

export default App;