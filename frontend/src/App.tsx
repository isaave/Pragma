import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Login from './pages/Login';
import Home from './pages/Home';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import UserProfile from './components/UserProfile';
import Sidebar from './components/Sidebar';
import ProfileButton from './components/ProfileButton';
import History from './pages/History';
import Products from './pages/Products';
import Reports from './pages/Reports';
import Stock from './pages/Stock';
import useIsMobile from './hooks/useIsMobile';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState('home'); // home | admin | profile
  const [currentUser, setCurrentUser] = useState(null);
  const isMobile = useIsMobile(900);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar
        currentView={view}
        onNavigate={setView}
        onLogout={handleLogout}
        currentUser={currentUser}
        isMobile={isMobile}
        mobileOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Barra superior no mobile: menu hamburger + perfil */}
      {isMobile && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '10px 16px',
            position: 'sticky',
            top: 0,
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-color)',
            zIndex: 20,
          }}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Menu size={20} />
          </button>
          {view !== 'profile' && <ProfileButton compact onNavigate={setView} currentUser={currentUser} />}
        </header>
      )}

      <main style={{ flex: 1, minWidth: 0, padding: isMobile ? '16px' : '24px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        {!isMobile && view !== 'profile' && <ProfileButton onNavigate={setView} currentUser={currentUser} />}
        {view === 'orders' && null}
        {view === 'history' && <History />}
        {view === 'menu' && <Products />}
        {view === 'reports' && <Reports />}
        {view === 'profile' && <UserProfile />}
        {view === 'admin' && <AdminPanel />}
        {view === 'home' && <Home />}
        {view === 'stock' && <Stock />}
      </main>
    </div>
  );
}