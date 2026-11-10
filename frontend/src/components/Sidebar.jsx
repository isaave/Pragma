import React, { useState } from 'react';
import { Bell, History, Utensils, Package, BarChart3, Users, LogOut, Sun, Moon } from 'lucide-react';
import api from '../Services/api';
import logo from '../assets/LogoHouseBurguer.png';
import LegalModal from './LegalModal';
import { useTheme } from '../contexts/ThemeContext';

export default function Sidebar({ currentView, onNavigate, onLogout, currentUser }) {
    const [expanded, setExpanded] = useState(false);
    const [legalDoc, setLegalDoc] = useState(null); // null | 'terms' | 'privacy'
    const { isDark, toggleTheme } = useTheme();

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
    // Altura responsiva: 806px no máx., mas nunca maior que a tela
    const sbHeight = 'min(806px, calc(100vh - 24px))';

    const items = [
        { view: 'orders', icon: Bell, label: 'Gestão de Pedidos' },
        { view: 'history', icon: History, label: 'Históricos de pedidos' },
        { view: 'menu', icon: Utensils, label: 'Produtos' },
        { view: 'reports', icon: BarChart3, label: 'Relatórios' },
        { view: 'admin', icon: Users, label: 'Usuários' },
        { view: 'stock', icon: Package, label: 'Estoque' },
    ];

    return (
        <aside
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
            style={{
                position: 'sticky',
                // Centraliza verticalmente na tela (com folga mínima de 12px)
                top: `max(12px, calc((100vh - ${sbHeight}) / 2))`,
                width,
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden',
                backgroundColor: '#03071e',
                borderRadius: '30px',
                margin: '12px',
                height: sbHeight,
                alignSelf: 'center',
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
            {/* Topo: Logótipo da House Burguer + Toggle de tema */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'center', marginTop: '24px', marginBottom: '20px', transition: 'all 0.3s', width: '100%' }}>
                <img 
                    src={logo} 
                    alt="House Burguer" 
                    style={{ 
                        width: expanded ? '120px' : '78px', 
                        height: expanded ? '120px' : '78px', 
                        flexShrink: 0,
                        aspectRatio: '1 / 1',
                        borderRadius: '50%', 
                        objectFit: 'cover',
                        border: '2px solid rgba(255, 255, 255, 0.15)',
                        transition: 'width 0.3s, height 0.3s'
                    }} 
                />
                {expanded && (
                    <button
                        type="button"
                        onClick={toggleTheme}
                        title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                        style={{
                            marginTop: '12px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                        }}
                    >
                        {isDark ? <Sun size={16} /> : <Moon size={16} />}
                        {isDark ? 'Tema claro' : 'Tema escuro'}
                    </button>
                )}
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

            {/* Parte Inferior: termos, políticas e botão Logout */}
            <div style={{ marginTop: 'auto', paddingTop: '20px', width: '100%' }}>
                {expanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                        <button
                            type="button"
                            onClick={() => setLegalDoc('terms')}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.55)',
                                fontSize: '11px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                padding: '2px 4px',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Termos de Uso
                        </button>
                        <button
                            type="button"
                            onClick={() => setLegalDoc('privacy')}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.55)',
                                fontSize: '11px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                padding: '2px 4px',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Política de Privacidade
                        </button>
                    </div>
                )}
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

            {legalDoc && <LegalModal type={legalDoc} onClose={() => setLegalDoc(null)} />}
        </aside>
    );
}