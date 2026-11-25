import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutGrid, List, Table2, Utensils } from 'lucide-react';
import api from '../Services/api';
import { exportOrderCsv, exportOrderPdf, exportOrderTxt } from '../lib/exportOrder';
import {
    STATUS_META,
    STATUS_ORDER,
    formatDateTime,
    formatPrice,
    getErrorMessage,
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

const SEARCH_MODES = [
    { value: 'all', label: 'Todos os campos', placeholder: 'Dia, abertura, cliente, status...' },
    { value: 'session', label: 'Abertura da loja', placeholder: 'Ex.: 25/11/2026 14:30' },
    { value: 'order', label: 'Nº do pedido', placeholder: 'Ex.: 0003' },
    { value: 'customer', label: 'Cliente', placeholder: 'Nome do cliente' },
    { value: 'status', label: 'Status', placeholder: 'Ex.: Entregue' },
    { value: 'date', label: 'Data', placeholder: 'Ex.: 25/11/2026' },
    { value: 'attendant', label: 'Atendente', placeholder: 'Nome do atendente' },
    { value: 'reason', label: 'Motivo', placeholder: 'Motivo da alteração' },
];

const VIEW_OPTIONS = [
    { value: 'cards', label: 'Visualizar em cards', Icon: LayoutGrid },
    { value: 'list', label: 'Visualizar em lista', Icon: List },
    { value: 'table', label: 'Visualizar em tabela', Icon: Table2 },
];

const monthKey = (value) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${date.getMonth()}`;
};

const monthLabel = (key) => {
    const [year, month] = key.split('-').map(Number);
    return `${MONTHS[month]} ${year}`;
};

const sessionDay = (value) =>
    new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');

const timeOnly = (value) =>
    value
        ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : '—';

const sessionDuration = (session) => {
    if (!session.opened_at || !session.closed_at) return 'Em aberto';
    const minutes = Math.max(
        0,
        Math.round((new Date(session.closed_at) - new Date(session.opened_at)) / 60000)
    );
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}min` : `${hours}h`;
};

export default function History() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [searchMode, setSearchMode] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const [sort, setSort] = useState('recent');
    const [viewMode, setViewMode] = useState('cards');
    const [showSearch, setShowSearch] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState(null);

    const loadSessions = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/store/sessions');
            setSessions(res.data || []);
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao carregar os dias de funcionamento.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSessions();
        const refresh = () => loadSessions();
        window.addEventListener('pragma:store-toggled', refresh);
        return () => window.removeEventListener('pragma:store-toggled', refresh);
    }, [loadSessions]);

    const filteredSessions = useMemo(() => {
        const term = search.trim().toLowerCase();

        return sessions.filter((session) => {
            const orders = session.orders || [];

            if (
                dateFilter &&
                ![session.opened_at, session.closed_at].some(
                    (value) => value && String(value).slice(0, 10) === dateFilter
                ) &&
                !orders.some((order) => String(order.created_at).slice(0, 10) === dateFilter)
            ) {
                return false;
            }

            if (statusFilter !== 'all' && !orders.some((order) => order.status === statusFilter)) {
                return false;
            }

            if (!term) return true;

            const sessionFields = [
                sessionDay(session.opened_at),
                formatDateTime(session.opened_at),
                formatDateTime(session.closed_at),
                session.opened_by,
                session.closed_by,
                sessionDuration(session),
            ];
            const orderFields = orders.flatMap((order) => [
                order.id,
                String(order.id).padStart(4, '0'),
                order.customer_name,
                STATUS_META[order.status]?.label,
                order.status,
                order.created_at,
                order.user?.name,
                ...(order.status_history || []).map((entry) => entry.reason),
            ]);

            const fields = {
                all: [...sessionFields, ...orderFields],
                session: sessionFields,
                order: orderFields,
                customer: orders.map((order) => order.customer_name),
                status: orders.flatMap((order) => [STATUS_META[order.status]?.label, order.status]),
                date: [
                    ...sessionFields.slice(0, 3),
                    ...orders.map((order) => [order.created_at, formatDateTime(order.created_at)]).flat(),
                ],
                attendant: [session.opened_by, session.closed_by, ...orders.map((order) => order.user?.name)],
                reason: orders.flatMap((order) =>
                    (order.status_history || []).map((entry) => entry.reason)
                ),
            };

            const values = fields[searchMode] || fields.all;
            return values.some((value) => String(value ?? '').toLowerCase().includes(term));
        });
    }, [sessions, search, searchMode, statusFilter, dateFilter]);

    const sortedSessions = useMemo(() => {
        const list = [...filteredSessions];
        if (sort === 'oldest') {
            list.sort((a, b) => new Date(a.opened_at) - new Date(b.opened_at));
        } else if (sort === 'value') {
            list.sort((a, b) => Number(b.total) - Number(a.total));
        } else {
            list.sort((a, b) => new Date(b.opened_at) - new Date(a.opened_at));
        }
        return list;
    }, [filteredSessions, sort]);

    const groups = useMemo(() => {
        const byMonth = new Map();
        sortedSessions.forEach((session) => {
            const key = monthKey(session.opened_at);
            if (!byMonth.has(key)) {
                byMonth.set(key, []);
            }
            byMonth.get(key).push(session);
        });
        return [...byMonth.entries()].map(([key, list]) => ({
            key,
            label: monthLabel(key),
            sessions: list,
            total: list.reduce((sum, session) => sum + Number(session.total || 0), 0),
        }));
    }, [sortedSessions]);

    const selectedSession = sessions.find((session) => session.id === selectedSessionId) || null;
    const activeSearchMode =
        SEARCH_MODES.find((mode) => mode.value === searchMode) || SEARCH_MODES[0];

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

    const toggleSearch = () => {
        setShowSearch((visible) => {
            if (!visible) {
                setTimeout(() => document.getElementById('history-search')?.focus(), 0);
            }
            return !visible;
        });
    };

    const sessionBadge = (session) => (
        <span className={`history-session-status history-session-status--${session.is_open ? 'open' : 'closed'}`}>
            {session.is_open ? 'Em aberto' : 'Encerrada'}
        </span>
    );

    const renderCards = (list) => (
        <div className="history-session-grid">
            {list.map((session) => (
                <button
                    key={session.id}
                    type="button"
                    className="history-session-card"
                    onClick={() => setSelectedSessionId(session.id)}
                >
                    <span className="history-session-card__top">
                        <strong className="history-session-card__day">{sessionDay(session.opened_at)}</strong>
                        {sessionBadge(session)}
                    </span>
                    <span className="history-session-card__times">
                        <span>Abertura <strong>{timeOnly(session.opened_at)}</strong></span>
                        <span>Fechamento <strong>{session.is_open ? '—' : timeOnly(session.closed_at)}</strong></span>
                    </span>
                    <span className="history-session-card__values">
                        <span><small>Vendas</small><strong>{formatPrice(session.total)}</strong></span>
                        <span><small>Pedidos</small><strong>{session.orders_count}</strong></span>
                        <span><small>Itens</small><strong>{session.items_count}</strong></span>
                    </span>
                </button>
            ))}
        </div>
    );

    const renderList = (list) => (
        <ul className="history-session-list">
            {list.map((session) => (
                <li key={session.id}>
                    <button
                        type="button"
                        className="history-session-row"
                        onClick={() => setSelectedSessionId(session.id)}
                    >
                        <strong className="history-session-row__day">{sessionDay(session.opened_at)}</strong>
                        <span className="history-session-row__times">
                            {timeOnly(session.opened_at)} — {session.is_open ? 'em aberto' : timeOnly(session.closed_at)}
                        </span>
                        {sessionBadge(session)}
                        <span className="history-session-row__orders">{session.orders_count} pedido(s)</span>
                        <span className="history-session-row__items">{session.items_count} item(ns)</span>
                        <strong className="history-session-row__total">{formatPrice(session.total)}</strong>
                    </button>
                </li>
            ))}
        </ul>
    );

    const renderTable = (list) => (
        <div className="history-session-table-wrap">
            <table className="history-session-table">
                <thead>
                    <tr>
                        <th>Dia</th>
                        <th>Abertura</th>
                        <th>Fechamento</th>
                        <th>Estado</th>
                        <th>Pedidos</th>
                        <th>Itens</th>
                        <th>Vendas</th>
                    </tr>
                </thead>
                <tbody>
                    {list.map((session) => (
                        <tr
                            key={session.id}
                            tabIndex={0}
                            onClick={() => setSelectedSessionId(session.id)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    setSelectedSessionId(session.id);
                                }
                            }}
                        >
                            <td>{sessionDay(session.opened_at)}</td>
                            <td>{timeOnly(session.opened_at)}</td>
                            <td>{session.is_open ? '—' : timeOnly(session.closed_at)}</td>
                            <td>{sessionBadge(session)}</td>
                            <td>{session.orders_count}</td>
                            <td>{session.items_count}</td>
                            <td>{formatPrice(session.total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const detailModal = (
        <Modal
            className="history-modal-card"
            open={!!selectedSession}
            onClose={() => setSelectedSessionId(null)}
            maxWidth="640px"
            showDivider={false}
            closePlacement="top"
            title={selectedSession ? `Loja aberta em ${formatDateTime(selectedSession.opened_at)}` : ''}
            titleExtra={selectedSession ? sessionBadge(selectedSession) : null}
        >
            {selectedSession && (
                <div className="history-modal">
                    <div className="history-session-detail">
                        <div>
                            <span>Abertura</span>
                            <strong>{formatDateTime(selectedSession.opened_at)}</strong>
                        </div>
                        <div>
                            <span>Fechamento</span>
                            <strong>
                                {selectedSession.is_open ? 'Em aberto' : formatDateTime(selectedSession.closed_at)}
                            </strong>
                        </div>
                        <div>
                            <span>Duração</span>
                            <strong>{sessionDuration(selectedSession)}</strong>
                        </div>
                        <div>
                            <span>Total vendido</span>
                            <strong>{formatPrice(selectedSession.total)}</strong>
                        </div>
                        <div>
                            <span>Pedidos</span>
                            <strong>{selectedSession.orders_count}</strong>
                        </div>
                        <div>
                            <span>Itens vendidos</span>
                            <strong>{selectedSession.items_count}</strong>
                        </div>
                    </div>

                    <h3 className="history-modal-subtitle">Pedidos desta abertura</h3>
                    {(selectedSession.orders || []).length === 0 ? (
                        <p className="history-empty">Nenhum pedido registado nesta abertura.</p>
                    ) : (
                        <ul className="history-session-orders">
                            {selectedSession.orders.map((order) => (
                                <li key={order.id}>
                                    <div>
                                        <strong>
                                            {order.customer_name || `Pedido ${orderNumber(order.id)}`}
                                        </strong>
                                        <span className={`history-status history-status--${order.status}`}>
                                            {STATUS_META[order.status]?.label || order.status}
                                        </span>
                                    </div>
                                    <div>
                                        <span>{formatDateTime(order.created_at)}</span>
                                        <strong>{formatPrice(order.total)}</strong>
                                    </div>
                                    <div className="history-export-actions">
                                        <button type="button" onClick={() => handleExport(order, 'pdf')}>PDF</button>
                                        <button type="button" onClick={() => handleExport(order, 'csv')}>CSV</button>
                                        <button type="button" onClick={() => handleExport(order, 'txt')}>TXT</button>
                                    </div>
                                    {(order.items || []).length > 0 && (
                                        <ul className="history-session-order-items">
                                            {order.items.map((item) => (
                                                <li key={item.id}>
                                                    {item.product?.image ? (
                                                        <img className="history-item-image" src={item.product.image} alt="" />
                                                    ) : (
                                                        <span className="history-item-image history-item-image--placeholder" aria-hidden="true">
                                                            <Utensils size={16} />
                                                        </span>
                                                    )}
                                                    <span>
                                                        {item.quantity}× {item.product?.name || 'Produto'}
                                                        {item.notes ? ` — ${item.notes}` : ''}
                                                    </span>
                                                    <strong>{formatPrice(item.subtotal)}</strong>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </Modal>
    );

    return (
        <div className="history-page">
            <PageHeader title="Histórico de pedidos" subtitle="Controle de pedidos passados" />

            <div className="history-controls">
                <TableToolbar
                    viewModes={VIEW_OPTIONS}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onSearch={toggleSearch}
                    onFilter={() => setShowFilters((visible) => !visible)}
                    ariaLabel="Ações do histórico"
                />
            </div>

            {showSearch && (
                <div className="history-finder">
                    <label htmlFor="history-search-mode">Buscar por</label>
                    <select
                        id="history-search-mode"
                        value={searchMode}
                        onChange={(event) => {
                            setSearchMode(event.target.value);
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
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    {search && (
                        <button type="button" className="history-finder__clear" onClick={() => setSearch('')}>
                            Limpar
                        </button>
                    )}
                </div>
            )}

            {showFilters && (
                <div className="history-filters">
                    <div className="history-status-field">
                        <label htmlFor="history-status">Status</label>
                        <select
                            id="history-status"
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
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
                            onChange={(event) => setDateFilter(event.target.value)}
                        />
                    </div>

                    <div className="history-sort-field">
                        <label htmlFor="history-sort">Organizar</label>
                        <select id="history-sort" value={sort} onChange={(event) => setSort(event.target.value)}>
                            <option value="recent">Mais recente</option>
                            <option value="oldest">Mais antiga</option>
                            <option value="value">Maior valor</option>
                        </select>
                    </div>
                </div>
            )}

            {error && <p className="history-error" role="alert">{error}</p>}

            {loading ? (
                <p className="history-empty">A carregar dias de funcionamento...</p>
            ) : groups.length === 0 ? (
                <p className="history-empty">Nenhum dia de funcionamento encontrado.</p>
            ) : (
                groups.map((group) => (
                    <section key={group.key} className="history-month-section">
                        <div className="history-month-header">
                            <div className="history-month-title">{group.label}</div>
                            <span className="history-month-total">
                                {group.sessions.length} abertura(s) · {formatPrice(group.total)}
                            </span>
                        </div>

                        {viewMode === 'cards' && renderCards(group.sessions)}
                        {viewMode === 'list' && renderList(group.sessions)}
                        {viewMode === 'table' && renderTable(group.sessions)}
                    </section>
                ))
            )}

            {detailModal}
        </div>
    );
}
