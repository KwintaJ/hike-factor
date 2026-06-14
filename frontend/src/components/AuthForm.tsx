import React, { useState } from 'react';

interface AuthFormProps {
  onLogin: () => void;
}

const API_BASE_URL = 'http://localhost:8080';

export const AuthForm: React.FC<AuthFormProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const endpoint = isLogin ? `${API_BASE_URL}/api/login` : `${API_BASE_URL}/api/register`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Wystąpił błąd');
      }

      if (!isLogin) {
        setIsLogin(true);
        return;
      }

      const data = await response.json();
      localStorage.setItem('jwt_token', data.token);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
    }
  };

  return (
    <div className="bg-white/90 p-8 rounded-xl shadow-lg w-full max-w-md border border-retro-dark/10 backdrop-blur-sm">
      <h2 className="text-2xl font-bold text-retro-dark mb-6">
        {isLogin ? 'Zaloguj się' : 'Zarejestruj się'}
      </h2>
      
      {error && <p className="text-retro-rust font-medium mb-4">{error}</p>}

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Nazwa użytkownika"
          className="p-3 border border-retro-brown/20 rounded-lg bg-retro-beige focus:ring-2 focus:ring-retro-green outline-none"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Hasło"
          className="p-3 border border-retro-brown/20 rounded-lg bg-retro-beige focus:ring-2 focus:ring-retro-green outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button 
          type="submit"
          className="bg-retro-green text-white py-3 rounded-lg font-bold hover:bg-retro-green-dark transition-all shadow-md"
        >
          {isLogin ? 'Zaloguj' : 'Zarejestruj'}
        </button>
      </form>

      <button 
        onClick={() => setIsLogin(!isLogin)}
        className="mt-4 text-sm text-retro-blue hover:text-retro-blue-dark underline w-full text-center"
      >
        {isLogin ? 'Nie masz konta? Zarejestruj się' : 'Masz już konto? Zaloguj się'}
      </button>
    </div>
  );
};