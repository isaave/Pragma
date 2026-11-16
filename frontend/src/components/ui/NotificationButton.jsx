import React from 'react';
import { Bell } from 'lucide-react';

// Uso:
// <NotificationButton onClick={() => setNotificacoesAbertas(true)} />

// TODO: confirmar no Dev Mode do Figma (valores aproximados)
const COLORS = {
    background: '#b9cdea', // azul-claro acinzentado
    hoverBackground: '#a6bfe2', // levemente mais escuro no hover
    icon: '#03071e', // azul-marinho escuro
    focusRing: '#6366f1',
};

// TODO: confirmar no Dev Mode do Figma (valores aproximados)
const SIZES = {
    buttonSize: '32px',
    borderRadius: '50%',
    iconSize: 16,
    iconStrokeWidth: 1.5,
    transition: 'background-color 150ms ease',
    focusRingWidth: '2px',
    focusRingOffset: '2px',
};

// O fundo base e o hover ficam no CSS injetado: estilo inline sempre vence
// a regra :hover da folha de estilos, então manter os dois aqui evita !important.
const INJECTED_CSS = `
[data-notification-button] {
    background: ${COLORS.background};
}
[data-notification-button]:hover {
    background: ${COLORS.hoverBackground};
}
[data-notification-button]:focus-visible {
    outline: ${SIZES.focusRingWidth} solid ${COLORS.focusRing};
    outline-offset: ${SIZES.focusRingOffset};
}
`;

const styles = {
    button: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
        boxSizing: 'border-box',
        width: SIZES.buttonSize,
        height: SIZES.buttonSize,
        margin: 0,
        padding: 0,
        border: 'none',
        boxShadow: 'none',
        borderRadius: SIZES.borderRadius,
        color: COLORS.icon,
        cursor: 'pointer',
        transition: SIZES.transition,
    },
};

export default function NotificationButton({ onClick, ariaLabel = 'Notificações', style }) {
    return (
        <>
            <style>{INJECTED_CSS}</style>
            <button
                type="button"
                aria-label={ariaLabel}
                title={ariaLabel}
                onClick={onClick}
                data-notification-button=""
                style={{ ...styles.button, ...style }}
            >
                <Bell
                    size={SIZES.iconSize}
                    strokeWidth={SIZES.iconStrokeWidth}
                    aria-hidden="true"
                />
            </button>
        </>
    );
}
