import React, { useState } from 'react';
import { Bell, History, Utensils, BarChart3, Users, LogOut } from 'lucide-react';
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
        localStorage.removeItem('pragma_token');
        localStorage.removeItem('pragma_user');
        if (onLogout) onLogout();
    };

    const width = expanded ? '220px' : '126px';

    const items = [
        { view: 'orders', icon: Bell, label: 'Gestão de Pedidos' },
        { view: 'history', icon: History, label: 'Históricos de pedidos' },
        { view: 'menu', icon: Utensils, label: 'Produtos' },
        { view: 'reports', icon: BarChart3, label: 'Relatórios' },
        { view: 'admin', icon: Users, label: 'Usuários' },
    ];

    return (
        <aside
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
            style={{
                width,
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden',
                minHeight: '806px',
                backgroundColor: '#03071e',
                borderRadius: '30px',
                margin: '12px',
                height: '806px',
                padding: '24px 16px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                boxShadow: '8px 0 30px rgba(0, 0, 0, 0.25)',
                zIndex: 10
            }}
        >
            {/* Topo: Logótipo da House Burguer */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'center', marginBottom: '20px', transition: 'all 0.3s' }}>
                <img 
                    src={logo} 
                    alt="House Burguer" 
                    style={{ 
                        width: expanded ? '70px' : '40px', 
                        height: expanded ? '70px' : '40px', 
                        borderRadius: '50%', 
                        objectFit: 'cover',
                        border: '2px solid rgba(255, 255, 255, 0.15)',
                        transition: 'width 0.3s, height 0.3s'
                    }} 
                />
            </div>

            {/* Menu de Navegação (centralizado verticalmente) */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', flex: 1, justifyContent: 'center' }}>
                {items.map(({ view, icon: Icon, label }) => {
                    const isActive = currentView === view;
                    return (
                        <button
                            key={view}
                            type="button"
                            onClick={() => onNavigate(view)}
                            title={label}
                            style={{
                                background: isActive ? '#1d4ed8' : 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                cursor: 'pointer',
                                padding: expanded ? '12px 16px' : '12px',
                                justifyContent: expanded ? 'flex-start' : 'center',
                                borderRadius: '16px',
                                width: '100%',
                                transition: 'background 0.2s, padding 0.3s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <Icon size={22} style={{ minWidth: '22px' }} />
                            {expanded && (
                                <span style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {label}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Parte Inferior: Botão Logout */}
            <div style={{ marginTop: 'auto', paddingTop: '20px', width: '100%' }}>
                <button
                    type="button"
                    onClick={handleLogout}
                    title="Logout"
                    style={{
                        background: 'linear-gradient(135deg, #311052 0%, #1f0b36 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        padding: expanded ? '12px 16px' : '12px',
                        justifyContent: expanded ? 'flex-start' : 'center',
                        borderRadius: '16px',
                        width: '100%',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        transition: 'all 0.3s',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <LogOut size={22} style={{ minWidth: '22px' }} />
                    {expanded && (
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                            Logout
                        </span>
                    )}
                </button>
            </div>
        </aside>
    );
}