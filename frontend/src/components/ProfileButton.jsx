import React from 'react';
import { UserCircle } from 'lucide-react';

export default function ProfileButton({ onNavigate, currentUser }) {
    const avatarUrl = currentUser?.avatar;

    return (
        <button
            type="button"
            onClick={() => onNavigate('profile')}
            title="Ir para teu perfil"
            style={{
                position: 'fixed',
                top: '16px',
                left: '155px',
                zIndex: 20,
                background: '#1d4ed8',
                border: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '8px 14px',
                borderRadius: '18px',
                fontWeight: '600'
            }}
        >
            {avatarUrl ? (
                <img src={avatarUrl.startsWith('http') ? avatarUrl : `http://127.0.0.1:8000${avatarUrl}`} alt="Avatar" width="28" height="28" style={{ borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
                <UserCircle size={28} />
            )}
        </button>
    );
};
