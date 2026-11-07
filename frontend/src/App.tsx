import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Home from './pages/Home';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import UserProfile from './components/UserProfile';
import Sidebar from './components/Sidebar';
import ProfileButton from './components/ProfileButton';
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

  // Atualiza o utilizador quando o perfil é alterado (ex.: avatar)
  useEffect(() => {
    const handleUserUpdate = () => {
      const storedUser = localStorage.getItem('pragma_user');
      if (storedUser) setCurrentUser(JSON.parse(storedUser));
    };
    window.addEventListener('pragma:user', handleUserUpdate);
    return () => window.removeEventListener('pragma:user', handleUserUpdate);
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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar currentView={view} onNavigate={setView} onLogout={handleLogout} currentUser={currentUser} />
      <main style={{ flex: 1, minWidth: 0, padding: '24px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        {view !== 'profile' && <ProfileButton onNavigate={setView} currentUser={currentUser} />}
        {view === 'orders' && <Orders />}
        {view === 'history' && <History />}
        {view === 'menu' && <Products />}
        {view === 'reports' && <Reports />}
        {view === 'profile' && <UserProfile />}
        {view === 'admin' && <AdminPanel />}
        {view === 'home' && <Home />}
      </main>
    </div>
  );
}