import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import './SideDrawer.css';

export type SideDrawerSize = 'sm' | 'md' | 'lg';

export interface SideDrawerProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    eyebrow?: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: SideDrawerSize;
    ariaLabel?: string;
    closeOnBackdrop?: boolean;
}

/**
 * Painel lateral fixo à direita usado por todos os fluxos de CRUD/status.
 * Substitui modais centralizados para que o contexto da página continue visível.
 */
export default function SideDrawer({
    open,
    onClose,
    title,
    subtitle,
    eyebrow,
    children,
    footer,
    size = 'md',
    ariaLabel,
    closeOnBackdrop = true,
}: SideDrawerProps) {
    const panelRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!open) return undefined;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        panelRef.current?.focus();

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div className="side-drawer-root">
            <button
                type="button"
                className="side-drawer-backdrop"
                aria-label="Fechar painel"
                tabIndex={-1}
                onClick={closeOnBackdrop ? onClose : undefined}
            />
            <aside
                ref={panelRef}
                className={`side-drawer side-drawer--${size}`}
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel ?? title}
                tabIndex={-1}
            >
                <header className="side-drawer-header">
                    <div className="side-drawer-heading">
                        {eyebrow && <span className="side-drawer-eyebrow">{eyebrow}</span>}
                        <h2 className="side-drawer-title">{title}</h2>
                        {subtitle && <p className="side-drawer-subtitle">{subtitle}</p>}
                    </div>
                    <button
                        type="button"
                        className="side-drawer-close"
                        onClick={onClose}
                        aria-label="Fechar painel"
                        title="Fechar"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>

                <div className="side-drawer-body">{children}</div>

                {footer && <footer className="side-drawer-footer">{footer}</footer>}
            </aside>
        </div>,
        document.body,
    );
}
