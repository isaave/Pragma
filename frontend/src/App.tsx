import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Home from './pages/Home';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState('home'); // home | admin | profile

  // Verifica se já existe um token guardado quando a aplicação arranca
  useEffect(() => {
    const token = localStorage.getItem('pragma_token');
    if (token) {
      setIsAuthenticated(true);
    }

    const handleLogout = () => setIsAuthenticated(false);
    window.addEventListener('pragma:logout', handleLogout);
    return () => window.removeEventListener('pragma:logout', handleLogout);
  }, []);

  // Função chamada após o login ser bem-sucedido
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setView('home');
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div>
      <nav>
        <button type="button" onClick={() => setView('home')}>Início</button>
        <button type="button" onClick={() => setView('admin')}>Utilizadores</button>
        <button type="button" onClick={() => setView('profile')}>Perfil</button>
      </nav>
      {view === 'profile' ? <Profile /> : view === 'admin' ? <AdminPanel /> : <Home />}
    </div>
  );
}