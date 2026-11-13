import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    Printer,
    Copy,
    Clock,
    Search,
    CheckCircle2,
    XCircle,
    ClipboardList,
    ChevronDown,
    ChevronUp,
    Loader2,
    RefreshCw,
    User,
    X,
} from 'lucide-react';
import api from '../Services/api';
import {
    FILTERS,
    OPEN_STATUSES,
    STATUS_META,
    STATUS_ORDER,
    formatDateTime,
    formatPrice,
    getErrorMessage,
    getHistory,
    isToday,
    orderNumber,
} from '../lib/orderStatus';
import '../styles/orders.css';

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
    const [productSearch, setProductSearch] = useState('');
    const [cart, setCart] = useState([]); // [{ product, quantity, notes }]

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

    const cartCount = cart.reduce((sum, entry) => sum + entry.quantity, 0);

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

    const stats = useMemo(() => {
        const todayOrders = orders.filter((order) => isToday(order.created_at));
        return {
            today: todayOrders.length,
            open: orders.filter((order) => OPEN_STATUSES.includes(order.status)).length,
            deliveredToday: todayOrders.filter((order) => order.status === 'delivered').length,
            cancelled: orders.filter((order) =>
                ['cancelled', 'not_delivered', 'late'].includes(order.status)
            ).length,
        };
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

    const visibleProducts = useMemo(() => {
        const term = productSearch.trim().toLowerCase();
        if (!term) return products;
        return products.filter((product) => product.name.toLowerCase().includes(term));
    }, [products, productSearch]);

    /* ---------------- Render ---------------- */

    const renderTimeline = (order) => (
        <div className="timeline">
            {getHistory(order).map((entry) => {
                const meta = STATUS_META[entry.status] || {
                    label: entry.status,
                    tone: 'pending',
                };
                return (
                    <div className="timeline-item" key={entry.id}>
                        <span className={`timeline-dot tone-${meta.tone}`} />
                        <div className="timeline-content">
                            <span className="timeline-status">{meta.label}</span>
                            <span className="timeline-date">
                                {formatDateTime(entry.created_at)}
                                {entry.user?.name ? ` · por ${entry.user.name}` : ''}
                            </span>
                            {entry.reason && (
                                <span className="timeline-reason">Motivo: {entry.reason}</span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="orders-page">
            <header className="page-head">
                <div>
                    <h1 className="page-title">Gestão de Pedidos</h1>
                    <p className="page-sub">
                        Crie pedidos com os produtos cadastrados, imprima, copie para o WhatsApp e
                        acompanhe cada alteração de status.
                    </p>
                </div>
            </header>

            <div className="stat-row">
                <div className="stat-card accent">
                    <span className="stat-label">Pedidos hoje</span>
                    <span className="stat-value">{stats.today}</span>
                </div>
                <div className="stat-card warning">
                    <span className="stat-label">Em aberto</span>
                    <span className="stat-value">{stats.open}</span>
                </div>
                <div className="stat-card success">
                    <span className="stat-label">Entregues hoje</span>
                    <span className="stat-value">{stats.deliveredToday}</span>
                </div>
                <div className="stat-card danger">
                    <span className="stat-label">Cancel./atrasos</span>
                    <span className="stat-value">{stats.cancelled}</span>
                </div>
            </div>

            {error && (
                <div className="notice notice-error">
                    <XCircle size={16} /> {error}
                </div>
            )}

            {success && (
                <div className="notice notice-success">
                    <CheckCircle2 size={16} /> {success}
                </div>
            )}

            {lastCreated && (
                <div className="notice notice-info" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <span>
                        <ClipboardList size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                        Pedido {orderNumber(lastCreated.id)} pronto para imprimir ou copiar.
                    </span>
                    <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => printOrder(lastCreated)}
                        >
                            <Printer size={14} /> Imprimir
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => copyOrder(lastCreated)}
                        >
                            <Copy size={14} /> {copiedId === lastCreated.id ? 'Copiado!' : 'Copiar'}
                        </button>
                    </span>
                </div>
            )}

            {/* ================= CRIAÇÃO ================= */}
            <div className="orders-grid">
                {/* Catálogo */}
                <section className="panel">
                    <div className="panel-head">
                        <div>
                            <h2 className="panel-title">
                                <ClipboardList size={18} /> Produtos cadastrados
                            </h2>
                            <p className="panel-sub">
                                Toque num produto para adicioná-lo ao pedido.
                            </p>
                        </div>
                    </div>

                    <div className="field">
                        <label htmlFor="product-search">Buscar produto</label>
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
                                id="product-search"
                                className="input"
                                type="search"
                                placeholder="Nome do produto..."
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                style={{ paddingLeft: 36 }}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading-row">
                            <Loader2 size={16} className="spin" /> A carregar produtos...
                        </div>
                    ) : visibleProducts.length === 0 ? (
                        <div className="empty">
                            <ShoppingCart size={26} />
                            Nenhum produto ativo encontrado.
                        </div>
                    ) : (
                        <div className="catalog-grid">
                            {visibleProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className={`product-card ${product.available ? '' : 'is-unavailable'}`}
                                >
                                    <span className="product-meta">{product.category}</span>
                                    <span className="product-name">{product.name}</span>
                                    <span className="product-price">{formatPrice(product.price)}</span>
                                    <span className={`product-stock ${product.available ? '' : 'is-out'}`}>
                                        {product.available ? 'Disponível' : 'Indisponível (estoque)'}
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        disabled={!product.available}
                                        onClick={() => addProduct(product)}
                                    >
                                        <Plus size={14} /> Adicionar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Carrinho */}
                <section className="panel">
                    <div className="panel-head">
                        <div>
                            <h2 className="panel-title">
                                <ShoppingCart size={18} /> Novo pedido
                            </h2>
                            <p className="panel-sub">
                                {cartCount === 0
                                    ? 'Nenhum item adicionado.'
                                    : `${cartCount} item(ns) no pedido.`}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={finishOrder} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="field">
                            <label htmlFor="customer-name">Cliente</label>
                            <input
                                id="customer-name"
                                className="input"
                                type="text"
                                placeholder="Nome do cliente (opcional)"
                                maxLength={120}
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                        </div>

                        {cart.length === 0 ? (
                            <div className="empty">
                                <ShoppingCart size={26} />
                                Adicione produtos do catálogo ao lado.
                            </div>
                        ) : (
                            <div className="cart-list">
                                {cart.map((entry, index) => (
                                    <div className="cart-item" key={entry.product.id}>
                                        <div className="cart-item-top">
                                            <span className="cart-item-name">{entry.product.name}</span>
                                            <span className="cart-item-price">
                                                {formatPrice(entry.product.price * entry.quantity)}
                                            </span>
                                        </div>

                                        <div className="cart-item-row">
                                            <div className="qty-controls">
                                                <button
                                                    type="button"
                                                    className="qty-btn"
                                                    aria-label={`Diminuir ${entry.product.name}`}
                                                    onClick={() => changeQuantity(index, -1)}
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className="qty-value">{entry.quantity}</span>
                                                <button
                                                    type="button"
                                                    className="qty-btn"
                                                    aria-label={`Aumentar ${entry.product.name}`}
                                                    onClick={() => changeQuantity(index, 1)}
                                                >
                                                    <Plus size={14} />
                                                </button>
                                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                    × {formatPrice(entry.product.price)}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm"
                                                onClick={() => removeItem(index)}
                                            >
                                                <Trash2 size={13} /> Remover
                                            </button>
                                        </div>

                                        <div className="field">
                                            <label htmlFor={`item-note-${index}`}>
                                                Observação do item
                                            </label>
                                            <input
                                                id={`item-note-${index}`}
                                                className="input cart-note"
                                                type="text"
                                                maxLength={1000}
                                                placeholder="Ex.: salada sem cebola"
                                                value={entry.notes}
                                                onChange={(e) => changeItemNote(index, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="field">
                            <label htmlFor="order-notes">Observações do pedido</label>
                            <textarea
                                id="order-notes"
                                className="textarea"
                                rows={2}
                                maxLength={1000}
                                placeholder="Ex.: entregar na portaria, ponto da carne..."
                                value={orderNotes}
                                onChange={(e) => setOrderNotes(e.target.value)}
                            />
                        </div>

                        <div className="cart-total">
                            <span className="cart-total-label">Total do pedido</span>
                            <span className="cart-total-value">{formatPrice(cartTotal)}</span>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-success btn-block"
                            disabled={cart.length === 0 || submitting}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={16} className="spin" /> A finalizar...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={16} /> Finalizar pedido
                                </>
                            )}
                        </button>
                    </form>
                </section>
            </div>

            {/* ================= LISTA ================= */}
            <section className="panel">
                <div className="panel-head">
                    <div>
                        <h2 className="panel-title">
                            <ClipboardList size={18} /> Pedidos
                        </h2>
                        <p className="panel-sub">
                            Altere o status, imprima, copie ou consulte o histórico de cada pedido.
                        </p>
                    </div>
                    <div className="field" style={{ minWidth: 220 }}>
                        <label htmlFor="order-search">Buscar pedido</label>
                        <input
                            id="order-search"
                            className="input"
                            type="search"
                            placeholder="Nº do pedido, cliente ou atendente"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="filters">
                    {FILTERS.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            className={`chip ${filter === item.key ? 'is-active' : ''}`}
                            onClick={() => setFilter(item.key)}
                        >
                            {item.label}
                            <span className="chip-count">{counts[item.key] || 0}</span>
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="loading-row">
                        <Loader2 size={16} className="spin" /> A carregar pedidos...
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="empty">
                        <ClipboardList size={28} />
                        Nenhum pedido encontrado com estes filtros.
                    </div>
                ) : (
                    <div className="order-list">
                        {filteredOrders.map((order) => {
                            const meta = STATUS_META[order.status] || {
                                label: order.status,
                                tone: 'pending',
                                icon: Clock,
                            };
                            const StatusIcon = meta.icon;
                            const itemCount = (order.items || []).reduce(
                                (sum, item) => sum + item.quantity,
                                0
                            );
                            const history = getHistory(order);
                            const expanded = expandedId === order.id;
                            const canDelete = !['delivered', 'cancelled'].includes(order.status);

                            return (
                                <article className="order-card" key={order.id}>
                                    <div className="order-card-head">
                                        <div>
                                            <div className="order-num">{orderNumber(order.id)}</div>
                                            <div className="order-customer">
                                                {order.customer_name || 'Sem nome do cliente'}
                                            </div>
                                        </div>
                                        <span className={`badge tone-${meta.tone}`}>
                                            <StatusIcon size={13} />
                                            {meta.label}
                                        </span>
                                        <span className="order-total">{formatPrice(order.total)}</span>
                                    </div>

                                    <div className="order-meta">
                                        <span>
                                            <Clock size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                                            {formatDateTime(order.created_at)}
                                        </span>
                                        <span>
                                            <User size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                                            {order.user?.name || '—'}
                                        </span>
                                        <span>
                                            <ShoppingCart size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                                            {itemCount} item(ns)
                                        </span>
                                    </div>

                                    <div className="order-items">
                                        {(order.items || []).map((item) => (
                                            <div key={item.id}>
                                                <div className="order-item">
                                                    <span>
                                                        <span className="order-item-qty">{item.quantity}×</span>
                                                        {item.product?.name || 'Produto'}
                                                    </span>
                                                    <span>{formatPrice(item.subtotal)}</span>
                                                </div>
                                                {(item.addons || []).map((addon) => (
                                                    <div className="order-item-addon" key={addon.id}>
                                                        + {addon.quantity}× {addon.addon?.name || 'Adicional'}
                                                    </div>
                                                ))}
                                                {item.notes && (
                                                    <div className="order-item-note">Obs.: {item.notes}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {order.notes && (
                                        <div className="order-note">
                                            <strong>Observações do pedido:</strong> {order.notes}
                                        </div>
                                    )}

                                    <div className="order-actions">
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => printOrder(order)}
                                        >
                                            <Printer size={15} /> Imprimir
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => copyOrder(order)}
                                        >
                                            <Copy size={15} /> {copiedId === order.id ? 'Copiado!' : 'Copiar'}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={() => openStatusModal(order)}
                                        >
                                            <RefreshCw size={15} /> Alterar status
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() =>
                                                setExpandedId(expanded ? null : order.id)
                                            }
                                        >
                                            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                            Histórico ({history.length})
                                        </button>
                                        {canDelete && (
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm"
                                                onClick={() => deleteOrder(order)}
                                            >
                                                <Trash2 size={15} /> Excluir
                                            </button>
                                        )}
                                    </div>

                                    {expanded && renderTimeline(order)}
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ================= MODAL DE STATUS ================= */}
            {statusModal && (
                <div
                    className="modal-backdrop"
                    role="presentation"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeStatusModal();
                    }}
                >
                    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="status-modal-title">
                        <div className="modal-head">
                            <div>
                                <h2 className="modal-title" id="status-modal-title">
                                    Alterar status {orderNumber(statusModal.order.id)}
                                </h2>
                                <p className="panel-sub">
                                    Escolha o novo status do pedido.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={closeStatusModal}
                                aria-label="Fechar"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {statusModal.error && (
                            <div className="notice notice-error">
                                <XCircle size={15} /> {statusModal.error}
                            </div>
                        )}

                        <div className="status-grid">
                            {STATUS_ORDER.map((status) => {
                                const meta = STATUS_META[status];
                                const Icon = meta.icon;
                                const isCurrent = status === statusModal.order.status;
                                return (
                                    <button
                                        key={status}
                                        type="button"
                                        className={`status-option ${
                                            statusModal.selected === status ? 'is-selected' : ''
                                        } ${isCurrent ? 'is-current' : ''}`}
                                        onClick={() => selectStatus(status)}
                                        disabled={isCurrent}
                                    >
                                        <Icon size={16} />
                                        {meta.label}
                                        {isCurrent ? ' (atual)' : ''}
                                    </button>
                                );
                            })}
                        </div>

                        {STATUS_META[statusModal.selected]?.needsReason && (
                            <div className="field">
                                <label htmlFor="status-reason">
                                    Motivo (obrigatório para {STATUS_META[statusModal.selected].label.toLowerCase()})
                                </label>
                                <textarea
                                    id="status-reason"
                                    className="textarea"
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
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={closeStatusModal}
                                disabled={statusModal.saving}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={confirmStatus}
                                disabled={
                                    statusModal.saving ||
                                    statusModal.selected === statusModal.order.status
                                }
                            >
                                {statusModal.saving ? (
                                    <>
                                        <Loader2 size={15} className="spin" /> A guardar...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={15} /> Confirmar status
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
