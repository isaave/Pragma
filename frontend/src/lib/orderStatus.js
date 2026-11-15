import { AlertTriangle, Bike, CheckCircle2, ChefHat, Clock, Loader2, PackageX, XCircle } from 'lucide-react';

/* Estados possíveis do pedido */
export const STATUS_META = {
    pending: { label: 'Pendente', tone: 'pending', icon: Clock },
    development: { label: 'Em desenvolvimento', tone: 'development', icon: Loader2 },
    preparing: { label: 'Preparando', tone: 'preparing', icon: ChefHat },
    ready: { label: 'Pronto', tone: 'ready', icon: CheckCircle2 },
    delivered: { label: 'Entregue', tone: 'delivered', icon: Bike },
    cancelled: { label: 'Cancelado', tone: 'cancelled', icon: XCircle, needsReason: true },
    not_delivered: { label: 'Não entregue', tone: 'not_delivered', icon: PackageX, needsReason: true },
    late: { label: 'Atrasado', tone: 'late', icon: AlertTriangle, needsReason: true },
};

export const STATUS_ORDER = [
    'pending',
    'preparing',
    'ready',
    'delivered',
    'development',
    'cancelled',
    'not_delivered',
    'late',
];

/* Status que exigem motivo */
export const REASON_STATUSES = ['cancelled', 'not_delivered', 'late'];

/* Status considerados "em aberto" */
export const OPEN_STATUSES = ['pending', 'development', 'preparing', 'ready'];

export const FILTERS = [
    { key: 'all', label: 'Todos' },
    { key: 'pending', label: 'Pendente' },
    { key: 'preparing', label: 'Preparando' },
    { key: 'ready', label: 'Pronto' },
    { key: 'delivered', label: 'Entregue' },
    { key: 'cancelled', label: 'Cancelado' },
    { key: 'not_delivered', label: 'Não entregue' },
    { key: 'late', label: 'Atrasado' },
];

export const formatPrice = (value) =>
    Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatDateTime = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const orderNumber = (id) => `#${String(id).padStart(4, '0')}`;

export const getErrorMessage = (err, fallback) => {
    const data = err?.response?.data;
    if (data?.errors) return Object.values(data.errors).flat().join(' ');
    if (data?.message) return data.message;
    return fallback;
};

/* Histórico do pedido (com fallback para pedidos antigos) */
export const getHistory = (order) => {
    const list = Array.isArray(order.status_history) ? order.status_history : [];
    if (list.length > 0) return list;
    return [
        {
            id: `fallback-${order.id}`,
            status: order.status,
            reason: null,
            created_at: order.created_at,
            user: order.user,
        },
    ];
};

export const isToday = (value) => {
    if (!value) return false;
    const d = new Date(value);
    const now = new Date();
    return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
    );
};
