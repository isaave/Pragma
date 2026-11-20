import React, { useEffect, useState } from 'react';
import CloseButton from './CloseButton';

// Uso:
// <Modal open={modal === 'create'} onClose={closeModal} title="Novo Usuário" subtitle="...">
//     <form>...</form>
// </Modal>

// TODO: confirmar no Dev Mode do Figma (valores aproximados)
const COLORS = {
    overlay: 'var(--users-modal-overlay, rgba(46, 26, 120, 0.45))',
    card: 'var(--card-bg, #ffffff)',
    title: 'var(--text-primary, #03071e)',
    subtitle: 'var(--accent, #312e81)',
    divider: 'var(--border-color, #e2e8f0)',
};

// TODO: confirmar no Dev Mode do Figma (valores aproximados)
const SIZES = {
    cardRadius: '14px',
    cardShadow: '0 12px 40px rgba(3, 7, 30, 0.28)',
    cardWidth: '90%',
    cardMaxHeight: '90vh',
    padding: '18px 20px',
    headerGap: '12px',
    titleSize: '16px',
    subtitleSize: '10px',
    dividerHeight: '1px',
};

let nextModalId = 0;

export default function Modal({ open, onClose, title, subtitle, children, maxWidth = 640 }) {
    const [titleId] = useState(() => `pragma-modal-title-${++nextModalId}`);

    useEffect(() => {
        if (!open) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, onClose]);

    if (!open) return null;

    const resolvedMaxWidth = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;
    const cardWidth = `min(${SIZES.cardWidth}, ${resolvedMaxWidth})`;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                padding: '16px',
                background: COLORS.overlay,
            }}
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={event => event.stopPropagation()}
                style={{
                    boxSizing: 'border-box',
                    width: cardWidth,
                    maxWidth: resolvedMaxWidth,
                    maxHeight: SIZES.cardMaxHeight,
                    overflowY: 'auto',
                    background: COLORS.card,
                    borderRadius: SIZES.cardRadius,
                    boxShadow: SIZES.cardShadow,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: SIZES.headerGap,
                        padding: SIZES.padding,
                    }}
                >
                    <div style={{ minWidth: 0 }}>
                        <h2
                            id={titleId}
                            style={{
                                margin: 0,
                                fontSize: SIZES.titleSize,
                                fontWeight: 700,
                                color: COLORS.title,
                                lineHeight: 1.3,
                            }}
                        >
                            {title}
                        </h2>
                        <p
                            style={{
                                margin: '3px 0 0',
                                fontSize: SIZES.subtitleSize,
                                color: COLORS.subtitle,
                                lineHeight: 1.4,
                            }}
                        >
                            {subtitle}
                        </p>
                    </div>
                    <CloseButton onClick={onClose} />
                </div>
                <div style={{ height: SIZES.dividerHeight, background: COLORS.divider }} />
                <div style={{ padding: SIZES.padding }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
