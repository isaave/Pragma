import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../Services/api';
import {
    FILTERS,
    STATUS_META,
    STATUS_ORDER,
    formatDateTime,
    formatPrice,
    getErrorMessage,
    getHistory,
    orderNumber,
} from '../lib/orderStatus';

const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[char]));

/* ------------------------------------------------------------------ */
/*  Impressão (nota fiscal / recibo 80mm)                              */
/* ------------------------------------------------------------------ */

const buildReceiptHtml = (order) => {
    const items = (order.items || []).map((item) => {
        const addons = (item.addons || [])
            .map(
                (addon) =>
                    `<div class="small">+ ${addon.quantity}x ${escapeHtml(addon.addon?.name || 'Adicional')}</div>`
            )
            .join('');
        const note = item.notes ? `<div class="small">Obs: ${escapeHtml(item.notes)}</div>` : '';
        return `
            <div class="item">
                <div class="row">
                    <span>${item.quantity}x ${escapeHtml(item.product?.name || 'Produto')}</span>
                    <span>${formatPrice(item.subtotal)}</span>
                </div>
                ${addons}
                ${note}
            </div>`;
    }).join('');

    const status = STATUS_META[order.status]?.label || order.status;
    const notes = order.notes
        ? `<div class="note"><strong>Observações:</strong> ${escapeHtml(order.notes)}</div>`
        : '';

    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Pedido ${orderNumber(order.id)} — House Burguer</title>
<style>
    @page { size: 80mm auto; margin: 4mm; }
    * { box-sizing: border-box; }
    body {
        font-family: 'Courier New', Courier, monospace;
        color: #000;
        background: #fff;
        margin: 0;
        font-size: 12px;
        line-height: 1.35;
    }
    .brand { text-align: center; font-size: 18px; font-weight: 800; letter-spacing: 1px; }
    .sub { text-align: center; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
    .order-number { text-align: center; font-size: 22px; font-weight: 800; margin: 10px 0 4px; }
    hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .row strong { font-weight: 800; }
    .item { margin: 6px 0; }
    .small { font-size: 10.5px; margin-left: 8px; }
    .note { font-size: 11px; margin-top: 8px; }
    .total { font-size: 16px; font-weight: 800; }
    .footer { text-align: center; font-size: 11px; margin-top: 12px; }
    .no-print { margin-top: 14px; width: 100%; padding: 8px; font: inherit; font-weight: 700; cursor: pointer; }
    @media print { .no-print { display: none; } }
</style>
</head>
<body>
    <div class="brand">HOUSE BURGUER</div>
    <div class="sub">Comprovante de pedido</div>
    <div class="order-number">${orderNumber(order.id)}</div>

    <hr>
    <div class="row"><span>Data</span><span>${escapeHtml(formatDateTime(order.created_at))}</span></div>
    <div class="row"><span>Cliente</span><span>${escapeHtml(order.customer_name || 'Não informado')}</span></div>
    <div class="row"><span>Atendente</span><span>${escapeHtml(order.user?.name || '—')}</span></div>
    <div class="row"><span>Status</span><span>${escapeHtml(status)}</span></div>
    <hr>

    ${items}
    <hr>

    <div class="row total"><span>TOTAL</span><span>${formatPrice(order.total)}</span></div>
    ${notes}
    <div class="footer">Obrigado pela preferência! 🍔<br>${escapeHtml(formatDateTime(new Date()))}</div>

    <button class="no-print" onclick="window.print()">Imprimir novamente</button>
</body>
</html>`;
};

/* ------------------------------------------------------------------ */
/*  Cópia para WhatsApp                                                */
/* ------------------------------------------------------------------ */

const buildCopyText = (order) => {
    const lines = [
        '🍔 *HOUSE BURGUER*',
        `📄 *Pedido ${orderNumber(order.id)}*`,
        `👤 Cliente: ${order.customer_name || 'Não informado'}`,
        `🕒 ${formatDateTime(order.created_at)}`,
        '--------------------------------',
    ];

    (order.items || []).forEach((item) => {
        lines.push(`${item.quantity}x ${item.product?.name || 'Produto'} — ${formatPrice(item.subtotal)}`);
        (item.addons || []).forEach((addon) => {
            lines.push(`   + ${addon.quantity}x ${addon.addon?.name || 'Adicional'}`);
        });
        if (item.notes) lines.push(`   📝 Obs: ${item.notes}`);
    });

    lines.push('--------------------------------');
    lines.push(`💰 *Total: ${formatPrice(order.total)}*`);
    lines.push(`📍 Status: ${STATUS_META[order.status]?.label || order.status}`);

    if (order.notes) {
        lines.push('');
        lines.push(`📝 *Observações:* ${order.notes}`);
    }

    return lines.join('\n');
};

const fallbackCopy = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
};

/* ------------------------------------------------------------------ */
/*  Página                                                             */
/* ------------------------------------------------------------------ */

export default function Orders() {
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [lastCreated, setLastCreated] = useState(null);

    // Formulário de criação
    const [customerName, setCustomerName] = useState('');
    const [orderNotes, setOrderNotes] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');
    const [cart, setCart] = useState([]); // [{ product, quantity, notes }]
    const formRef = useRef(null);

    // Filtros da lista
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    // Modal de alteração de status
    const [statusModal, setStatusModal] = useState(null); // { order, selected, reason, saving, error }

    /* ---------------- Carregamento ---------------- */

    const loadProducts = useCallback(async () => {
        try {
            const res = await api.get('/products');
            setProducts(
                (res.data || []).filter((p) => p.is_active && p.status !== 'desenvolvimento')
            );
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao carregar os produtos.'));
        }
    }, []);

    const loadOrders = useCallback(async () => {
        try {
            const res = await api.get('/orders');
            setOrders(res.data || []);
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao carregar os pedidos.'));
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([loadProducts(), loadOrders()]);
            setLoading(false);
        };
        init();
    }, [loadProducts, loadOrders]);

    /* ---------------- Novo pedido ---------------- */

    const focusNewOrder = () => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const select = document.getElementById('product-select');
        const target =
            select && !select.disabled ? select : document.getElementById('customer-name');
        target?.focus();
    };

    /* ---------------- Carrinho ---------------- */

    const addProduct = (product) => {
        if (!product.available) return;
        setError('');
        setCart((prev) => {
            const existing = prev.find((entry) => entry.product.id === product.id);
            if (existing) {
                return prev.map((entry) =>
                    entry.product.id === product.id
                        ? { ...entry, quantity: entry.quantity + 1 }
                        : entry
                );
            }
            return [...prev, { product, quantity: 1, notes: '' }];
        });
    };

    const addSelectedProduct = () => {
        const product = products.find((item) => String(item.id) === String(selectedProductId));
        if (!product) return;
        addProduct(product);
        setSelectedProductId('');
    };

    const changeQuantity = (index, delta) => {
        setCart((prev) =>
            prev.map((entry, i) => {
                if (i !== index) return entry;
                const next = entry.quantity + delta;
                if (next < 1) return entry;
                return { ...entry, quantity: next };
            })
        );
    };

    const changeItemNote = (index, value) => {
        setCart((prev) =>
            prev.map((entry, i) => (i === index ? { ...entry, notes: value } : entry))
        );
    };

    const removeItem = (index) => {
        setCart((prev) => prev.filter((_, i) => i !== index));
    };

    const cartTotal = cart.reduce(
        (sum, entry) => sum + Number(entry.product.price) * entry.quantity,
        0
    );

    /* ---------------- Criar pedido ---------------- */

    const finishOrder = async (event) => {
        event.preventDefault();
        if (cart.length === 0) {
            setError('Adicione pelo menos um produto ao pedido.');
            return;
        }

        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            const payload = {
                customer_name: customerName.trim() || null,
                notes: orderNotes.trim() || null,
                items: cart.map((entry) => ({
                    product_id: entry.product.id,
                    quantity: entry.quantity,
                    notes: entry.notes.trim() || null,
                })),
            };

            const res = await api.post('/orders', payload);
            setLastCreated(res.data.order);
            setSuccess(`Pedido ${orderNumber(res.data.order.id)} criado com sucesso!`);
            setCart([]);
            setCustomerName('');
            setOrderNotes('');
            await loadOrders();
            await loadProducts();
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao finalizar o pedido.'));
        } finally {
            setSubmitting(false);
        }
    };

    /* ---------------- Ações dos pedidos ---------------- */

    const printOrder = (order) => {
        const win = window.open('', '_blank', 'width=420,height=720');
        if (!win) {
            setError('O navegador bloqueou a janela de impressão. Permita pop-ups para imprimir.');
            return;
        }
        win.document.open();
        win.document.write(buildReceiptHtml(order));
        win.document.close();
        win.focus();
        setTimeout(() => {
            try {
                win.print();
            } catch {
                /* a janela tem um botão para imprimir manualmente */
            }
        }, 350);
    };

    const copyOrder = async (order) => {
        const text = buildCopyText(order);
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                fallbackCopy(text);
            }
            setCopiedId(order.id);
            setTimeout(() => setCopiedId(null), 2200);
        } catch {
            try {
                fallbackCopy(text);
                setCopiedId(order.id);
                setTimeout(() => setCopiedId(null), 2200);
            } catch {
                setError('Não foi possível copiar o pedido.');
            }
        }
    };

    const deleteOrder = async (order) => {
        if (!window.confirm(`Excluir o pedido ${orderNumber(order.id)}?`)) return;
        try {
            const res = await api.delete(`/orders/${order.id}`);
            setSuccess(res.data.message);
            await loadOrders();
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao excluir o pedido.'));
        }
    };

    const openStatusModal = (order) => {
        setStatusModal({
            order,
            selected: order.status,
            reason: '',
            saving: false,
            error: '',
        });
    };

    const closeStatusModal = () => setStatusModal(null);

    const selectStatus = (status) => {
        setStatusModal((prev) =>
            prev ? { ...prev, selected: status, error: '' } : prev
        );
    };

    const confirmStatus = async () => {
        if (!statusModal) return;
        const { order, selected, reason } = statusModal;
        const meta = STATUS_META[selected];

        if (meta?.needsReason && !reason.trim()) {
            setStatusModal((prev) => ({
                ...prev,
                error: 'Indique o motivo para este status.',
            }));
            return;
        }

        setStatusModal((prev) => ({ ...prev, saving: true, error: '' }));

        try {
            const res = await api.patch(`/orders/${order.id}/status`, {
                status: selected,
                reason: meta?.needsReason ? reason.trim() : null,
            });
            setSuccess(res.data.message);
            setStatusModal(null);
            await loadOrders();
        } catch (err) {
            setStatusModal((prev) => ({
                ...prev,
                saving: false,
                error: getErrorMessage(err, 'Erro ao atualizar o status.'),
            }));
        }
    };

    /* ---------------- Derivados ---------------- */

    const counts = useMemo(() => {
        const result = { all: orders.length };
        orders.forEach((order) => {
            result[order.status] = (result[order.status] || 0) + 1;
        });
        return result;
    }, [orders]);

    const filteredOrders = useMemo(() => {
        const term = search.trim().toLowerCase();
        return orders.filter((order) => {
            if (filter !== 'all' && order.status !== filter) return false;
            if (!term) return true;
            const haystack = [
                order.id,
                String(order.id).padStart(4, '0'),
                order.customer_name || '',
                order.user?.name || '',
            ]
                .join(' ')
                .toLowerCase();
            return haystack.includes(term);
        });
    }, [orders, filter, search]);

    /* ---------------- Render ---------------- */

    const renderTimeline = (order) => (
        <div>
            {getHistory(order).map((entry) => {
                const meta = STATUS_META[entry.status] || { label: entry.status };
                return (
                    <p key={entry.id}>
                        {meta.label} — {formatDateTime(entry.created_at)}
                        {entry.user?.name ? ` · por ${entry.user.name}` : ''}
                        {entry.reason ? ` — Motivo: ${entry.reason}` : ''}
                    </p>
                );
            })}
        </div>
    );

    return (
        <div>
            <header>
                <h1>Gestão de Pedidos</h1>
                <p>
                    Crie pedidos com os produtos cadastrados, imprima, copie para o WhatsApp e
                    acompanhe cada alteração de status.
                </p>
                <p>
                    <button type="button" onClick={focusNewOrder}>
                        + Novo pedido
                    </button>
                </p>
            </header>

            {error && <p role="alert">{error}</p>}

            {success && <p role="status">{success}</p>}

            {lastCreated && (
                <p>
                    Pedido {orderNumber(lastCreated.id)} pronto para imprimir ou copiar.{' '}
                    <button type="button" onClick={() => printOrder(lastCreated)}>
                        Imprimir
                    </button>{' '}
                    <button type="button" onClick={() => copyOrder(lastCreated)}>
                        {copiedId === lastCreated.id ? 'Copiado!' : 'Copiar'}
                    </button>
                </p>
            )}

            {/* ================= CRIAÇÃO ================= */}
            <section ref={formRef}>
                <h2>Novo pedido</h2>

                <form onSubmit={finishOrder}>
                    <p>
                        <label htmlFor="product-select">Adicionar produto</label>{' '}
                        <select
                            id="product-select"
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            disabled={loading || products.length === 0}
                        >
                            <option value="">
                                {loading
                                    ? 'A carregar produtos...'
                                    : products.length === 0
                                      ? 'Nenhum produto cadastrado'
                                      : 'Selecione um produto...'}
                            </option>
                            {products.map((product) => (
                                <option
                                    key={product.id}
                                    value={product.id}
                                    disabled={!product.available}
                                >
                                    {product.name} — {formatPrice(product.price)}
                                    {product.available ? '' : ' (indisponível)'}
                                </option>
                            ))}
                        </select>{' '}
                        <button
                            type="button"
                            onClick={addSelectedProduct}
                            disabled={!selectedProductId}
                        >
                            Adicionar
                        </button>
                    </p>

                    <p>
                        <label htmlFor="customer-name">Cliente</label>{' '}
                        <input
                            id="customer-name"
                            type="text"
                            placeholder="Nome do cliente (opcional)"
                            maxLength={120}
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                        />
                    </p>

                    {cart.length === 0 ? (
                        <p>Selecione um produto acima para começar.</p>
                    ) : (
                        <ul>
                            {cart.map((entry, index) => (
                                <li key={entry.product.id}>
                                    {entry.product.name} —{' '}
                                    {formatPrice(entry.product.price * entry.quantity)}
                                    <div>
                                        <button
                                            type="button"
                                            aria-label={`Diminuir ${entry.product.name}`}
                                            onClick={() => changeQuantity(index, -1)}
                                        >
                                            -
                                        </button>
                                        <span>{entry.quantity}</span>
                                        <button
                                            type="button"
                                            aria-label={`Aumentar ${entry.product.name}`}
                                            onClick={() => changeQuantity(index, 1)}
                                        >
                                            +
                                        </button>
                                        <span>× {formatPrice(entry.product.price)}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                        >
                                            Remover
                                        </button>
                                    </div>

                                    <p>
                                        <label htmlFor={`item-note-${index}`}>
                                            Observação do item
                                        </label>{' '}
                                        <input
                                            id={`item-note-${index}`}
                                            type="text"
                                            maxLength={1000}
                                            placeholder="Ex.: salada sem cebola"
                                            value={entry.notes}
                                            onChange={(e) => changeItemNote(index, e.target.value)}
                                        />
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}

                    <p>
                        <label htmlFor="order-notes">Observações do pedido</label>{' '}
                        <textarea
                            id="order-notes"
                            rows={2}
                            maxLength={1000}
                            placeholder="Ex.: entregar na portaria, ponto da carne..."
                            value={orderNotes}
                            onChange={(e) => setOrderNotes(e.target.value)}
                        />
                    </p>

                    <p>Total do pedido: {formatPrice(cartTotal)}</p>

                    <button type="submit" disabled={cart.length === 0 || submitting}>
                        {submitting ? 'A finalizar...' : 'Finalizar pedido'}
                    </button>
                </form>
            </section>

            {/* ================= LISTA ================= */}
            <section>
                <h2>Pedidos</h2>
                <p>
                    Altere o status, imprima, copie ou consulte o histórico de cada pedido.
                </p>

                <p>
                    <label htmlFor="order-search">Buscar pedido</label>{' '}
                    <input
                        id="order-search"
                        type="search"
                        placeholder="Nº do pedido, cliente ou atendente"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </p>

                <p>
                    {FILTERS.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            aria-pressed={filter === item.key}
                            onClick={() => setFilter(item.key)}
                        >
                            {item.label} ({counts[item.key] || 0})
                        </button>
                    ))}
                </p>

                {loading ? (
                    <p>A carregar pedidos...</p>
                ) : filteredOrders.length === 0 ? (
                    <p>Nenhum pedido encontrado com estes filtros.</p>
                ) : (
                    <ul>
                        {filteredOrders.map((order) => {
                            const meta = STATUS_META[order.status] || {
                                label: order.status,
                            };
                            const itemCount = (order.items || []).reduce(
                                (sum, item) => sum + item.quantity,
                                0
                            );
                            const history = getHistory(order);
                            const expanded = expandedId === order.id;
                            const canDelete = !['delivered', 'cancelled'].includes(order.status);

                            return (
                                <li key={order.id}>
                                    <article>
                                        <h3>
                                            {orderNumber(order.id)} —{' '}
                                            {order.customer_name || 'Sem nome do cliente'}
                                        </h3>

                                        <p>
                                            Status: {meta.label} · Total:{' '}
                                            {formatPrice(order.total)}
                                        </p>

                                        <p>
                                            {formatDateTime(order.created_at)} ·{' '}
                                            {order.user?.name || '—'} · {itemCount} item(ns)
                                        </p>

                                        <ul>
                                            {(order.items || []).map((item) => (
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

                                        {order.notes && (
                                            <p>
                                                <strong>Observações do pedido:</strong>{' '}
                                                {order.notes}
                                            </p>
                                        )}

                                        <p>
                                            <button
                                                type="button"
                                                onClick={() => printOrder(order)}
                                            >
                                                Imprimir
                                            </button>{' '}
                                            <button
                                                type="button"
                                                onClick={() => copyOrder(order)}
                                            >
                                                {copiedId === order.id
                                                    ? 'Copiado!'
                                                    : 'Copiar'}
                                            </button>{' '}
                                            <button
                                                type="button"
                                                onClick={() => openStatusModal(order)}
                                            >
                                                Alterar status
                                            </button>{' '}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setExpandedId(expanded ? null : order.id)
                                                }
                                            >
                                                Histórico ({history.length})
                                            </button>
                                            {canDelete && (
                                                <>
                                                    {' '}
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteOrder(order)}
                                                    >
                                                        Excluir
                                                    </button>
                                                </>
                                            )}
                                        </p>

                                        {expanded && renderTimeline(order)}
                                    </article>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {/* ================= MODAL DE STATUS ================= */}
            {statusModal && (
                <div role="dialog" aria-modal="true" aria-labelledby="status-modal-title">
                    <h2 id="status-modal-title">
                        Alterar status {orderNumber(statusModal.order.id)}
                    </h2>
                    <p>Escolha o novo status do pedido.</p>

                    {statusModal.error && <p role="alert">{statusModal.error}</p>}

                    <p>
                        {STATUS_ORDER.map((status) => {
                            const meta = STATUS_META[status];
                            const isCurrent = status === statusModal.order.status;
                            return (
                                <button
                                    key={status}
                                    type="button"
                                    aria-pressed={statusModal.selected === status}
                                    onClick={() => selectStatus(status)}
                                    disabled={isCurrent}
                                >
                                    {meta.label}
                                    {isCurrent ? ' (atual)' : ''}
                                </button>
                            );
                        })}
                    </p>

                    {STATUS_META[statusModal.selected]?.needsReason && (
                        <p>
                            <label htmlFor="status-reason">
                                Motivo (obrigatório para{' '}
                                {STATUS_META[statusModal.selected].label.toLowerCase()})
                            </label>{' '}
                            <textarea
                                id="status-reason"
                                rows={3}
                                maxLength={1000}
                                placeholder="Explique o motivo desta alteração..."
                                value={statusModal.reason}
                                onChange={(e) =>
                                    setStatusModal((prev) => ({
                                        ...prev,
                                        reason: e.target.value,
                                        error: '',
                                    }))
                                }
                            />
                        </p>
                    )}

                    <p>
                        <button
                            type="button"
                            onClick={closeStatusModal}
                            disabled={statusModal.saving}
                        >
                            Cancelar
                        </button>{' '}
                        <button
                            type="button"
                            onClick={confirmStatus}
                            disabled={
                                statusModal.saving ||
                                statusModal.selected === statusModal.order.status
                            }
                        >
                            {statusModal.saving ? 'A guardar...' : 'Confirmar status'}
                        </button>
                    </p>
                </div>
            )}
        </div>
    );
}
