import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
  };

  return (
    <div>
      {isAuthenticated ? (
        <AdminPanel />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}