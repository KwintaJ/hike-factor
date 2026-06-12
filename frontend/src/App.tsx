import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MapView } from './components/MapView';
import { DetailsPanel } from './components/DetailsPanel';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-retro-beige w-full p-4 md:p-12">
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
          <main className="w-full flex flex-col gap-6">
            <MapView />
            <div className="w-full">
              <DetailsPanel />
            </div>
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;