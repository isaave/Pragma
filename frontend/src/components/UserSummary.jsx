import React from 'react';

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// ---- Estilos organizados ----
const styles = {
    pill: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 28px 12px 12px',
        background: '#ffffff',
        border: '1px solid #e6eaf0',
        borderRadius: '999px',
        boxSizing: 'border-box',
        maxWidth: '100%',
        fontFamily: FONT,
    },
    avatar: {
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
        display: 'block',
    },
    textBlock: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        minWidth: 0,
    },
    name: {
        fontSize: '20px',
        fontWeight: 700,
        color: '#0f172e',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    role: {
        fontSize: '13px',
        fontWeight: 500,
        color: '#6366f1',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
};

/**
 * Resumo de utilizador em formato de pílula.
 *
 * @param {string} name   Nome do utilizador
 * @param {string} role   Cargo/função (ex.: "Chefe")
 * @param {string} avatar URL opcional da foto de perfil
 * @param {string} color  Cor do círculo quando não há foto (default: azul Pragma)
 * @param {number} size   Diâmetro do avatar em px (default: 56)
 */
export default function UserSummary({
    name = 'Utilizador',
    role = '',
    avatar = null,
    color = '#1d4ed8',
    size = 56,
}) {
    const avatarSize = { width: `${size}px`, height: `${size}px` };

    return (
        <div style={styles.pill}>
            {avatar ? (
                <img src={avatar} alt={name} style={{ ...styles.avatar, ...avatarSize }} />
            ) : (
                <span
                    aria-hidden="true"
                    style={{ ...styles.avatar, ...avatarSize, background: color }}
                />
            )}
            <div style={styles.textBlock}>
                <span style={styles.name}>{name}</span>
                {role && <span style={styles.role}>{role}</span>}
            </div>
        </div>
    );
}
