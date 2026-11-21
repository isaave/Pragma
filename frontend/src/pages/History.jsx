import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Utensils } from 'lucide-react';
import api from '../Services/api';
import { exportOrderCsv, exportOrderPdf, exportOrderTxt } from '../lib/exportOrder';
import {
    STATUS_META,
    STATUS_ORDER,
    formatDateTime,
    formatPrice,
    getErrorMessage,
    getHistory,
    orderNumber,
} from '../lib/orderStatus';
import PageHeader from '../components/ui/PageHeader';
import ActionToolbar from '../components/ui/ActionToolbar';
import Modal from '../components/ui/Modal';
import '../styles/history.css';

const MONTHS = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
];

const year = new Date().getFullYear();
const pad = (value) => String(value).padStart(2, '0');

export default function History() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const [expandedKey, setExpandedKey] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [mostrarBusca, setMostrarBusca] = useState(false);
    const [mostrarFiltros, setMostrarFiltros] = useState(false);

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

    const monthCounts = useMemo(() => {
        const counts = Array(12).fill(0);
        events.forEach((event) => {
            const date = new Date(event.created_at);
            const month = date.getMonth();
            if (date.getFullYear() === year && month >= 0 && month < 12) {
                counts[month] += 1;
            }
        });
        return counts;
    }, [events]);

    const yearTotal = monthCounts.reduce((sum, count) => sum + count, 0);

    const monthEvents = useMemo(
        () =>
            filteredEvents.filter((event) => {
                const date = new Date(event.created_at);
                return date.getFullYear() === year && date.getMonth() === selectedMonth;
            }),
        [filteredEvents, selectedMonth]
    );

    const selectedEvent = events.find((e) => e.key === expandedKey) || null;
    const selectedOrder = selectedEvent?.order || null;
    const modalTitle = selectedOrder
        ? selectedOrder.customer_name || orderNumber(selectedOrder.id)
        : '';

    const toggleDetails = (key) => {
        setExpandedKey((prev) => (prev === key ? null : key));
    };

    const handleExport = (order, format) => {
        if (format === 'csv') {
            exportOrderCsv(order);
            return;
        }

        if (format === 'txt') {
            exportOrderTxt(order);
            return;
        }

        if (!exportOrderPdf(order)) {
            setError('Não foi possível abrir a janela de exportação. Permita pop-ups para exportar em PDF.');
        }
    };

    return (
        <div className="history-page">
            <PageHeader title="Histórico de pedidos" subtitle="Controle de pedidos passados" />

            {selectedMonth === null ? (
                <div className="history-months-view">
                    <div className="history-year-block">
                        <div className="history-year">{year}</div>
                        <div className="history-total">Total: {pad(yearTotal)}</div>
                    </div>

                    {error && <p className="history-error" role="alert">{error}</p>}

                    {loading ? (
                        <p className="history-empty">A carregar histórico...</p>
                    ) : (
                        <div className="history-months">
                            {MONTHS.map((month, index) => (
                                <button
                                    key={month}
                                    type="button"
                                    className="history-month-button"
                                    aria-label={`${month}, ${monthCounts[index]} registro(s)`}
                                    onClick={() => {
                                        setSelectedMonth(index);
                                        setMostrarBusca(false);
                                        setMostrarFiltros(false);
                                    }}
                                >
                                    {month}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <div className="history-month-header">
                        <div className="history-month-title">
                            <div className="history-month-heading">
                                <button
                                    type="button"
                                    className="history-year-link"
                                    aria-label="Voltar para os meses"
                                    title="Voltar para os meses"
                                    onClick={() => setSelectedMonth(null)}
                                >
                                    {year}
                                </button>
                                <span className="history-month-name"> / {MONTHS[selectedMonth]}</span>
                            </div>
                            <span className="history-month-total">
                                Total: {pad(monthEvents.length)}
                            </span>
                        </div>
                        <div className="history-actions">
                            <ActionToolbar
                                onSearch={() => setMostrarBusca(v => !v)}
                                onFilter={() => setMostrarFiltros(v => !v)}
                            />
                        </div>
                    </div>

                    <p className="history-stats">
                        Pedidos registados: {stats.orders} · Alterações de status: {stats.events} ·
                        Cancelamentos: {stats.cancelled} · Atrasos / não entregues: {stats.problems}
                    </p>

                    {error && <p className="history-error" role="alert">{error}</p>}

                    <section className="history-section">
                        <h2 className="history-section-title sr-only">Linha do tempo</h2>
                        <p className="history-count">{monthEvents.length} registo(s) encontrados.</p>

                        <div className="history-filters">
                            {(mostrarBusca || search) && (
                                <div className="history-search-field">
                                    <label htmlFor="history-search">Buscar</label>
                                    <input
                                        id="history-search"
                                        type="search"
                                        placeholder="Nº do pedido, cliente, motivo..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            )}

                            {(mostrarFiltros || statusFilter !== 'all' || dateFilter) && (
                                <>
                                    <div className="history-status-field">
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

                                    <div className="history-date-field">
                                        <label htmlFor="history-date">Data</label>
                                        <input
                                            id="history-date"
                                            type="date"
                                            value={dateFilter}
                                            onChange={(e) => setDateFilter(e.target.value)}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                {loading ? (
                    <p className="history-empty">A carregar histórico...</p>
                ) : monthEvents.length === 0 ? (
                    <p className="history-empty">Nenhuma alteração de status encontrada.</p>
                ) : (
                    <ul className="history-events">
                        {monthEvents.map((event) => (
                            <li key={event.key} className="history-order-card">
                                <div className="history-order-top">
                                    <span className="history-order-title">
                                        Pedido {event.order.customer_name || orderNumber(event.order.id)}
                                    </span>
                                    <span className="history-order-price">{formatPrice(event.order.total)}</span>
                                </div>
                                <div className="history-order-date">
                                    {new Date(event.created_at).toLocaleDateString('pt-BR')}
                                </div>
                                <div className="history-order-bottom">
                                    <span className={`history-status history-status--${event.status}`}>
                                        {STATUS_META[event.status]?.label || event.status}
                                    </span>
                                    <button
                                        type="button"
                                        className="history-ver-mais"
                                        onClick={() => toggleDetails(event.key)}
                                    >
                                        Ver mais
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                <Modal
                    className="history-modal-card"
                    open={!!selectedEvent}
                    onClose={() => setExpandedKey(null)}
                    maxWidth="480px"
                    showDivider={false}
                    closePlacement="top"
                    title={modalTitle}
                    titleExtra={
                        selectedEvent ? (
                            <span className={`history-status history-status--${selectedEvent.status}`}>
                                {STATUS_META[selectedEvent.status]?.label || selectedEvent.status}
                            </span>
                        ) : null
                    }
                >
                    {selectedOrder && (
                        <div className="history-modal">
                            <div className="history-modal-orderline">
                                <p className="history-order-code">Ordem {orderNumber(selectedOrder.id)}</p>
                                <p className="history-order-datetime">
                                    {formatDateTime(selectedOrder.created_at || selectedEvent?.created_at)}
                                </p>
                            </div>

                            <h3 className="history-modal-subtitle">Itens</h3>
                            <div className="history-items-head">
                                <span>Item</span>
                                <span>Qts</span>
                                <span>Valor</span>
                            </div>
                            <ul className="history-items">
                                {(selectedOrder.items || []).map((item) => {
                                    const productImage =
                                        item.product?.image ||
                                        item.product?.image_url ||
                                        item.product?.photo;
                                    return (
                                        <li key={item.id} className="history-item">
                                            <div className="history-item-main">
                                                {productImage ? (
                                                    <img
                                                        className="history-item-image"
                                                        src={productImage}
                                                        alt=""
                                                    />
                                                ) : (
                                                    <span
                                                        className="history-item-image history-item-image--placeholder"
                                                        aria-hidden="true"
                                                    >
                                                        <Utensils size={18} />
                                                    </span>
                                                )}
                                                <div className="history-item-info">
                                                    <span className="history-item-name">
                                                        {item.product?.name || 'Produto'}
                                                    </span>
                                                    {(item.addons || []).map((addon) => (
                                                        <div className="history-item-extra" key={addon.id}>
                                                            + {addon.quantity}×{' '}
                                                            {addon.addon?.name || 'Adicional'}
                                                        </div>
                                                    ))}
                                                    {item.notes && (
                                                        <div className="history-item-extra">Obs.: {item.notes}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="history-item-qty">
                                                {String(item.quantity).padStart(2, '0')}
                                            </span>
                                            <span className="history-item-value">{formatPrice(item.subtotal)}</span>
                                        </li>
                                    );
                                })}
                            </ul>

                            <div className="history-modal-total">
                                <span>Total</span>
                                <strong>{formatPrice(selectedOrder.total)}</strong>
                            </div>

                            <details className="history-export">
                                <summary className="history-export-summary">Exportar Pedido</summary>
                                <div className="history-export-actions">
                                    <button
                                        type="button"
                                        onClick={() => handleExport(selectedOrder, 'pdf')}
                                    >
                                        PDF (comprovante)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleExport(selectedOrder, 'csv')}
                                    >
                                        CSV (Excel)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleExport(selectedOrder, 'txt')}
                                    >
                                        TXT (recibo)
                                    </button>
                                </div>
                            </details>

                            <div className="history-modal-extra">
                                {selectedOrder.notes && (
                                    <p className="history-modal-notes">
                                        <strong>Observações do pedido:</strong> {selectedOrder.notes}
                                    </p>
                                )}

                                <h3 className="history-modal-mini-title">Histórico</h3>
                                <div className="history-status-log">
                                    {getHistory(selectedOrder).map((entry) => {
                                        const entryMeta = STATUS_META[entry.status] || {
                                            label: entry.status,
                                        };
                                        return (
                                            <p key={entry.id}>
                                                {entryMeta.label} — {formatDateTime(entry.created_at)}
                                                {entry.user?.name ? ` · por ${entry.user.name}` : ''}
                                                {entry.reason ? ` — Motivo: ${entry.reason}` : ''}
                                            </p>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>
                    </section>
                </>
            )}
        </div>
    );
}
