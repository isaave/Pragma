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
import TableToolbar from '../components/ui/TableToolbar';
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

const SEARCH_MODES = [
    { value: 'all', label: 'Todos os campos', placeholder: 'Nº, cliente, status, data, atendente...' },
    { value: 'order', label: 'Nº do pedido', placeholder: 'Ex.: 0003' },
    { value: 'customer', label: 'Cliente', placeholder: 'Nome do cliente' },
    { value: 'status', label: 'Status', placeholder: 'Ex.: Entregue' },
    { value: 'date', label: 'Data', placeholder: 'Ex.: 25/11/2026' },
    { value: 'attendant', label: 'Atendente', placeholder: 'Nome do atendente' },
    { value: 'reason', label: 'Motivo', placeholder: 'Motivo da alteração' },
    { value: 'session', label: 'Abertura da sessão', placeholder: 'Ex.: 25/11/2026 14:30' },
];

export default function History() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [searchMode, setSearchMode] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const [expandedKey, setExpandedKey] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [mostrarFiltros, setMostrarFiltros] = useState(false);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/orders/history');
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

    // O backend devolve aqui apenas pedidos de sessões já encerradas.
    const sessionOrders = useMemo(() => orders, [orders]);

    /* Todos os eventos de status, do mais recente para o mais antigo */
    const events = useMemo(() => {
        const list = [];
        sessionOrders.forEach((order) => {
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
    }, [sessionOrders]);

    const stats = useMemo(
        () => ({
            orders: sessionOrders.length,
            events: events.length,
            cancelled: events.filter((event) => event.status === 'cancelled').length,
            problems: events.filter((event) =>
                ['not_delivered', 'late'].includes(event.status)
            ).length,
        }),
        [sessionOrders, events]
    );

    const filteredEvents = useMemo(() => {
        const term = search.trim().toLowerCase();
        return events.filter((event) => {
            if (statusFilter !== 'all' && event.status !== statusFilter) return false;
            if (dateFilter && String(event.created_at).slice(0, 10) !== dateFilter) {
                return false;
            }
            if (!term) return true;

            const paddedOrder = String(event.order.id).padStart(4, '0');
            const eventDate = new Date(event.created_at);
            const session = event.order.store_session;
            const sessionDates = [
                session?.opened_at,
                session?.closed_at,
                session?.opened_at ? formatDateTime(session.opened_at) : '',
                session?.closed_at ? formatDateTime(session.closed_at) : '',
            ];
            const fields = {
                all: [
                    event.order.id,
                    paddedOrder,
                    event.order.customer_name,
                    STATUS_META[event.status]?.label,
                    event.status,
                    event.created_at,
                    eventDate.toLocaleDateString('pt-BR'),
                    event.user?.name,
                    event.reason,
                    ...sessionDates,
                ],
                order: [event.order.id, paddedOrder, `pedido ${paddedOrder}`],
                customer: [event.order.customer_name],
                status: [STATUS_META[event.status]?.label, event.status],
                date: [
                    event.created_at,
                    String(event.created_at).slice(0, 10),
                    eventDate.toLocaleDateString('pt-BR'),
                ],
                attendant: [event.user?.name],
                reason: [event.reason],
                session: sessionDates,
            };
            const values = fields[searchMode] || fields.all;
            return values.some((value) => String(value || '').toLowerCase().includes(term));
        });
    }, [events, search, searchMode, statusFilter, dateFilter]);

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

    const hasSearch = search.trim().length > 0;
    const activeSearchMode =
        SEARCH_MODES.find((mode) => mode.value === searchMode) || SEARCH_MODES[0];

    const renderEvents = (list) => {
        if (loading) return <p className="history-empty">A carregar histórico...</p>;
        if (list.length === 0) {
            return <p className="history-empty">Nenhum pedido encontrado no histórico.</p>;
        }
        return (
            <ul className="history-events">
                {list.map((event) => (
                    <li key={event.key} className="history-order-card">
                        <div className="history-order-top">
                            <span className="history-order-title">
                                Pedido {event.order.customer_name || orderNumber(event.order.id)}
                            </span>
                            <span className="history-order-price">{formatPrice(event.order.total)}</span>
                        </div>
                        <div className="history-order-date">
                            {new Date(event.created_at).toLocaleDateString('pt-BR')}
                            {event.order.store_session?.opened_at && (
                                <span className="history-order-session">
                                    {` · Sessão ${formatDateTime(event.order.store_session.opened_at)}`}
                                </span>
                            )}
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
        );
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

    const detailModal = (
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
                        {selectedOrder.store_session?.opened_at && (
                            <p className="history-order-datetime">
                                {`Sessão aberta em ${formatDateTime(selectedOrder.store_session.opened_at)}`}
                                {selectedOrder.store_session.closed_at
                                    ? ` · fechada em ${formatDateTime(selectedOrder.store_session.closed_at)}`
                                    : ''}
                            </p>
                        )}
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
    );

    return (
        <div className="history-page">
            <PageHeader title="Histórico de pedidos" subtitle="Controle de pedidos passados" />

            <div className="history-finder">
                <label htmlFor="history-search-mode">Buscar por</label>
                <select
                    id="history-search-mode"
                    value={searchMode}
                    onChange={(e) => {
                        setSearchMode(e.target.value);
                        setStatusFilter('all');
                        setDateFilter('');
                    }}
                    aria-label="Critério de busca do histórico"
                >
                    {SEARCH_MODES.map((mode) => (
                        <option key={mode.value} value={mode.value}>
                            {mode.label}
                        </option>
                    ))}
                </select>
                <input
                    id="history-search"
                    type="search"
                    placeholder={activeSearchMode.placeholder}
                    aria-label={`Buscar no histórico por ${activeSearchMode.label.toLowerCase()}`}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        if (e.target.value) {
                            setStatusFilter('all');
                            setDateFilter('');
                        }
                    }}
                />
                {hasSearch && (
                    <button
                        type="button"
                        className="history-finder__clear"
                        onClick={() => setSearch('')}
                    >
                        Limpar
                    </button>
                )}
            </div>

            {error && <p className="history-error" role="alert">{error}</p>}

            {hasSearch ? (
                <section className="history-section">
                    <h2 className="history-section-title sr-only">Resultados da busca</h2>
                    <p className="history-count">
                        {filteredEvents.length} registo(s) encontrado(s) em todo o histórico.
                    </p>
                    {renderEvents(filteredEvents)}
                </section>
            ) : selectedMonth === null ? (
                <div className="history-months-view">
                    <div className="history-year-block">
                        <div className="history-year">{year}</div>
                        <div className="history-total">Total: {pad(yearTotal)}</div>
                    </div>

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
                            <TableToolbar
                                onSearch={() => document.getElementById('history-search')?.focus()}
                                onFilter={() => setMostrarFiltros(v => !v)}
                                ariaLabel="Ações do histórico"
                            />
                        </div>
                    </div>

                    <p className="history-stats">
                        Pedidos registados: {stats.orders} · Alterações de status: {stats.events} ·
                        Cancelamentos: {stats.cancelled} · Atrasos / não entregues: {stats.problems}
                    </p>

                    <section className="history-section">
                        <h2 className="history-section-title sr-only">Linha do tempo</h2>
                        <p className="history-count">{monthEvents.length} registo(s) encontrados.</p>

                        <div className="history-filters">
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

                {renderEvents(monthEvents)}

                    </section>
                </>
            )}
            {detailModal}
        </div>
    );
}
