import React from 'react';

interface TopNavProps {
  onViewChange: (view: string) => void;
  currentView: string;
  isLoggedIn: boolean;
  onLogout: () => void;
  onResetMap: () => void; 
}

export const TopNav: React.FC<TopNavProps> = ({ onViewChange, currentView, isLoggedIn, onLogout, onResetMap }) => {
  return (
    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[1000] w-full max-w-4xl px-4">
      <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-retro-dark/10 flex justify-between items-center gap-4">
        
        <button 
          onClick={() => {
            onViewChange('home');
            onResetMap();
          }}
          className="px-4 py-2 bg-retro-dark text-retro-beige rounded-lg font-semibold hover:bg-retro-green transition-colors"
        >
          HikeFactor
        </button>

        <div className="flex gap-2">
          {isLoggedIn && (
            <button 
              onClick={() => onViewChange('favorites')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentView === 'favorites' ? 'bg-retro-orange text-white' : 'bg-retro-beige text-retro-dark'
              }`}
            >
              Ulubione
            </button>
          )}

          {isLoggedIn ? (
            <button 
              onClick={onLogout}
              className="px-4 py-2 bg-retro-rust text-white rounded-lg font-medium hover:bg-retro-rust-dark transition-colors"
            >
              Wyloguj
            </button>
          ) : (
            <button 
              onClick={() => onViewChange('auth')}
              className="px-4 py-2 bg-retro-blue text-white rounded-lg font-medium hover:bg-retro-blue-dark transition-colors"
            >
              Logowanie
            </button>
          )}
        </div>
      </div>
    </div>
  );
};