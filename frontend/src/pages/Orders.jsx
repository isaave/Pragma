import React, { useState, useEffect, useCallback } from 'react';
import api from '../Services/api';

const FILTERS = [
    { key: 'all', label: 'Todos' },
    { key: 'pending', label: 'Pendente' },
    { key: 'preparing', label: 'Preparando' },
    { key: 'ready', label: 'Pronto' },
    { key: 'delivered', label: 'Entregue' },
    { key: 'cancelled', label: 'Cancelado' },
];

const formatPrice = (value) =>
    Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getErrorMessage = (err, fallback) => {
    const data = err.response && err.response.data;
    if (data && data.errors) return Object.values(data.errors).flat().join(' ');
    if (data && data.message) return data.message;
    return fallback;
};

// Busca os adicionais de um produto
const loadProductAddons = async (productId) => {
    try {
        const res = await api.get(`/products/${productId}/addons`);
        return res.data || [];
    } catch (err) {
        return [];
    }
};

export default function Orders() {
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const [orderFilter, setOrderFilter] = useState('all');

    // Carrinho: [{ product, quantity, addons: [{ addon, quantity }], notes }]
    const [cart, setCart] = useState([]);
    const [cartNote, setCartNote] = useState('');

    // Adicionais disponíveis para o produto selecionado no PDV
    const [selectedProductAddons, setSelectedProductAddons] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState(null);

    // Para editar quantidade/addons de um item já no carrinho
    const [editingCartItem, setEditingCartItem] = useState(null); // index do item no carrinho

    const loadProducts = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/products', { params: { category: undefined, search: undefined } });
            // Só produtos ativos e disponíveis (com estoque) aparecem no PDV
            setProducts(res.data.filter((p) => p.is_active && p.available));
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao carregar os produtos.'));
        } finally {
            setLoading(false);
        }
    }, []);

    const loadOrders = useCallback(async () => {
        try {
            const res = await api.get('/orders', { params: { status: orderFilter !== 'all' ? orderFilter : undefined } });
            setOrders(res.data);
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao carregar os pedidos.'));
        }
    }, [orderFilter]);

    useEffect(() => {
        loadProducts();
        loadOrders();
    }, [loadProducts, loadOrders]);

    // ---------- Carrinho ----------

    const addToCart = async (product) => {
        setError('');
        // Carregar adicionais disponíveis para este produto
        const addons = await loadProductAddons(product.id);
        setSelectedProductAddons(addons);
        setSelectedProductId(product.id);

        setCart((prev) => {
            const exists = prev.find((c) => c.product.id === product.id);
            if (exists) {
                return prev.map((c) =>
                    c.product.id === product.id
                        ? { ...c, quantity: c.quantity + 1 }
                        : c
                );
            }
            return [...prev, { product, quantity: 1, addons: [], notes: '' }];
        });
    };

    const removeFromCart = (index) => {
        setCart((prev) => prev.filter((_, i) => i !== index));
    };

    const changeCartQty = (index, delta) => {
        setCart((prev) =>
            prev.map((c, i) => {
                if (i !== index) return c;
                const newQty = c.quantity + delta;
                if (newQty < 1) return c;
                return { ...c, quantity: newQty };
            })
        );
    };

    const toggleAddonInCart = (cartIndex, addon) => {
        setCart((prev) =>
            prev.map((c, i) => {
                if (i !== cartIndex) return c;
                const exists = c.addons.find((a) => a.addon.id === addon.id);
                if (exists) {
                    return {
                        ...c,
                        addons: c.addons.map((a) =>
                            a.addon.id === addon.id ? { ...a, quantity: a.quantity + 1 } : a
                        ),
                    };
                }
                return { ...c, addons: [...c.addons, { addon, quantity: 1 }] };
            })
        );
    };

    const removeAddonFromCart = (cartIndex, addonId) => {
        setCart((prev) =>
            prev.map((c, i) => {
                if (i !== cartIndex) return c;
                return { ...c, addons: c.addons.filter((a) => a.addon.id !== addonId) };
            })
        );
    };

    const changeCartItemNote = (index, value) => {
        setCart((prev) =>
            prev.map((c, i) => (i !== index ? c : { ...c, notes: value }))
        );
    };

    const cartSubtotal = () =>
        cart.reduce(
            (sum, c) =>
                sum +
                c.product.price * c.quantity +
                c.addons.reduce((a, b) => a + b.addon.price * b.quantity, 0),
            0
        );

    // ---------- Finalizar pedido ----------

    const finishOrder = async (e) => {
        e.preventDefault();
        if (cart.length === 0) {
            setError('Adicione pelo menos um item ao carrinho.');
            return;
        }
        setError('');
        setInfo('');
        setLoading(true);

        try {
            const payload = {
                notes: cartNote || null,
                items: cart.map((c) => ({
                    product_id: c.product.id,
                    quantity: c.quantity,
                    notes: c.notes || null,
                    addons: c.addons.map((a) => ({
                        product_addon_id: a.addon.id,
                        quantity: a.quantity,
                    })),
                })),
            };

            const res = await api.post('/orders', payload);
            setInfo(res.data.message);
            setCart([]);
            setCartNote('');
            setEditingCartItem(null);
            loadOrders();
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao finalizar o pedido.'));
        } finally {
            setLoading(false);
        }
    };

    // ---------- Pedidos ----------

    const changeOrderStatus = async (order, status) => {
        try {
            const res = await api.patch(`/orders/${order.id}/status`, { status });
            setInfo(res.data.message);
            loadOrders();
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao atualizar o status.'));
        }
    };

    const deleteOrder = async (order) => {
        if (!window.confirm(`Excluir o pedido #${order.id}?`)) return;
        try {
            const res = await api.delete(`/orders/${order.id}`);
            setInfo(res.data.message);
            loadOrders();
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao excluir o pedido.'));
        }
    };

    const formatDate = (value) => {
        if (!value) return '-';
        const d = new Date(value);
        return d.toLocaleString('pt-BR');
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
            <h1>Gestão de Pedidos</h1>
            <p>PDV para abertura de pedidos com baixa automática de estoque</p>

            {error && <p style={{ color: '#b91c1c', marginBottom: '8px' }}>{error}</p>}
            {info && <p style={{ color: '#15803d', marginBottom: '16px' }}>{info}</p>}

            {/* ========== PDV ========== */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {/* Produtos disponíveis */}
                <div style={{ flex: 1, minWidth: '320px' }}>
                    <h2 style={{ margin: '0 0 8px' }}>Cardápio (disponível)</h2>
                    {loading ? (
                        <p>Carregando produtos...</p>
                    ) : products.length === 0 ? (
                        <p>Nenhum produto disponível no momento.</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                            {products.map((p) => (
                                <div
                                    key={p.id}
                                    style={{
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        background: '#fff',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                >
                                    <div>
                                        <strong style={{ fontSize: '16px' }}>{p.name}</strong>
                                        <span style={{ fontSize: '13px', color: '#666', display: 'block', marginTop: '2px' }}>
                                            {p.category.charAt(0).toUpperCase() + p.category.slice(1)}
                                        </span>
                                    </div>
                                    <div style={{ marginTop: '6px', fontSize: '15px', color: '#1d4ed8', fontWeight: 700 }}>
                                        {formatPrice(p.price)}
                                    </div>
                                    {p.recipe.length > 0 ? (
                                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#666' }}>
                                            Receita: {p.recipe.map((r) => `${r.quantity} ${r.unit}`).join(', ')}
                                        </div>
                                    ) : null}
                                    {p.addons.length > 0 ? (
                                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#666' }}>
                                            Adicionais: {p.addons.map((a) => a.name).join(', ')}
                                        </div>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={() => addToCart(p)}
                                        style={{ marginTop: '8px', padding: '8px 12px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        Adicionar ao pedido
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Carrinho */}
                <div style={{ minWidth: '300px', maxWidth: '360px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h2 style={{ margin: 0 }}>Carrinho</h2>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '6px' }}>Observações do pedido</label>
                        <textarea
                            value={cartNote}
                            onChange={(e) => setCartNote(e.target.value)}
                            rows={2}
                            style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }}
                            placeholder="Ex.: Sem cebola, entrega na porta..."
                        />
                    </div>

                    {/* Adicionais disponíveis para o produto selecionado */}
                    {selectedProductId && selectedProductAddons.length > 0 && (
                        <div style={{ marginTop: '12px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: '0 0 8px', fontSize: '14px' }}>Adicionais para este produto:</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {selectedProductAddons.map((addon) => (
                                    <div
                                        key={addon.id}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}
                                    >
                                        <span>{addon.name} (+{formatPrice(addon.price)})</span>
                                        <button
                                            type="button"
                                            onClick={() => toggleAddonInCart(-1, addon)}
                                            style={{
                                                padding: '2px 8px',
                                                background: '#1d4ed8',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                            }}
                                        >
                                            Adicionar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px', background: '#fff', maxHeight: '400px', overflowY: 'auto' }}>
                        {cart.length === 0 ? (
                            <p style={{ fontSize: '13px', color: '#666', textAlign: 'center', marginTop: '20px' }}>Carrinho vazio</p>
                        ) : (
                            cart.map((item, idx) => (
                                <div key={idx} style={{ borderBottom: '1px solid #eee', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <strong>{item.product.name}</strong>
                                        <span style={{ color: '#1d4ed8', fontWeight: 700 }}>{formatPrice(item.product.price * item.quantity)}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                        <button
                                            type="button"
                                            onClick={() => changeCartQty(idx, -1)}
                                            style={{ padding: '2px 8px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            −
                                        </button>
                                        <span>{item.quantity}</span>
                                        <button
                                            type="button"
                                            onClick={() => changeCartQty(idx, 1)}
                                            style={{ padding: '2px 8px', background: '#dcfce7', color: '#15803d', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            +
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeFromCart(idx)}
                                            style={{ marginLeft: 'auto', color: '#b91c1c', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px' }}
                                        >
                                            Remover item
                                        </button>
                                    </div>

                                    {item.notes && (
                                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>Obs.: {item.notes}</div>
                                    )}

                                    {item.addons.length > 0 && (
                                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                                            {item.addons.map((a) => (
                                                <div key={a.addon.id} style={{ marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span>+ {a.addon.name} ×{a.quantity}</span>
                                                    <span style={{ color: '#1d4ed8' }}>{formatPrice(a.addon.price * a.quantity)}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAddonFromCart(idx, a.addon.id)}
                                                        style={{ marginLeft: 'auto', color: '#b91c1c', border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', padding: 0 }}
                                                    >
                                                        remover
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px' }}>
                        <span>Total:</span>
                        <span>{formatPrice(cartSubtotal())}</span>
                    </div>

                    <div style={{ marginTop: '12px' }}>
                        <button
                            type="button"
                            onClick={finishOrder}
                            disabled={cart.length === 0 || loading}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: cart.length === 0 ? '#9ca3af' : '#15803d',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                fontSize: '15px',
                            }}
                        >
                            {loading ? 'Finalizando...' : 'Finalizar Pedido'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ========== LISTA DE PEDIDOS ========== */}
            <div style={{ marginTop: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h2 style={{ margin: 0 }}>Pedidos</h2>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {FILTERS.map((f) => (
                            <button
                                key={f.key}
                                type="button"
                                disabled={orderFilter === f.key}
                                onClick={() => setOrderFilter(f.key)}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #ddd',
                                    background: orderFilter === f.key ? '#1d4ed8' : '#fff',
                                    color: orderFilter === f.key ? '#fff' : '#333',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <p>Carregando pedidos...</p>
                ) : orders.length === 0 ? (
                    <p>Nenhum pedido encontrado.</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={{ padding: '8px', textAlign: 'left' }}>#</th>
                                <th style={{ padding: '8px', textAlign: 'left' }}>Atendente</th>
                                <th style={{ padding: '8px', textAlign: 'left' }}>Itens</th>
                                <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                                <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
                                <th style={{ padding: '8px', textAlign: 'left' }}>Criado em</th>
                                <th style={{ padding: '8px', textAlign: 'left' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((o) => (
                                <tr key={o.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '8px', fontWeight: 600 }}>#{o.id}</td>
                                    <td style={{ padding: '8px' }}>{o.user?.name || '—'}</td>
                                    <td style={{ padding: '8px', fontSize: '13px' }}>
                                        {o.items.map((i) => `${i.quantity}× ${i.product.name}`).join(', ')}
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{formatPrice(o.total)}</td>
                                    <td style={{ padding: '8px' }}>
                                        <select
                                            value={o.status}
                                            onChange={(e) => changeOrderStatus(o, e.target.value)}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                border: '1px solid #ddd',
                                                fontSize: '12px',
                                                background:
                                                    o.status === 'delivered'
                                                        ? '#dcfce7'
                                                        : o.status === 'cancelled'
                                                        ? '#fee2e2'
                                                        : o.status === 'ready'
                                                        ? '#fef3c7'
                                                        : o.status === 'preparing'
                                                        ? '#bfdbfe'
                                                        : '#fff',
                                            }}
                                        >
                                            <option value="pending">Pendente</option>
                                            <option value="preparing">Preparando</option>
                                            <option value="ready">Pronto</option>
                                            <option value="delivered">Entregue</option>
                                            <option value="cancelled">Cancelado</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '8px' }}>{formatDate(o.created_at)}</td>
                                    <td style={{ padding: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => deleteOrder(o)}
                                            style={{ color: '#b91c1c', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px' }}
                                        >
                                            Excluir
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
