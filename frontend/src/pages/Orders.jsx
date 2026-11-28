import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
import { ordersApi, productsApi } from '../Services/api';
import PageHeader from '../components/ui/PageHeader';
import SegmentedControl from '../components/ui/SegmentedControl';
import TableToolbar from '../components/ui/TableToolbar';
import FloatingPanel from '../components/ui/FloatingPanel';
import OrderCard from '../components/OrderCard';
import OrderExpandedPanel from '../components/OrderExpandedPanel';
import OrderFloatingCard, { OrderPanelTopBar } from '../components/OrderFloatingCard';
import useAutoDismiss from '../hooks/useAutoDismiss';
import { useResourceFocus } from '../hooks/useResourceFocus';
import {
    FILTERS,
    OPEN_STATUSES,
    STATUS_META,
    STATUS_ORDER,
    formatDateTime,
    formatPrice,
    getErrorMessage,
    getHistory,
    orderNumber,
} from '../lib/orderStatus';
import '../styles/orders.css';

const COMPLETE_STATUSES = ['delivered', 'cancelled', 'not_delivered', 'late'];

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
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
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

    // Formulário de criação/edição (sempre dentro do painel lateral)
    const [customerName, setCustomerName] = useState('');
    const [orderNotes, setOrderNotes] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');
    const [cart, setCart] = useState([]); // [{ product, quantity, notes, addons }]
    const [showNewOrder, setShowNewOrder] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [pickQty, setPickQty] = useState('1');

    // Filtros da lista
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    // Estado do painel de alteração de status
    const [statusModal, setStatusModal] = useState(null); // { order, selected, reason, saving, error }
    const [deletingOrder, setDeletingOrder] = useState(false);

    // Visualização da lista
    const [grupo, setGrupo] = useState('all');
    const [mostrarBusca, setMostrarBusca] = useState(false);
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [detailId, setDetailId] = useState(null);
    const [detailMode, setDetailMode] = useState('detail'); // detail | edit | status | delete
    const [orderExpanded, setOrderExpanded] = useState(false);
    const [highlightedId, setHighlightedId] = useState(null);

    useAutoDismiss(success, setSuccess, 4000);
    useAutoDismiss(lastCreated, setLastCreated, 8000);

    /* ---------------- Carregamento ---------------- */

    const loadProducts = useCallback(async () => {
        try {
            const res = await productsApi.list();
            setProducts(
                (res.data || []).filter((p) => p.is_active && p.status !== 'desenvolvimento')
            );
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao carregar os produtos.'));
        }
    }, []);

    const loadOrders = useCallback(async () => {
        try {
            const res = await ordersApi.list();
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

    // Notificação de pedido: limpa filtros, abre o registro e destaca o card.
    useResourceFocus(({ resourceType, resourceId, highlight }) => {
        if (resourceType !== 'order' || !resourceId || highlight === false) return;
        const id = Number(resourceId);
        setFilter('all');
        setGrupo('all');
        setSearch('');
        setHighlightedId(id);
        setShowNewOrder(false);
        setStatusModal(null);
        setDetailId(id);
        setDetailMode('detail');
        setOrderExpanded(false);
        window.setTimeout(() => {
            const element = document.getElementById(`order-${resourceId}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element?.focus({ preventScroll: true });
        }, 120);
        window.setTimeout(() => setHighlightedId(null), 3200);
    });

    /* ---------------- Novo pedido / edição ---------------- */

    useEffect(() => {
        if (!showNewOrder && detailMode !== 'edit') return;
        const select = document.getElementById('product-select');
        const target =
            select && !select.disabled ? select : document.getElementById('customer-name');
        target?.focus();
    }, [showNewOrder, detailMode, editingOrder]);

    const resetForm = () => {
        setEditingOrder(null);
        setCart([]);
        setCustomerName('');
        setOrderNotes('');
        setSelectedProductId('');
    };

    const closeNewOrder = () => {
        setShowNewOrder(false);
        resetForm();
    };

    // fecha o pop-up após criar; o aviso 'Pedido pronto para imprimir ou copiar' continua na página
    useEffect(() => {
        if (lastCreated) closeNewOrder();
    }, [lastCreated]);

    const closeDrawer = () => {
        if (showNewOrder) {
            closeNewOrder();
            return;
        }
        setDetailId(null);
        setDetailMode('detail');
        setStatusModal(null);
        setOrderExpanded(false);
    };

    const toggleNewOrder = () => {
        if (showNewOrder) {
            closeNewOrder();
        } else {
            resetForm();
            setStatusModal(null);
            setDetailId(null);
            setDetailMode('detail');
            setOrderExpanded(false);
            setShowNewOrder(true);
        }
    };

    const startEditOrder = (order) => {
        setEditingOrder(order);
        setCustomerName(order.customer_name || '');
        setOrderNotes(order.notes || '');
        setSelectedProductId('');
        setCart(
            (order.items || []).map((item) => ({
                product: item.product,
                quantity: item.quantity,
                notes: item.notes || '',
                addons: (item.addons || []).map((addon) => ({
                    product_addon_id: addon.product_addon_id,
                    quantity: addon.quantity,
                    name: addon.addon?.name || 'Adicional',
                    price: addon.unit_price,
                })),
            }))
        );
        setError('');
        setSuccess('');
        setShowNewOrder(false);
        setStatusModal(null);
        setDetailId(order.id);
        setDetailMode('edit');
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
            return [...prev, { product, quantity: 1, notes: '', addons: [] }];
        });
    };

    const addSelectedProduct = () => {
        const product = products.find((item) => String(item.id) === String(selectedProductId));
        if (!product) return;
        addProduct(product);
        setSelectedProductId('');
    };

    const addPicked = () => {
        const product = products.find((item) => String(item.id) === String(selectedProductId));
        if (!product) return;
        const n = Math.max(1, parseInt(pickQty, 10) || 1);
        addSelectedProduct();
        for (let i = 1; i < n; i++) {
            addProduct(product);
        }
        setPickQty('1');
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

    const cartTotal = cart.reduce((sum, entry) => {
        const addons = (entry.addons || []).reduce(
            (addonSum, addon) => addonSum + Number(addon.price) * addon.quantity,
            0
        );
        return sum + Number(entry.product.price) * entry.quantity + addons;
    }, 0);

    /* ---------------- Guardar pedido ---------------- */

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
                    addons: (entry.addons || []).map((addon) => ({
                        product_addon_id: addon.product_addon_id,
                        quantity: addon.quantity,
                    })),
                })),
            };

            if (editingOrder) {
                const res = await ordersApi.update(editingOrder.id, payload);
                setSuccess(res.data.message);
                setDetailMode('detail');
                if (!orderExpanded) setDetailId(null);
                resetForm();
            } else {
                const res = await ordersApi.create(payload);
                setLastCreated(res.data.order);
                setSuccess(`Pedido ${orderNumber(res.data.order.id)} criado com sucesso!`);
                setCart([]);
                setCustomerName('');
                setOrderNotes('');
            }

            await loadOrders();
            await loadProducts();
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    editingOrder
                        ? 'Erro ao atualizar o pedido.'
                        : 'Erro ao finalizar o pedido.'
                )
            );
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

    const requestDeleteOrder = (order) => {
        setError('');
        setStatusModal(null);
        setDetailId(order.id);
        setDetailMode('delete');
    };

    const confirmDeleteOrder = async () => {
        if (!selectedOrder || deletingOrder) return;
        setDeletingOrder(true);
        try {
            const res = await ordersApi.remove(selectedOrder.id);
            setSuccess(res.data.message);
            setDetailId(null);
            setDetailMode('detail');
            setOrderExpanded(false);
            await loadOrders();
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao excluir o pedido.'));
        } finally {
            setDeletingOrder(false);
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
        setDetailId(order.id);
        setDetailMode('status');
    };

    const backToDetail = () => {
        setShowNewOrder(false);
        setStatusModal(null);
        setDetailMode('detail');
    };

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
            const res = await ordersApi.updateStatus(
                order.id,
                selected,
                meta?.needsReason ? reason.trim() : undefined
            );
            setSuccess(res.data.message);
            setStatusModal(null);
            setDetailMode('detail');
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

    const visibleOrders = filteredOrders.filter((order) => {
        if (grupo === 'novos') return OPEN_STATUSES.includes(order.status);
        if (grupo === 'completo') return COMPLETE_STATUSES.includes(order.status);
        return true;
    });

    const selectedOrder = orders.find((o) => o.id === detailId) || null;

    const canFinalize = (order) => OPEN_STATUSES.includes(order.status);
    const canEdit = (order) => !['delivered', 'cancelled'].includes(order.status);

    const finalizeOrder = (order) => {
        setDetailId(order.id);
        setDetailMode('status');
        setOrderExpanded(false);
        setStatusModal({ order, selected: 'delivered', reason: '', saving: false, error: '' });
    };

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

    const detailProps = selectedOrder
        ? {
              order: selectedOrder,
              expanded: orderExpanded,
              onToggleExpand: () => setOrderExpanded((value) => !value),
              onClose: closeDrawer,
              onEdit: () => startEditOrder(selectedOrder),
              onFinalize: finalizeOrder,
              onChangeStatus: () => openStatusModal(selectedOrder),
              onCopy: copyOrder,
              onPrint: printOrder,
              onDelete: requestDeleteOrder,
              onToggleHistory: () =>
                  setExpandedId(expandedId === selectedOrder.id ? null : selectedOrder.id),
              historyOpen: expandedId === selectedOrder.id,
              copied: copiedId === selectedOrder.id,
              canEdit: canEdit(selectedOrder),
              canFinalize: canFinalize(selectedOrder),
              renderTimeline,
              formatDateTime,
              formatPrice,
              orderNumber,
              getHistory,
          }
        : null;

    const drawerOpen = showNewOrder || Boolean(selectedOrder);
    const drawerTitle = showNewOrder
        ? 'Novo pedido'
        : detailMode === 'edit'
          ? `Editar pedido ${orderNumber(selectedOrder.id)}`
          : detailMode === 'status'
            ? `Alterar status ${orderNumber(selectedOrder.id)}`
            : detailMode === 'delete'
              ? `Excluir pedido ${orderNumber(selectedOrder.id)}`
              : selectedOrder?.customer_name || 'Pedido';

    const renderOrderForm = () => (
        <form id="order-drawer-form" onSubmit={finishOrder} className="orders-form">
            <div className="orders-form__customer">
                <input
                    id="customer-name"
                    type="text"
                    className="orders-form__field orders-form__customer-input"
                    placeholder="Nome pedido"
                    maxLength={120}
                    aria-label="Nome do pedido"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                />
                {editingOrder && (
                    <span className="orders-form__order-number">
                        {`Ordem ${orderNumber(editingOrder.id)}`}
                    </span>
                )}
            </div>

            {error && <p className="orders-form__error" role="alert">{error}</p>}

            <div className="orders-form__items-head">
                <h3 className="orders-form__title">Itens</h3>
                <div className="orders-form__labels">
                    <span>Produto</span>
                    <span>Qts</span>
                </div>
            </div>

            <div className="orders-form__divider" />

            <div className="orders-form__add-row">
                <select
                    id="product-select"
                    className="orders-form__field orders-form__select"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    disabled={loading || products.length === 0}
                    aria-label="Produto"
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
                </select>
                <input
                    type="number"
                    min="1"
                    step="1"
                    aria-label="Quantidade"
                    className="orders-form__field orders-form__qty"
                    value={pickQty}
                    onChange={(e) => setPickQty(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addPicked();
                        }
                    }}
                />
                <button
                    type="button"
                    className="orders-form__check"
                    aria-label="Adicionar produto"
                    title="Adicionar produto"
                    onClick={addPicked}
                    disabled={!selectedProductId}
                >
                    <Check size={14} aria-hidden="true" />
                </button>
            </div>

            <div className="orders-form__divider" />

            {cart.length === 0 ? (
                <p className="orders-form__empty">Selecione um produto acima para começar.</p>
            ) : (
                <ul className="orders-form__cart">
                    {cart.map((entry, index) => (
                        <li key={entry.product.id} className="orders-form__cart-item">
                            <div className="orders-form__cart-main">
                                <span className="orders-form__chip">
                                    {`${entry.quantity}× ${entry.product.name}`}
                                    <button
                                        type="button"
                                        className="orders-form__chip-button"
                                        aria-label={`Diminuir ${entry.product.name}`}
                                        onClick={() => changeQuantity(index, -1)}
                                    >
                                        <Minus size={10} aria-hidden="true" />
                                    </button>
                                    <button
                                        type="button"
                                        className="orders-form__chip-button"
                                        aria-label={`Aumentar ${entry.product.name}`}
                                        onClick={() => changeQuantity(index, 1)}
                                    >
                                        <Plus size={10} aria-hidden="true" />
                                    </button>
                                    <button
                                        type="button"
                                        className="orders-form__chip-button"
                                        aria-label={`Remover ${entry.product.name}`}
                                        onClick={() => removeItem(index)}
                                    >
                                        <X size={10} aria-hidden="true" />
                                    </button>
                                </span>
                                <span className="orders-form__item-value">
                                    {formatPrice(
                                        Number(entry.product.price) * entry.quantity +
                                            (entry.addons || []).reduce(
                                                (sum, addon) => sum + Number(addon.price) * addon.quantity,
                                                0
                                            )
                                    )}
                                </span>
                            </div>

                            {(entry.addons || []).map((addon, addonIndex) => (
                                <div key={`${addon.product_addon_id}-${addonIndex}`} className="orders-form__addon">
                                    {`+ ${addon.quantity}× ${addon.name} — ${formatPrice(Number(addon.price) * addon.quantity)}`}
                                </div>
                            ))}

                            <input
                                id={`item-note-${index}`}
                                type="text"
                                className="orders-form__field orders-form__item-note"
                                maxLength={1000}
                                placeholder="Ex.: salada sem cebola"
                                aria-label="Observação do item"
                                value={entry.notes}
                                onChange={(e) => changeItemNote(index, e.target.value)}
                            />
                        </li>
                    ))}
                </ul>
            )}

            <div className="orders-form__notes">
                <label className="orders-form__label" htmlFor="order-notes">Observações do pedido</label>
                <textarea
                    id="order-notes"
                    className="orders-form__field orders-form__textarea"
                    rows={2}
                    maxLength={1000}
                    placeholder="Ex.: entregar na portaria, ponto da carne..."
                    aria-label="Observações do pedido"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                />
            </div>

            <div className="orders-form__divider" />

            <div className="side-drawer-total">
                <span>Total do pedido</span>
                <strong>{formatPrice(cartTotal)}</strong>
            </div>
        </form>
    );

    const renderStatusPanel = () => {
        if (!statusModal) return null;
        return (
            <div className="orders-status-modal">
                {statusModal.error && (
                    <p className="orders-status-error" role="alert">{statusModal.error}</p>
                )}

                <p className="orders-status-pills">
                    {STATUS_ORDER.map((status) => {
                        const meta = STATUS_META[status];
                        const isCurrent = status === statusModal.order.status;
                        return (
                            <button
                                key={status}
                                type="button"
                                className="orders-status-pill"
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
                    <p className="orders-status-reason">
                        <label className="orders-status-label" htmlFor="status-reason">
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

            </div>
        );
    };

    /* ---------------- Render ---------------- */

    const inSubFlow =
        showNewOrder ||
        detailMode === 'edit' ||
        detailMode === 'status' ||
        detailMode === 'delete';

    return (
        <div className="orders-page">
            <PageHeader
                title="Gestão de pedidos"
                subtitle="Controle de entrada e saída de pedidos"
            />

            {error && <p className="orders-message orders-message--error" role="alert">{error}</p>}

            {success && <p className="orders-message orders-message--success" role="status" aria-live="polite">{success}</p>}

            {lastCreated && (
                <p className="orders-last-created">
                    Pedido {orderNumber(lastCreated.id)} pronto para imprimir ou copiar.{' '}
                    <button type="button" onClick={() => printOrder(lastCreated)}>
                        Imprimir
                    </button>{' '}
                    <button type="button" onClick={() => copyOrder(lastCreated)}>
                        {copiedId === lastCreated.id ? 'Copiado!' : 'Copiar'}
                    </button>
                </p>
            )}

            {/* ================= LISTA ================= */}
            <section className="orders-list-section">
                <h2 className="sr-only">Pedidos</h2>
                <p className="sr-only">
                    Altere o status, imprima, copie ou consulte o histórico de cada pedido.
                </p>

                <div className="orders-controls">
                    <SegmentedControl
                        ariaLabel="Filtrar pedidos por grupo"
                        options={[{ value: 'all', label: 'Todos' }, { value: 'novos', label: 'Novos' }, { value: 'completo', label: 'Completo' }]}
                        value={grupo}
                        onChange={setGrupo}
                    />
                    <TableToolbar
                        onAdd={toggleNewOrder}
                        onSearch={() => setMostrarBusca(v => !v)}
                        onFilter={() => setMostrarFiltros(v => !v)}
                        ariaLabel="Ações dos pedidos"
                    />
                </div>

                {mostrarFiltros && (
                    <div className="orders-filter-row">
                        <label className="orders-filter-label" htmlFor="orders-status-filter">
                            Filtrar por status
                        </label>
                        <select
                            id="orders-status-filter"
                            className="orders-filter-select"
                            aria-label="Filtrar por status"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            {FILTERS.map((item) => (
                                <option key={item.key} value={item.key}>
                                    {`${item.label} (${counts[item.key] || 0})`}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {(mostrarBusca || search) && (
                    <p className="orders-search">
                        <input
                            id="order-search"
                            type="search"
                            placeholder="Nº do pedido, cliente ou atendente"
                            aria-label="Buscar pedido"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </p>
                )}

                <div className={`orders-layout${orderExpanded ? ' orders-layout--expanded' : ''}`}>
                    <div className="orders-grid">
                        {loading ? (
                            <p className="orders-empty">A carregar pedidos...</p>
                        ) : visibleOrders.length === 0 ? (
                            <p className="orders-empty">Nenhum pedido encontrado com estes filtros.</p>
                        ) : (
                            visibleOrders.map((order) => {
                                const meta = STATUS_META[order.status] || {
                                    label: order.status,
                                };
                                const tone =
                                    order.status === 'cancelled'
                                        ? 'danger'
                                        : order.status === 'not_delivered' ||
                                            order.status === 'late'
                                          ? 'warning'
                                          : 'info';

                                return (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        selected={order.id === detailId}
                                        onOpen={(opened) => {
                                            if (
                                                detailId === opened.id &&
                                                detailMode === 'detail' &&
                                                drawerOpen
                                            ) {
                                                closeDrawer();
                                                return;
                                            }
                                            setShowNewOrder(false);
                                            setStatusModal(null);
                                            setDetailId(opened.id);
                                            setDetailMode('detail');
                                            setOrderExpanded(false);
                                        }}
                                        onFinalize={finalizeOrder}
                                        canFinalize={canFinalize(order)}
                                        statusLabel={meta.label}
                                        tone={tone}
                                        highlighted={highlightedId === order.id}
                                    />
                                );
                            })
                        )}
                    </div>
                    <FloatingPanel
                        inline
                        open={drawerOpen}
                        onClose={closeDrawer}
                        title={drawerTitle}
                        eyebrow="Gestão de pedidos"
                        showExpand={drawerOpen && !inSubFlow}
                        expanded={orderExpanded}
                        expandedContentClass={`orders-detail--fullscreen-expanded${inSubFlow ? ' orders-detail--fullscreen-form' : ''}`}
                        onToggleExpand={() => setOrderExpanded((value) => !value)}
                        subtitle={
                            showNewOrder || detailMode === 'edit'
                                ? 'Informe os itens e confira o total antes de salvar.'
                                : detailMode === 'status'
                                  ? 'Escolha o novo status e informe o motivo quando necessário.'
                                  : detailMode === 'delete'
                                    ? 'Esta ação não pode ser desfeita.'
                                    : undefined
                        }
                        minimalHeader={drawerOpen}
                        ariaLabel={drawerTitle}
                        footer={detailMode === 'detail' && !showNewOrder && selectedOrder ? null : (
                            showNewOrder || detailMode === 'edit' ? (
                                <>
                                    <button
                                        type="button"
                                        className="side-drawer-button"
                                        onClick={closeDrawer}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        form="order-drawer-form"
                                        className="side-drawer-button side-drawer-button--primary"
                                        disabled={cart.length === 0 || submitting}
                                    >
                                        {submitting
                                            ? 'A guardar...'
                                            : editingOrder
                                              ? 'Guardar alterações'
                                              : 'Criar pedido'}
                                    </button>
                                </>
                            ) : detailMode === 'status' ? (
                                <button
                                    type="button"
                                    className="side-drawer-button side-drawer-button--primary"
                                    onClick={confirmStatus}
                                    disabled={
                                        statusModal?.saving ||
                                        statusModal?.selected === statusModal?.order.status
                                    }
                                >
                                    {statusModal?.saving ? 'A guardar...' : 'Confirmar status'}
                                </button>
                            ) : detailMode === 'delete' ? (
                                <>
                                    <button
                                        type="button"
                                        className="side-drawer-button"
                                        onClick={closeDrawer}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        className="side-drawer-button side-drawer-button--danger"
                                        onClick={confirmDeleteOrder}
                                        disabled={deletingOrder}
                                    >
                                        {deletingOrder ? 'Excluindo...' : 'Excluir pedido'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    {selectedOrder && canEdit(selectedOrder) && (
                                        <button
                                            type="button"
                                            className="side-drawer-button side-drawer-button--danger"
                                            onClick={() => startEditOrder(selectedOrder)}
                                        >
                                            Editar pedido
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="side-drawer-button side-drawer-button--primary"
                                        onClick={() => openStatusModal(selectedOrder)}
                                    >
                                        Alterar status
                                    </button>
                                </>
                            )
                        )}
                    >
                        {(showNewOrder || detailMode !== 'detail') && (
                            <OrderPanelTopBar
                                onToggleExpand={() => setOrderExpanded(true)}
                                onClose={closeDrawer}
                                canExpand={!inSubFlow}
                                onBack={showNewOrder ? closeDrawer : inSubFlow ? backToDetail : undefined}
                            />
                        )}
                        {(showNewOrder || detailMode !== 'detail') && (
                            <div className="order-panel-heading">
                                {orderExpanded && !inSubFlow && (
                                    <button
                                        type="button"
                                        className="order-panel-collapse"
                                        onClick={() => setOrderExpanded(false)}
                                    >
                                        Recolher
                                    </button>
                                )}
                                <span>Gestão de pedidos</span>
                                <h3>{drawerTitle}</h3>
                            </div>
                        )}
                        {showNewOrder || detailMode === 'edit' ? (
                            renderOrderForm()
                        ) : detailMode === 'status' ? (
                            renderStatusPanel()
                        ) : detailMode === 'delete' ? (
                            <p className="side-drawer-help">
                                Confirma a exclusão do pedido {orderNumber(selectedOrder.id)}? Ele será removido da listagem.
                            </p>
                        ) : (
                            detailProps &&
                                (orderExpanded ? (
                                    <OrderExpandedPanel
                                        order={selectedOrder}
                                        copied={detailProps.copied}
                                        canEdit={detailProps.canEdit}
                                        canFinalize={detailProps.canFinalize}
                                        onCopy={detailProps.onCopy}
                                        onEdit={detailProps.onEdit}
                                        onFinalize={detailProps.onFinalize}
                                        onPrint={detailProps.onPrint}
                                        onChangeStatus={detailProps.onChangeStatus}
                                        onDelete={detailProps.onDelete}
                                        onClose={closeDrawer}
                                        onToggleExpand={detailProps.onToggleExpand}
                                        formatPrice={detailProps.formatPrice}
                                        orderNumber={detailProps.orderNumber}
                                    />
                                ) : (
                                    <OrderFloatingCard
                                        order={selectedOrder}
                                        copied={detailProps.copied}
                                        canEdit={detailProps.canEdit}
                                        canFinalize={detailProps.canFinalize}
                                        onCopy={detailProps.onCopy}
                                        onEdit={detailProps.onEdit}
                                        onFinalize={detailProps.onFinalize}
                                        onPrint={detailProps.onPrint}
                                        onChangeStatus={detailProps.onChangeStatus}
                                        onDelete={detailProps.onDelete}
                                        onClose={closeDrawer}
                                        onToggleExpand={detailProps.onToggleExpand}
                                        formatPrice={detailProps.formatPrice}
                                        orderNumber={detailProps.orderNumber}
                                    />
                                ))
                        )}
                    </FloatingPanel>
                </div>
            </section>

        </div>
    );
}
