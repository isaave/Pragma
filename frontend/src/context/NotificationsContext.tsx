import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { ReactNode } from 'react';
import api from '../Services/api';
import {
    playNotificationSound,
    registerAudioUnlockListeners,
} from '../lib/notificationSound';
import type {
    AppNotification,
    MarkReadResponse,
    NotificationsResponse,
} from '../types/notifications';

interface NotificationsContextValue {
    notifications: AppNotification[];
    unreadCount: number;
    loading: boolean;
    refresh: () => Promise<void>;
    markAsRead: (id: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const POLL_INTERVAL_MS = 15_000;

function normalizeNotification(raw: any): AppNotification {
    const target = raw?.target && typeof raw.target === 'object' ? raw.target : {};

    return {
        id: Number(raw?.id),
        title: String(raw?.title || 'Notificação'),
        message: String(raw?.message || ''),
        type: String(raw?.type || 'order_status') as AppNotification['type'],
        target: {
            view: String(target.view || 'orders') as AppNotification['target']['view'],
            resourceType: target.resourceType
                ? (String(target.resourceType) as AppNotification['target']['resourceType'])
                : undefined,
            resourceId: target.resourceId ?? undefined,
            highlight: Boolean(target.highlight),
        },
        isRead: Boolean(raw?.isRead ?? raw?.is_read),
        readAt: raw?.readAt ?? raw?.read_at ?? null,
        createdAt: String(raw?.createdAt ?? raw?.created_at ?? new Date().toISOString()),
    };
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    // IDs já vistos: usados para tocar o som uma única vez por alerta novo.
    const seenIds = useRef<Set<number>>(new Set());
    const initialized = useRef(false);
    const mounted = useRef(true);

    const refresh = useCallback(async () => {
        if (typeof window === 'undefined' || !window.localStorage.getItem('pragma_token')) {
            initialized.current = false;
            seenIds.current.clear();
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        try {
            const response = await api.get<NotificationsResponse>('/notifications');
            const incoming: AppNotification[] = Array.isArray(response.data?.notifications)
                ? response.data.notifications.map(normalizeNotification)
                : [];

            if (!mounted.current) return;

            const isFirstLoad = !initialized.current;
            const freshIds = incoming
                .map((item) => item.id)
                .filter((id) => !seenIds.current.has(id));

            incoming.forEach((item) => seenIds.current.add(item.id));
            initialized.current = true;

            setNotifications(incoming);
            setUnreadCount(
                typeof response.data?.unreadCount === 'number'
                    ? response.data.unreadCount
                    : incoming.filter((item) => !item.isRead).length,
            );

            if (!isFirstLoad && freshIds.length > 0) {
                playNotificationSound();
            }
        } catch {
            // Sem notificações ou falha temporária: manter o estado atual.
        } finally {
            if (mounted.current) setLoading(false);
        }
    }, []);

    const markAsRead = useCallback(async (id: number) => {
        try {
            const response = await api.post<MarkReadResponse>(`/notifications/${id}/read`);
            if (!mounted.current) return;

            const updated = normalizeNotification(response.data?.notification ?? { id, isRead: true });
            setNotifications((current) =>
                current.map((item) => (item.id === id ? { ...item, ...updated, isRead: true } : item)),
            );
            setUnreadCount((current) =>
                typeof response.data?.unreadCount === 'number'
                    ? response.data.unreadCount
                    : Math.max(0, current - 1),
            );
        } catch {
            // Mesmo sem API, marcar localmente para não prender a interação.
            if (!mounted.current) return;
            setNotifications((current) =>
                current.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
            );
            setUnreadCount((current) => Math.max(0, current - 1));
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await api.post('/notifications/read-all');
        } catch {
            // A atualização local abaixo ainda mantém a UI consistente.
        }
        if (!mounted.current) return;
        setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
        setUnreadCount(0);
    }, []);

    useEffect(() => {
        mounted.current = true;
        registerAudioUnlockListeners();
        setLoading(true);
        void refresh();

        const interval = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
        const handleRefresh = () => void refresh();
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') void refresh();
        };
        const handleLogout = () => {
            setNotifications([]);
            setUnreadCount(0);
            seenIds.current.clear();
            initialized.current = false;
        };

        window.addEventListener('pragma:notifications-refresh', handleRefresh);
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('pragma:logout', handleLogout);

        return () => {
            mounted.current = false;
            window.clearInterval(interval);
            window.removeEventListener('pragma:notifications-refresh', handleRefresh);
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('pragma:logout', handleLogout);
        };
    }, [refresh]);

    const value = useMemo<NotificationsContextValue>(
        () => ({ notifications, unreadCount, loading, refresh, markAsRead, markAllAsRead }),
        [notifications, unreadCount, loading, refresh, markAsRead, markAllAsRead],
    );

    return (
        <NotificationsContext.Provider value={value}>
            {children}
        </NotificationsContext.Provider>
    );
}

export function useNotifications(): NotificationsContextValue {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error('useNotifications deve ser usado dentro de NotificationsProvider.');
    }
    return context;
}
