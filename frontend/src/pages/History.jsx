import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

export default function History() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
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

    // Só pedidos com estado final (concluído ou cancelado) entram no histórico
    const concludedOrders = useMemo(
        () =>
            orders.filter((order) =>
                [
                    'delivered',
                    'cancelled',
                    'not_delivered',
                    'late',
                ].includes(order.status)
            ),
        [orders]
    );

    /* Todos os eventos de status, do mais recente para o mais antigo */
    const events = useMemo(() => {
        const list = [];
        concludedOrders.forEach((order) => {
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
    }, [concludedOrders]);

    const stats = useMemo(
        () => ({
            orders: concludedOrders.length,
            events: events.length,
            cancelled: events.filter((event) => event.status === 'cancelled').length,
            problems: events.filter((event) =>
                ['not_delivered', 'late'].includes(event.status)
            ).length,
        }),
        [concludedOrders, events]
    );

    const filteredEvents = useMemo(() => {
        const term = search.trim().toLowerCase();
        return events.filter((event) => {
            if (statusFilter !== 'all' && event.status !== statusFilter) return false;
            if (dateFilter && String(event.created_at).slice(0, 10) !== dateFilter) {
                return false;
            }
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
    }, [events, search, statusFilter, dateFilter]);

    const toggleDetails = (key) => {
        setExpandedKey((prev) => (prev === key ? null : key));
    };

    return (
        <div>
            <header>
                <h1>Histórico de Pedidos</h1>
                <p>
                    Todas as alterações de status, com data, hora, responsável e motivo.
                </p>
            </header>

            <p>
                Pedidos registados: {stats.orders} · Alterações de status: {stats.events} ·
                Cancelamentos: {stats.cancelled} · Atrasos / não entregues: {stats.problems}
            </p>

            {error && <p role="alert">{error}</p>}

            <section>
                <h2>Linha do tempo</h2>
                <p>{filteredEvents.length} registo(s) encontrados.</p>

                <div>
                    <div>
                        <label htmlFor="history-search">Buscar</label>
                        <input
                            id="history-search"
                            type="search"
                            placeholder="Nº do pedido, cliente, motivo..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="history-status">Status</label>
                        <select
                            id="history-status"
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

                    <div>
                        <label htmlFor="history-date">Data</label>
                        <input
                            id="history-date"
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <p>A carregar histórico...</p>
                ) : filteredEvents.length === 0 ? (
                    <p>Nenhuma alteração de status encontrada.</p>
                ) : (
                    <ul>
                        {filteredEvents.map((event) => {
                            const meta = STATUS_META[event.status] || { label: event.status };
                            const expanded = expandedKey === event.key;
                            const itemCount = (event.order.items || []).reduce(
                                (sum, item) => sum + item.quantity,
                                0
                            );

                            return (
                                <li key={event.key}>
                                    <p>
                                        {orderNumber(event.order.id)} —{' '}
                                        {event.order.customer_name || 'Sem cliente'} — {meta.label}
                                    </p>
                                    <p>
                                        Total: {formatPrice(event.order.total)} · {itemCount} item(ns)
                                    </p>
                                    <p>{formatDateTime(event.created_at)}</p>
                                    {event.reason && <p>Motivo: {event.reason}</p>}
                                    <p>Registado por {event.user?.name || 'sistema'}</p>

                                    <button type="button" onClick={() => toggleDetails(event.key)}>
                                        {expanded ? 'Ocultar pedido' : 'Ver pedido'}
                                    </button>

                                    {expanded && (
                                        <div>
                                            <ul>
                                                {(event.order.items || []).map((item) => (
                                                    <li key={item.id}>
                                                        {item.quantity}×{' '}
                                                        {item.product?.name || 'Produto'} —{' '}
                                                        {formatPrice(item.subtotal)}
                                                        {(item.addons || []).map((addon) => (
                                                            <div key={addon.id}>
                                                                + {addon.quantity}×{' '}
                                                                {addon.addon?.name || 'Adicional'}
                                                            </div>
                                                        ))}
                                                        {item.notes && <div>Obs.: {item.notes}</div>}
                                                    </li>
                                                ))}
                                            </ul>
                                            {event.order.notes && (
                                                <p>
                                                    <strong>Observações do pedido:</strong>{' '}
                                                    {event.order.notes}
                                                </p>
                                            )}
                                            <div>
                                                {getHistory(event.order).map((entry) => {
                                                    const entryMeta =
                                                        STATUS_META[entry.status] || {
                                                            label: entry.status,
                                                        };
                                                    return (
                                                        <p key={entry.id}>
                                                            {entryMeta.label} —{' '}
                                                            {formatDateTime(entry.created_at)}
                                                            {entry.user?.name
                                                                ? ` · por ${entry.user.name}`
                                                                : ''}
                                                            {entry.reason
                                                                ? ` — Motivo: ${entry.reason}`
                                                                : ''}
                                                        </p>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}
