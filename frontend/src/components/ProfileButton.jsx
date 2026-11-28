import React from 'react';

const BACKEND_URL = 'http://127.0.0.1:8000';
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// Mostra sempre o cargo (chefe/atendente), nunca o nível de acesso.
// Também trata sessões antigas em que "completo"/"básico" vinham em `role`.
const cargoLabel = (user) => {
    const role = String(user?.role || '').toLowerCase();
    if (role === 'chefe') return 'Chefe';
    if (role === 'atendente') return 'Atendente';

    const access = String(user?.access_level || '').toLowerCase();
    if (access === 'completo' || role === 'completo') return 'Chefe';
    if (access === 'basico' || role === 'basico') return 'Atendente';

    return 'Sem cargo';
};

// ---- Estilos organizados ----
const styles = {
    pill: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '5px 14px 5px 5px',
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '999px',
        boxSizing: 'border-box',
        cursor: 'pointer',
        alignSelf: 'flex-end',
        marginBottom: '16px',
        fontFamily: FONT,
        textAlign: 'left',
    },
    pillCompact: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '5px 14px 5px 5px',
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '999px',
        boxSizing: 'border-box',
        cursor: 'pointer',
        alignSelf: 'center',
        marginBottom: 0,
        fontFamily: FONT,
        textAlign: 'left',
    },
    avatar: {
        width: '34px',
        height: '34px',
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
        display: 'block',
        background: 'var(--accent)',
    },
    avatarCompact: {
        width: '34px',
        height: '34px',
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
        display: 'block',
        background: 'var(--accent)',
    },
    textBlock: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1px',
        minWidth: 0,
    },
    name: {
        fontSize: '13px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '140px',
    },
    nameCompact: {
        fontSize: '13px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '140px',
    },
    role: {
        fontSize: '11px',
        fontWeight: 500,
        color: 'var(--accent)',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '140px',
    },
    roleCompact: {
        fontSize: '11px',
        fontWeight: 500,
        color: 'var(--accent)',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '140px',
    },
};

export default function ProfileButton({ onNavigate, currentUser, compact = false }) {
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
            style={compact ? styles.pillCompact : styles.pill}
        >
            {avatarUrl ? (
                <img src={avatarUrl} alt={currentUser?.name || 'Avatar'} style={compact ? styles.avatarCompact : styles.avatar} />
            ) : (
                <span aria-hidden="true" style={compact ? styles.avatarCompact : styles.avatar} />
            )}
            <span style={styles.textBlock}>
                <span style={compact ? styles.nameCompact : styles.name}>{currentUser?.name || 'Utilizador'}</span>
                <span style={compact ? styles.roleCompact : styles.role}>{cargoLabel(currentUser)}</span>
            </span>
        </button>
    );
}
