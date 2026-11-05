import React, { useState } from 'react';
import { Home, Users, UserCog, LogOut } from 'lucide-react';
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

    const items = [
        { view: 'home', icon: Home, label: 'Início' },
        { view: 'admin', icon: Users, label: 'Utilizadores' },
        { view: 'profile', icon: UserCog, label: 'Perfil' },
    ];

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
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: expanded ? 'flex-start' : 'center' }}>
                {items.map(({ view, icon: Icon, label }) => (
                    <button
                        key={view}
                        type="button"
                        onClick={() => onNavigate(view)}
                        title={label}
                        style={{ background: 'none', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '6px', width: '100%', textAlign: 'left' }}
                    >
                        <Icon size={24} />
                        {expanded ? label : ''}
                    </button>
                ))}
            </nav>
            <div style={{ marginTop: 'auto', alignItems: expanded ? 'flex-start' : 'center' }}>
                {expanded && (
                    <>
                        <p>{currentUser?.name}</p>
                        <p>{currentUser?.role}</p>
                    </>
                )}
                <button
                    type="button"
                    onClick={handleLogout}
                    title="Sair"
                    style={{ background: 'none', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '6px', width: '100%', textAlign: 'left' }}
                >
                    <LogOut size={24} />
                    {expanded ? ' Sair' : ''}
                </button>
            </div>
        </aside>
    );
}