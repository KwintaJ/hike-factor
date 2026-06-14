import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMapStore } from './store/useMapStore';
import { TopNav } from './components/TopNav';
import { MapView } from './components/MapView';
import { DetailsPanel } from './components/DetailsPanel';
import { AuthForm } from './components/AuthForm';
import { FavoritesView } from './components/FavoritesView';

const queryClient = new QueryClient();

export default function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const setSelectedTrailId = useMapStore((state) => state.setSelectedTrailId);
  const setAuthView = useMapStore((state) => state.setAuthView);
  const setFavoriteTrailIds = useMapStore((state) => state.setFavoriteTrailIds);

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
          headers: { 'Authorization': `Bearer ${token}` }
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
    if (!isLoggedIn) {
      setFavoriteTrailIds([]);
      return;
    }

    const fetchFavoriteIds = async () => {
      const token = localStorage.getItem('jwt_token');
      try {
        const response = await fetch('http://localhost:8080/api/favorites', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setFavoriteTrailIds(data.map((item: { id: number }) => item.id));
        }
      } catch (err) {
        console.error("Błąd pobierania ID ulubionych:", err);
      }
    };

    fetchFavoriteIds();
  }, [isLoggedIn, setFavoriteTrailIds]);

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
            <div className={currentView === 'favorites' ? 'hidden' : 'w-full'}>
              <MapView />
            </div>
            
            {currentView === 'home' && (
              <div className="w-full">
                <DetailsPanel isLoggedIn={isLoggedIn} />
              </div>
            )}

            {currentView === 'favorites' && isLoggedIn && (
              <div className="w-full bg-white/40 p-4 sm:p-8 rounded-2xl border border-retro-dark/10 shadow-sm backdrop-blur-sm">
                <FavoritesView onViewChange={setCurrentView} isLoggedIn={isLoggedIn} />
              </div>
            )}

            {currentView === 'auth' && !isLoggedIn && (
              <div className="w-full flex justify-center py-10">
                <div className="w-full max-w-md">
                  <AuthForm onLogin={handleLoginSuccess} />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}