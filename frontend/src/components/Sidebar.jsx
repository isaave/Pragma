import React from 'react';
import api from '../Services/api';

export default function Sidebar({ currentView, onNavigate, onLogout, currentUser }) {
    const handleLogout = async () => {
        try {
            await api.post('/logout');
        } catch (error) {
            // ignora erros de rede
        }
        if (onLogout) onLogout();
    };

    return (
        <aside>
            <div>🍔 Pragma</div>
            <nav>
                <button type="button" onClick={() => onNavigate('home')}>Início</button>
                <button type="button" onClick={() => onNavigate('admin')}>Utilizadores</button>
                <button type="button" onClick={() => onNavigate('profile')}>Perfil</button>
            </nav>
            <div>
                <p>{currentUser?.name}</p>
                <p>{currentUser?.role}</p>
                <button type="button" onClick={handleLogout}>Sair</button>
            </div>
        </aside>
    );
}