import React, { useEffect, useRef, useState } from 'react';
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
    titleTopSize: '20px',
    subtitleSize: '10px',
    dividerHeight: '1px',
};

let nextModalId = 0;

export default function Modal({
    open,
    onClose,
    title,
    titleSize,
    subtitle,
    children,
    maxWidth = 640,
    titleExtra,
    showDivider = true,
    closePlacement = 'inline',
    className,
    titleNode,
    headerActions,
    ariaLabel,
    headerStart,
    centerTitle = false,
    titleInline = false,
}) {
    const [titleId] = useState(() => `pragma-modal-title-${++nextModalId}`);
    const dialogRef = useRef(null);
    const onCloseRef = useRef(onClose);
    const previouslyFocusedRef = useRef(null);

    // Mantém o handler atual sem reiniciar o efeito (e o foco) a cada renderização.
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        previouslyFocusedRef.current = document.activeElement;

        const dialog = dialogRef.current;
        const focusableSelector = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
        ].join(', ');
        const getFocusable = () => (dialog
            ? [...dialog.querySelectorAll(focusableSelector)].filter((el) => el.offsetParent !== null)
            : []);

        // Foco inicial no primeiro campo editável (ou no botão de fechar).
        const focusFrame = requestAnimationFrame(() => {
            const focusable = getFocusable();
            const firstField = focusable.find((el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName));
            (firstField || focusable[0] || dialog)?.focus?.({ preventScroll: true });
        });

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onCloseRef.current();
                return;
            }
            if (event.key !== 'Tab' || !dialog) return;

            const focusable = getFocusable();
            if (!focusable.length) {
                event.preventDefault();
                dialog.focus({ preventScroll: true });
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;
            if (!dialog.contains(active)) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus({ preventScroll: true });
            } else if (event.shiftKey && active === first) {
                event.preventDefault();
                last.focus({ preventScroll: true });
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus({ preventScroll: true });
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            cancelAnimationFrame(focusFrame);
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
            const previouslyFocused = previouslyFocusedRef.current;
            if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
                previouslyFocused.focus({ preventScroll: true });
            }
        };
    }, [open]);

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
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleNode ? undefined : titleId}
                aria-label={titleNode ? ariaLabel : undefined}
                tabIndex={-1}
                onClick={event => event.stopPropagation()}
                className={className}
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
                {closePlacement === 'top' && titleInline && !centerTitle ? (
                    // Título e status centralizados na mesma linha do botão de fechar.
                    <div
                        style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: SIZES.headerGap,
                            padding: '18px 64px 14px',
                        }}
                    >
                        <div style={{ minWidth: 0, textAlign: 'center' }}>
                            {titleNode ? (
                                titleNode
                            ) : (
                                <h2
                                    id={titleId}
                                    style={{
                                        margin: 0,
                                        fontSize: titleSize || SIZES.titleTopSize,
                                        fontWeight: 700,
                                        color: COLORS.title,
                                        lineHeight: 1.3,
                                    }}
                                >
                                    {title}
                                </h2>
                            )}
                            {subtitle && (
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
                            )}
                            {titleExtra && <div style={{ marginTop: '6px' }}>{titleExtra}</div>}
                        </div>
                        <div
                            style={{
                                position: 'absolute',
                                top: '18px',
                                right: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            {headerActions}
                            <CloseButton onClick={onClose} />
                        </div>
                    </div>
                ) : closePlacement === 'top' && centerTitle ? (
                    // Título centralizado na mesma linha do botão de fechar.
                    <div
                        style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: SIZES.headerGap,
                            padding: '18px 20px 14px',
                        }}
                    >
                        <div style={{ minWidth: 0, textAlign: 'center' }}>
                            {titleNode ? (
                                titleNode
                            ) : (
                                <h2
                                    id={titleId}
                                    style={{
                                        margin: 0,
                                        fontSize: titleSize || SIZES.titleTopSize,
                                        fontWeight: 700,
                                        color: COLORS.title,
                                        lineHeight: 1.3,
                                    }}
                                >
                                    {title}
                                </h2>
                            )}
                            {subtitle && (
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
                            )}
                            {titleExtra && <div style={{ marginTop: '6px' }}>{titleExtra}</div>}
                        </div>
                        <div
                            style={{
                                position: 'absolute',
                                top: '18px',
                                right: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            {headerActions}
                            <CloseButton onClick={onClose} />
                        </div>
                    </div>
                ) : closePlacement === 'top' ? (
                    <>
                        {headerStart ? (
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '18px 20px 0',
                                }}
                            >
                                {headerStart}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {headerActions}
                                    <CloseButton onClick={onClose} />
                                </div>
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    padding: '18px 20px 0',
                                }}
                            >
                                {headerActions}
                                <CloseButton onClick={onClose} />
                            </div>
                        )}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: SIZES.headerGap,
                                padding: '10px 20px 18px',
                            }}
                        >
                            <div style={{ minWidth: 0 }}>
                                {titleNode ? (
                                    titleNode
                                ) : (
                                    <h2
                                        id={titleId}
                                        style={{
                                            margin: 0,
                                            fontSize: titleSize || SIZES.titleTopSize,
                                            fontWeight: 700,
                                            color: COLORS.title,
                                            lineHeight: 1.3,
                                        }}
                                    >
                                        {title}
                                    </h2>
                                )}
                                {subtitle && (
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
                                )}
                            </div>
                            {titleExtra && <div style={{ flexShrink: 0 }}>{titleExtra}</div>}
                        </div>
                    </>
                ) : (
                    <div
                        style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: centerTitle ? 'center' : 'space-between',
                            gap: SIZES.headerGap,
                            padding: SIZES.padding,
                        }}
                    >
                        <div
                            style={{
                                minWidth: 0,
                                flex: centerTitle ? 1 : undefined,
                                textAlign: centerTitle ? 'center' : undefined,
                            }}
                        >
                            {titleNode ? (
                                titleNode
                            ) : (
                                <h2
                                    id={titleId}
                                    style={{
                                        margin: 0,
                                        fontSize: titleSize || SIZES.titleSize,
                                        fontWeight: 700,
                                        color: COLORS.title,
                                        lineHeight: 1.3,
                                    }}
                                >
                                    {title}
                                </h2>
                            )}
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
                        {titleExtra || headerActions || centerTitle ? (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: SIZES.headerGap,
                                    flexShrink: 0,
                                    ...(centerTitle ? { position: 'absolute', top: '18px', right: '20px' } : {}),
                                }}
                            >
                                {!centerTitle && titleExtra}
                                {!centerTitle && headerActions}
                                <CloseButton onClick={onClose} />
                            </div>
                        ) : (
                            <CloseButton onClick={onClose} />
                        )}
                    </div>
                )}
                {showDivider && <div style={{ height: SIZES.dividerHeight, background: COLORS.divider }} />}
                <div style={{ padding: SIZES.padding }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
