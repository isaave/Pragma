import React from 'react';

const BACKEND_URL = 'http://127.0.0.1:8000';
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// ---- Estilos organizados ----
const styles = {
    pill: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '14px',
        padding: '8px 24px 8px 8px',
        background: '#ffffff',
        border: '1px solid #e6eaf0',
        borderRadius: '999px',
        boxSizing: 'border-box',
        cursor: 'pointer',
        alignSelf: 'flex-start',
        marginBottom: '24px',
        fontFamily: FONT,
        textAlign: 'left',
    },
    avatar: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
        display: 'block',
        background: '#1d4ed8',
    },
    textBlock: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1px',
        minWidth: 0,
    },
    name: {
        fontSize: '15px',
        fontWeight: 700,
        color: '#0f172e',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '220px',
    },
    role: {
        fontSize: '12px',
        fontWeight: 500,
        color: '#6366f1',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '220px',
    },
};

export default function ProfileButton({ onNavigate, currentUser }) {
    const raw = currentUser?.avatar_url || currentUser?.avatar;
    // A API pode devolver o caminho cru (avatars/xxx.png) — a URL pública é /storage/avatars/xxx.png
    const avatarUrl = raw
        ? (raw.startsWith('http')
            ? `${raw}?t=${Date.now()}`
            : `${BACKEND_URL}/storage/${raw.replace(/^\/?storage\//, '')}?t=${Date.now()}`)
        : null;

    return (
        <button
            type="button"
            onClick={() => onNavigate('profile')}
            title="Ir para o teu perfil"
            style={styles.pill}
        >
            {avatarUrl ? (
                <img src={avatarUrl} alt={currentUser?.name || 'Avatar'} style={styles.avatar} />
            ) : (
                <span aria-hidden="true" style={styles.avatar} />
            )}
            <span style={styles.textBlock}>
                <span style={styles.name}>{currentUser?.name || 'Utilizador'}</span>
                <span style={styles.role}>{currentUser?.role || 'Sem cargo'}</span>
            </span>
        </button>
    );
}
