import React from 'react';

// Uso:
// <StatusBadge label="Estoque baixo" tone="warning" />

// TODO: confirmar no Dev Mode do Figma (valores aproximados)
const TONES = {
    neutral: {
        background: 'var(--bg-tertiary, #f8fafc)',
        color: 'var(--text-primary, #03071e)',
    },
    danger: {
        background: 'color-mix(in srgb, var(--danger, #b91c1c) 12%, var(--card-bg, #ffffff))',
        color: 'var(--danger, #b91c1c)',
    },
    warning: {
        background: 'color-mix(in srgb, var(--warning, #92400e) 12%, var(--card-bg, #ffffff))',
        color: 'var(--warning, #92400e)',
    },
    success: {
        background: 'color-mix(in srgb, var(--success, #15803d) 12%, var(--card-bg, #ffffff))',
        color: 'var(--success, #15803d)',
    },
};

export default function StatusBadge({ label, tone = 'neutral' }) {
    const colors = TONES[tone] || TONES.neutral;

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '10px',
                fontWeight: 600,
                lineHeight: 1.4,
                whiteSpace: 'nowrap',
                background: colors.background,
                color: colors.color,
            }}
        >
            {label}
        </span>
    );
}
