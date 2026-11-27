import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Package, ShoppingBag } from 'lucide-react';
import { useNotifications } from '../context/NotificationsContext';
import type { AppNotification, NotificationType } from '../types/notifications';
import '../styles/notifications.css';

interface NotificationButtonProps {
    /** Navega até a tela/registro que originou o alerta. */
    onNavigate: (notification: AppNotification) => void;
}

const TYPE_LABELS: Record<NotificationType, string> = {
    low_stock: 'Estoque baixo',
    critical_stock: 'Estoque crítico',
    new_order: 'Novo pedido',
    order_status: 'Pedido',
    expense: 'Saída',
    store_status: 'Negócio',
};

function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function targetLabel(notification: AppNotification): string {
    const viewLabels: Record<string, string> = {
        orders: 'Gestão de Pedidos',
        history: 'Histórico de pedidos',
        menu: 'Produtos',
        stock: 'Estoque',
        reports: 'Relatórios',
        admin: 'Usuários',
        profile: 'Meu perfil',
    };
    return viewLabels[notification.target.view] || 'a tela correspondente';
}

export default function NotificationButton({ onNavigate }: NotificationButtonProps) {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [open, setOpen] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const firstItemRef = useRef<HTMLButtonElement>(null);
    const panelId = 'pragma-notifications-panel';

    const close = useCallback((returnFocus = false) => {
        setOpen(false);
        if (returnFocus) triggerRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                close(true);
            }
        };
        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) close();
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('pointerdown', handlePointerDown);
        const focusTimer = window.setTimeout(() => firstItemRef.current?.focus(), 0);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('pointerdown', handlePointerDown);
            window.clearTimeout(focusTimer);
        };
    }, [open, close]);

    const handleItemClick = async (notification: AppNotification) => {
        await markAsRead(notification.id);
        close();
        onNavigate(notification);
    };

    const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

    return (
        <div className="notification-wrapper" ref={containerRef}>
            <button
                type="button"
                ref={triggerRef}
                className="notification-button"
                onClick={() => setOpen((current) => !current)}
                title="Notificações"
                aria-label={
                    unreadCount > 0
                        ? `Notificações, ${unreadCount} não lida${unreadCount === 1 ? '' : 's'}`
                        : 'Notificações, nenhuma não lida'
                }
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls={open ? panelId : undefined}
            >
                <Bell size={18} strokeWidth={2} aria-hidden="true" />
                {unreadCount > 0 && (
                    <span className="notification-badge" aria-hidden="true">
                        {badgeLabel}
                    </span>
                )}
            </button>

            {open && (
                <div className="notification-panel" id={panelId} role="dialog" aria-label="Notificações">
                    <div className="notification-panel__header">
                        <div>
                            <h2 className="notification-panel__title">Notificações</h2>
                            <p className="notification-panel__subtitle">
                                {unreadCount > 0
                                    ? `${unreadCount} não lida${unreadCount === 1 ? '' : 's'}`
                                    : 'Tudo em dia'}
                            </p>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                className="notification-panel__mark-all"
                                onClick={() => void markAllAsRead()}
                                aria-label="Marcar todas as notificações como lidas"
                                title="Marcar todas como lidas"
                            >
                                <CheckCheck size={15} aria-hidden="true" />
                            </button>
                        )}
                    </div>

                    {notifications.length === 0 ? (
                        <p className="notification-panel__empty">Sem notificações.</p>
                    ) : (
                        <ul className="notification-panel__list">
                            {notifications.map((notification, index) => {
                                const Icon = notification.type === 'low_stock'
                                    || notification.type === 'critical_stock'
                                    ? Package
                                    : ShoppingBag;

                                return (
                                    <li key={notification.id} className="notification-panel__item">
                                        <button
                                            type="button"
                                            ref={index === 0 ? firstItemRef : undefined}
                                            className={`notification-panel__button${notification.isRead ? '' : ' is-unread'}`}
                                            onClick={() => void handleItemClick(notification)}
                                            aria-label={`${notification.title}. ${notification.message}. Abrir ${targetLabel(notification)}.`}
                                        >
                                            <span className="notification-panel__icon" aria-hidden="true">
                                                <Icon size={15} />
                                            </span>
                                            <span className="notification-panel__content">
                                                <span className="notification-panel__meta">
                                                    <span className="notification-panel__type">
                                                        {TYPE_LABELS[notification.type] || 'Alerta'}
                                                    </span>
                                                    <time dateTime={notification.createdAt}>
                                                        {formatDate(notification.createdAt)}
                                                    </time>
                                                </span>
                                                <strong className="notification-panel__heading">
                                                    {notification.title}
                                                </strong>
                                                <span className="notification-panel__message">
                                                    {notification.message}
                                                </span>
                                            </span>
                                            {!notification.isRead && (
                                                <span className="notification-panel__dot" aria-hidden="true" />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
