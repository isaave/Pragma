import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    History as HistoryIcon,
    Search,
    Loader2,
    XCircle,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    Clock,
    User,
    ShoppingCart,
} from 'lucide-react';
import api from '../Services/api';
import {
    STATUS_META,
    STATUS_ORDER,
    formatDateTime,
    formatPrice,
    getErrorMessage,
    getHistory,
    orderNumber,
} from '../lib/orderStatus';
import '../styles/orders.css';

export default function History() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expandedKey, setExpandedKey] = useState(null);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/orders');
            setOrders(res.data || []);
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao carregar o histórico de pedidos.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    /* Todos os eventos de status, do mais recente para o mais antigo */
    const events = useMemo(() => {
        const list = [];
        orders.forEach((order) => {
            getHistory(order).forEach((entry) => {
                list.push({
                    key: `${order.id}-${entry.id ?? entry.created_at}-${entry.status}`,
                    order,
                    status: entry.status,
                    reason: entry.reason,
                    created_at: entry.created_at,
                    user: entry.user,
                });
            });
        });
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return list;
    }, [orders]);

    const stats = useMemo(
        () => ({
            orders: orders.length,
            events: events.length,
            cancelled: events.filter((event) => event.status === 'cancelled').length,
            problems: events.filter((event) =>
                ['not_delivered', 'late'].includes(event.status)
            ).length,
        }),
        [orders, events]
    );

    const filteredEvents = useMemo(() => {
        const term = search.trim().toLowerCase();
        return events.filter((event) => {
            if (statusFilter !== 'all' && event.status !== statusFilter) return false;
            if (!term) return true;
            const haystack = [
                event.order.id,
                String(event.order.id).padStart(4, '0'),
                event.order.customer_name || '',
                event.user?.name || '',
                event.reason || '',
            ]
                .join(' ')
                .toLowerCase();
            return haystack.includes(term);
        });
    }, [events, search, statusFilter]);

    const toggleDetails = (key) => {
        setExpandedKey((prev) => (prev === key ? null : key));
    };

    return (
        <div className="orders-page">
            <header className="page-head">
                <div>
                    <h1 className="page-title">Histórico de Pedidos</h1>
                    <p className="page-sub">
                        Todas as alterações de status, com data, hora, responsável e motivo.
                    </p>
                </div>
            </header>

            <div className="stat-row">
                <div className="stat-card accent">
                    <span className="stat-label">Pedidos registados</span>
                    <span className="stat-value">{stats.orders}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Alterações de status</span>
                    <span className="stat-value">{stats.events}</span>
                </div>
                <div className="stat-card danger">
                    <span className="stat-label">Cancelamentos</span>
                    <span className="stat-value">{stats.cancelled}</span>
                </div>
                <div className="stat-card warning">
                    <span className="stat-label">Atrasos / não entregues</span>
                    <span className="stat-value">{stats.problems}</span>
                </div>
            </div>

            {error && (
                <div className="notice notice-error">
                    <XCircle size={16} /> {error}
                </div>
            )}

            <section className="panel">
                <div className="panel-head">
                    <div>
                        <h2 className="panel-title">
                            <HistoryIcon size={18} /> Linha do tempo
                        </h2>
                        <p className="panel-sub">
                            {filteredEvents.length} registo(s) encontrados.
                        </p>
                    </div>
                </div>

                <div className="history-toolbar">
                    <div className="field">
                        <label htmlFor="history-search">Buscar</label>
                        <div style={{ position: 'relative' }}>
                            <Search
                                size={16}
                                style={{
                                    position: 'absolute',
                                    left: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)',
                                }}
                            />
                            <input
                                id="history-search"
                                className="input"
                                type="search"
                                placeholder="Nº do pedido, cliente, motivo..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ paddingLeft: 36 }}
                            />
                        </div>
                    </div>

                    <div className="field">
                        <label htmlFor="history-status">Status</label>
                        <select
                            id="history-status"
                            className="select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Todos os status</option>
                            {STATUS_ORDER.map((status) => (
                                <option key={status} value={status}>
                                    {STATUS_META[status].label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-row">
                        <Loader2 size={16} className="spin" /> A carregar histórico...
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="empty">
                        <ClipboardList size={28} />
                        Nenhuma alteração de status encontrada.
                    </div>
                ) : (
                    <div className="event-list">
                        {filteredEvents.map((event) => {
                            const meta = STATUS_META[event.status] || {
                                label: event.status,
                                tone: 'pending',
                                icon: Clock,
                            };
                            const Icon = meta.icon;
                            const expanded = expandedKey === event.key;
                            const itemCount = (event.order.items || []).reduce(
                                (sum, item) => sum + item.quantity,
                                0
                            );

                            return (
                                <article className="event" key={event.key}>
                                    <span className={`timeline-dot tone-${meta.tone}`} />
                                    <div className="event-body">
                                        <div className="event-top">
                                            <span className="event-order">
                                                {orderNumber(event.order.id)}
                                            </span>
                                            <span className="event-customer">
                                                {event.order.customer_name || 'Sem cliente'}
                                            </span>
                                            <span className={`badge tone-${meta.tone}`}>
                                                <Icon size={13} />
                                                {meta.label}
                                            </span>
                                            <span className="event-date">
                                                {formatDateTime(event.created_at)}
                                            </span>
                                        </div>

                                        {event.reason && (
                                            <div className="event-reason">
                                                Motivo: {event.reason}
                                            </div>
                                        )}

                                        <span className="event-user">
                                            Registado por {event.user?.name || 'sistema'}
                                        </span>

                                        <div>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => toggleDetails(event.key)}
                                            >
                                                {expanded ? (
                                                    <ChevronUp size={14} />
                                                ) : (
                                                    <ChevronDown size={14} />
                                                )}
                                                {expanded ? 'Ocultar pedido' : 'Ver pedido'}
                                            </button>
                                        </div>

                                        {expanded && (
                                            <div className="event-details">
                                                <div className="order-items">
                                                    {(event.order.items || []).map((item) => (
                                                        <div key={item.id}>
                                                            <div className="order-item">
                                                                <span>
                                                                    <span className="order-item-qty">
                                                                        {item.quantity}×
                                                                    </span>
                                                                    {item.product?.name || 'Produto'}
                                                                </span>
                                                                <span>{formatPrice(item.subtotal)}</span>
                                                            </div>
                                                            {(item.addons || []).map((addon) => (
                                                                <div
                                                                    className="order-item-addon"
                                                                    key={addon.id}
                                                                >
                                                                    + {addon.quantity}×{' '}
                                                                    {addon.addon?.name || 'Adicional'}
                                                                </div>
                                                            ))}
                                                            {item.notes && (
                                                                <div className="order-item-note">
                                                                    Obs.: {item.notes}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="order-meta">
                                                    <span>
                                                        <ShoppingCart
                                                            size={12}
                                                            style={{ verticalAlign: '-2px', marginRight: 4 }}
                                                        />
                                                        {itemCount} item(ns) · Total{' '}
                                                        {formatPrice(event.order.total)}
                                                    </span>
                                                    <span>
                                                        <User
                                                            size={12}
                                                            style={{ verticalAlign: '-2px', marginRight: 4 }}
                                                        />
                                                        Aberto por {event.order.user?.name || '—'}
                                                    </span>
                                                </div>

                                                {event.order.notes && (
                                                    <div className="order-note">
                                                        <strong>Observações do pedido:</strong>{' '}
                                                        {event.order.notes}
                                                    </div>
                                                )}

                                                <div className="timeline">
                                                    {getHistory(event.order).map((entry) => {
                                                        const entryMeta =
                                                            STATUS_META[entry.status] || {
                                                                label: entry.status,
                                                                tone: 'pending',
                                                            };
                                                        return (
                                                            <div
                                                                className="timeline-item"
                                                                key={entry.id}
                                                            >
                                                                <span
                                                                    className={`timeline-dot tone-${entryMeta.tone}`}
                                                                />
                                                                <div className="timeline-content">
                                                                    <span className="timeline-status">
                                                                        {entryMeta.label}
                                                                    </span>
                                                                    <span className="timeline-date">
                                                                        {formatDateTime(entry.created_at)}
                                                                        {entry.user?.name
                                                                            ? ` · por ${entry.user.name}`
                                                                            : ''}
                                                                    </span>
                                                                    {entry.reason && (
                                                                        <span className="timeline-reason">
                                                                            Motivo: {entry.reason}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
