import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import './FloatingPanel.css';

export interface FloatingPanelProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    eyebrow?: string;
    children: ReactNode;
    footer?: ReactNode;
    ariaLabel?: string;
    showExpand?: boolean;
    expanded?: boolean;
    onToggleExpand?: () => void;
    closeOnEscape?: boolean;
    /** Sem cabeçalho nem ícones: o próprio card é o conteúdo, como no mockup. */
    minimalHeader?: boolean;
    /** Renderiza dentro do fluxo da página, ao lado da grade, sem sobrepor nada. */
    inline?: boolean;
    /** Classe extra no conteúdo da tela cheia (usada pela variação expandida). */
    expandedContentClass?: string;
}

/**
 * Retângulo fixo à direita. No detalhe de pedido ele segue o estilo dos cards
 * da grade; nos formulários mantém cabeçalho e ações.
 */
export default function FloatingPanel({
    open,
    onClose,
    title,
    subtitle,
    eyebrow,
    children,
    footer,
    ariaLabel,
    showExpand = false,
    expanded = false,
    onToggleExpand,
    closeOnEscape = true,
    minimalHeader = false,
    inline = false,
    expandedContentClass,
}: FloatingPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const canExpand = showExpand && !!onToggleExpand;

    useEffect(() => {
        if (!open || expanded || !closeOnEscape) return undefined;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, expanded, closeOnEscape, onClose]);

    useEffect(() => {
        if (open && !expanded) panelRef.current?.focus();
    }, [open, expanded]);

    if (!open) return null;

    if (expanded) {
        const fullscreen = (
            <div
                className={`floating-panel-fullscreen${inline ? ' floating-panel-fullscreen--inline' : ''}`}
                role="dialog"
                aria-modal={inline ? undefined : true}
                aria-label={ariaLabel ?? title}
            >
                <div className={`orders-detail--fullscreen${expandedContentClass ? ` ${expandedContentClass}` : ''}`}>
                    {children}
                    {footer && (
                        <footer className="floating-panel__footer floating-panel__footer--fullscreen">
                            {footer}
                        </footer>
                    )}
                </div>
            </div>
        );

        if (inline) return fullscreen;
        return createPortal(fullscreen, document.body);
    }

    const panel = (
        <div
            ref={panelRef}
            className={`floating-panel${inline ? ' floating-panel--inline' : ''}${minimalHeader ? ' floating-panel--bare' : ''}`}
            role="dialog"
            aria-label={ariaLabel ?? title}
            tabIndex={-1}
            title={canExpand ? 'Duplo clique para expandir' : undefined}
            onDoubleClick={canExpand ? onToggleExpand : undefined}
        >
            {!minimalHeader && (
                <header className="floating-panel__header">
                    <div className="floating-panel__heading">
                        {eyebrow && <span className="floating-panel__eyebrow">{eyebrow}</span>}
                        <h2 className="floating-panel__title">{title}</h2>
                        {subtitle && <p className="floating-panel__subtitle">{subtitle}</p>}
                    </div>
                    <div className="floating-panel__actions">
                        <button
                            type="button"
                            className="floating-panel__icon"
                            onClick={onClose}
                            aria-label="Fechar painel"
                            title="Fechar"
                        >
                            <X size={16} aria-hidden="true" />
                        </button>
                    </div>
                </header>
            )}

            <div className="floating-panel__body">{children}</div>

            {footer && <footer className="floating-panel__footer">{footer}</footer>}
        </div>
    );

    if (inline) return panel;

    return createPortal(panel, document.body);
}
