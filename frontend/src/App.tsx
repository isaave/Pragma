import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Home from './pages/Home';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import Sidebar from './components/Sidebar';
import Orders from './pages/Orders';
import History from './pages/History';
import Products from './pages/Products';
import Reports from './pages/Reports';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState('home'); // home | admin | profile
  const [currentUser, setCurrentUser] = useState(null);

  // Verifica se já existe um token guardado quando a aplicação arranca
  useEffect(() => {
    const token = localStorage.getItem('pragma_token');
    const storedUser = localStorage.getItem('pragma_user');
    if (token) {
      setIsAuthenticated(true);
      if (storedUser) setCurrentUser(JSON.parse(storedUser));
    }

    const handleLogout = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
    };
    window.addEventListener('pragma:logout', handleLogout);
    return () => window.removeEventListener('pragma:logout', handleLogout);
  }, []);

  // Função chamada após o login ser bem-sucedido
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    const storedUser = localStorage.getItem('pragma_user');
    if (storedUser) setCurrentUser(JSON.parse(storedUser));
    setView('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('pragma_token');
    localStorage.removeItem('pragma_user');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar currentView={view} onNavigate={setView} onLogout={handleLogout} currentUser={currentUser} />
      <main style={{ flex: 1, minWidth: 0, padding: '24px' }}>
        {view === 'orders' && <Orders />}
        {view === 'history' && <History />}
        {view === 'menu' && <Products />}
        {view === 'reports' && <Reports />}
        {view === 'profile' && <Profile />}
        {view === 'admin' && <AdminPanel />}
        {view === 'home' && <Home />}
      </main>
    </div>
  );
}