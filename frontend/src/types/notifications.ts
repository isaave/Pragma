/** Tipos compartilhados do sistema de notificações do Pragma. */

export type NotificationView =
    | 'orders'
    | 'history'
    | 'menu'
    | 'stock'
    | 'reports'
    | 'admin'
    | 'profile';

export type NotificationResourceType =
    | 'ingredient'
    | 'order'
    | 'expense'
    | 'store_session';

export type NotificationType =
    | 'low_stock'
    | 'critical_stock'
    | 'new_order'
    | 'order_status'
    | 'expense'
    | 'store_status';

/** Destino usado pelo botão de notificação para navegar até a origem do alerta. */
export interface NotificationTarget {
    view: NotificationView;
    resourceType?: NotificationResourceType;
    resourceId?: string | number;
    /** Quando true, a tela de destino deve destacar/focar o registro. */
    highlight?: boolean;
}

export interface AppNotification {
    id: number;
    title: string;
    message: string;
    type: NotificationType;
    target: NotificationTarget;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
}

export interface NotificationsResponse {
    notifications: AppNotification[];
    unreadCount: number;
}

export interface MarkReadResponse {
    notification: AppNotification;
    unreadCount: number;
}
