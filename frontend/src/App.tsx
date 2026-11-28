import { useCallback, useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import UserProfile from './components/UserProfile';
import Sidebar from './components/Sidebar';
import ProfileButton from './components/ProfileButton';
import NotificationButton from './components/NotificationButton';
import StoreStatus from './components/StoreStatus';
import History from './pages/History';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Reports from './pages/Reports';
import Stock from './pages/Stock';
import useIsMobile from './hooks/useIsMobile';
import { HeaderActionsContext } from './components/ui/PageHeader';
import { NotificationsProvider } from './context/NotificationsContext';
import type { AppNotification } from './types/notifications';

// Telas onde o sino e o perfil dividem a linha com o PageHeader (somente desktop)
const HEADER_INLINE_VIEWS = ['admin', 'stock', 'history', 'menu', 'reports', 'orders'];

// Botão de abrir/fechar negócio aparece apenas em Gestão de Pedidos e Histórico
const STORE_STATUS_VIEWS = ['orders', 'history'];

function AppShell() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState('orders');
  const [currentUser, setCurrentUser] = useState(null);
  const isMobile = useIsMobile(900);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // A sidebar desktop é fixa; o conteúdo acompanha a expansão dela com a mesma transição.
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // Verifica se já existe um token guardado quando a aplicação arranca
  useEffect(() => {
    const token = localStorage.getItem('pragma_token');
    const storedUser = localStorage.getItem('pragma_user');
    if (token) {
      setIsAuthenticated(true);
      if (storedUser) setCurrentUser(JSON.parse(storedUser));
      window.setTimeout(() => window.dispatchEvent(new Event('pragma:notifications-refresh')), 0);
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
    setView('orders');
    window.setTimeout(() => window.dispatchEvent(new Event('pragma:notifications-refresh')), 0);
  };

  const handleStoreToggled = () => {
    setView('history');
    window.dispatchEvent(new Event('pragma:store-toggled'));
  };

  const handleLogout = () => {
    localStorage.removeItem('pragma_token');
    localStorage.removeItem('pragma_user');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // A notificação leva direto à origem do alerta. As telas ouvem este evento
  // para destacar/focar o registro correspondente.
  const handleNotificationNavigate = useCallback((notification: AppNotification) => {
    const { view: targetView, resourceType, resourceId, highlight } = notification.target;
    setView(targetView);
    // A tela de destino ainda vai montar; aguardamos um tick para que o
    // listener de foco dela já esteja ativo quando o evento for disparado.
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('pragma:focus-resource', {
          detail: { resourceType, resourceId, highlight },
        }),
      );
    }, 150);
  }, []);

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const showStoreStatus = STORE_STATUS_VIEWS.includes(view);

  const headerActions = (
    <>
      {showStoreStatus && <StoreStatus header onToggled={handleStoreToggled} />}
      <NotificationButton onNavigate={handleNotificationNavigate} />
      {!isMobile && view !== 'profile' && <ProfileButton onNavigate={setView} currentUser={currentUser} />}
    </>
  );
  const inlineHeader = !isMobile && HEADER_INLINE_VIEWS.includes(view);

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
        onExpandChange={setSidebarExpanded}
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
          {view !== 'profile' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {showStoreStatus && <StoreStatus header onToggled={handleStoreToggled} />}
              <NotificationButton onNavigate={handleNotificationNavigate} />
              <ProfileButton compact onNavigate={setView} currentUser={currentUser} />
            </div>
          )}
        </header>
      )}

      <main style={{ flex: 1, minWidth: 0, padding: isMobile ? '16px' : '24px', paddingLeft: isMobile ? '16px' : (sidebarExpanded ? '244px' : '150px'), transition: isMobile ? undefined : 'padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        {!isMobile && view !== 'profile' && !inlineHeader && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginBottom: '16px' }}>
            {headerActions}
          </div>
        )}
        <HeaderActionsContext.Provider value={inlineHeader ? headerActions : null}>
          {view === 'orders' && <Orders />}
          {view === 'history' && <History />}
          {view === 'menu' && <Products />}
          {view === 'reports' && <Reports />}
          {view === 'profile' && <UserProfile />}
          {view === 'admin' && <AdminPanel />}
          {view === 'stock' && <Stock />}
        </HeaderActionsContext.Provider>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <NotificationsProvider>
      <AppShell />
    </NotificationsProvider>
  );
}