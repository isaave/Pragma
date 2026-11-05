import React, { useState } from 'react';
import api from '../Services/api';
import logo from '../assets/LogoHouseBurguer.png';

export default function Sidebar({ currentView, onNavigate, onLogout, currentUser }) {
    const [expanded, setExpanded] = useState(false);

    const handleLogout = async () => {
        try {
            await api.post('/logout');
        } catch (error) {
            // ignora erros de rede
        }
        if (onLogout) onLogout();
    };

    const width = expanded ? '220px' : '64px';

    return (
        <aside
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
            style={{ width, transition: 'width 0.2s ease', overflow: 'hidden', minHeight: '100vh', background: '#0b132b', color: 'white', padding: '16px 8px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
            <div style={{ fontWeight: 'bold', textAlign: 'center' }}>
                <img src={logo} alt="House Burguer" width="32" height="32" />
                {expanded ? ' Pragma' : ''}
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button type="button" onClick={() => onNavigate('home')} title="Início">
                    🏠{expanded ? ' Início' : ''}
                </button>
                <button type="button" onClick={() => onNavigate('admin')} title="Utilizadores">
                    👤{expanded ? ' Utilizadores' : ''}
                </button>
                <button type="button" onClick={() => onNavigate('profile')} title="Perfil">
                    ⚙️{expanded ? ' Perfil' : ''}
                </button>
            </nav>
            <div style={{ marginTop: 'auto' }}>
                {expanded && (
                    <>
                        <p>{currentUser?.name}</p>
                        <p>{currentUser?.role}</p>
                    </>
                )}
                <button type="button" onClick={handleLogout} title="Sair">
                    🚪{expanded ? ' Sair' : ''}
                </button>
            </div>
        </aside>
    );
}