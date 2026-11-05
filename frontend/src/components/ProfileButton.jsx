import React from 'react';
import { UserCircle } from 'lucide-react';

const BACKEND_URL = 'http://127.0.0.1:8000';

export default function ProfileButton({ onNavigate, currentUser }) {
    const raw = currentUser?.avatar_url || currentUser?.avatar;
    const avatarUrl = raw
        ? (raw.startsWith('http') ? `${raw}?t=${Date.now()}` : `${BACKEND_URL}${raw.startsWith('/') ? '' : '/'}${raw}?t=${Date.now()}`)
        : null;

    return (
        <button
            type="button"
            onClick={() => onNavigate('profile')}
            title="Ir para teu perfil"
        >
            {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" width="28" height="28" />
            ) : (
                <UserCircle size={28} />
            )}
            <span>Perfil do Usuário</span>
        </button>
    );
};
