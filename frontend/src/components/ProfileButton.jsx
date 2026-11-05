import React from 'react';
import { UserCircle } from 'lucide-react';

export default function ProfileButton({ onNavigate, currentUser }) {
    const avatarUrl = currentUser?.avatar;

    return (
        <button
            type="button"
            onClick={() => onNavigate('profile')}
            title="Ir para teu perfil"
        >
            {avatarUrl ? (
                <img src={avatarUrl.startsWith('http') ? avatarUrl : `http://127.0.0.1:8000${avatarUrl}`} alt="Avatar" width="28" height="28" />
            ) : (
                <UserCircle size={28} />
            )}
            <span>Perfil do Usuário</span>
        </button>
    );
};
