import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMapStore } from './store/useMapStore';
import { TopNav } from './components/TopNav';
import { MapView } from './components/MapView';
import { DetailsPanel } from './components/DetailsPanel';
import { AuthForm } from './components/AuthForm';
// import { FavoritesView } from './components/FavoritesView';

const queryClient = new QueryClient();

export default function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const setSelectedTrailId = useMapStore((state) => state.setSelectedTrailId);
  const setAuthView = useMapStore((state) => state.setAuthView);

  const handleResetMap = () => {
    setSelectedTrailId(null);
    setAuthView(false);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('jwt_token');
      if (!token) return;

      try {
        const response = await fetch('http://localhost:8080/api/validate-token', {
          headers: { 
            'Authorization': `Bearer ${token}` 
          }
        });

        if (response.ok) {
          setIsLoggedIn(true);
        } else {
          localStorage.removeItem('jwt_token');
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error("Błąd walidacji tokena:", error);
        setIsLoggedIn(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    setAuthView(currentView === 'auth');
  }, [currentView, setAuthView]);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setCurrentView('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    setIsLoggedIn(false);
    setCurrentView('home');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-retro-beige w-full p-4 md:p-12">
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 relative">
          
          <TopNav 
            onViewChange={setCurrentView} 
            currentView={currentView} 
            isLoggedIn={isLoggedIn} 
            onLogout={handleLogout}
            onResetMap={handleResetMap}
          />

          <main className="w-full flex flex-col gap-6">
            <MapView />
            
            {currentView === 'home' && (
              <div className="w-full">
                <DetailsPanel />
              </div>
            )}

            {(currentView === 'auth' || currentView === 'favorites') && (
              <div className="w-full flex justify-center py-10">
                <div className="w-full max-w-md">
                  {currentView === 'favorites' && isLoggedIn && (
                    <div className="p-8 bg-white/90 rounded-xl shadow-lg border border-retro-dark/10">
                      <h2 className="text-xl font-bold text-retro-dark">Twoje ulubione szlaki</h2>
                    </div>
                  )}
                  {currentView === 'auth' && !isLoggedIn && (
                    <AuthForm onLogin={handleLoginSuccess} />
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}