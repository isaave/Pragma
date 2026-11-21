import React, { useState, useEffect, useCallback } from 'react';
import api from '../Services/api';
import {
    exportProductCsv,
    exportProductPdf,
    exportProductsCsv,
    exportProductsPdf,
    exportProductsTxt,
    exportProductTxt,
} from '../lib/exportProduct';
import PageHeader from '../components/ui/PageHeader';
import SegmentedControl from '../components/ui/SegmentedControl';
import ActionToolbar from '../components/ui/ActionToolbar';
import ProductCard from '../components/ProductCard';
import '../styles/products.css';

const CATEGORIES = [
    { key: 'hamburguer', label: 'Hambúrguer' },
    { key: 'combo', label: 'Combo' },
    { key: 'acompanhamento', label: 'Acompanhamento' },
    { key: 'bebida', label: 'Bebida' },
    { key: 'sobremesa', label: 'Sobremesa' },
    { key: 'adicional', label: 'Adicional' },
];

const FILTERS = [
    { key: 'all', label: 'Todos' },
    { key: 'hamburguer', label: 'Hambúrgueres' },
    { key: 'combo', label: 'Combos' },
    { key: 'acompanhamento', label: 'Acompanhamentos' },
    { key: 'bebida', label: 'Bebidas' },
    { key: 'sobremesa', label: 'Sobremesas' },
];

const EMPTY_FORM = {
    name: '',
    category: 'hamburguer',
    price: '',
    status: 'ativo',
    notes: '',
};

const categoryLabel = (key) => {
    const found = CATEGORIES.find((c) => c.key === key);
    return found ? found.label : key;
};

const formatPrice = (value) =>
    Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getErrorMessage = (err, fallback) => {
    const data = err.response && err.response.data;
    if (data && data.errors) return Object.values(data.errors).flat().join(' ');
    if (data && data.message) return data.message;
    return fallback;
};

export default function Products() {
    const [products, setProducts] = useState([]);
    const [stockItems, setStockItems] = useState([]); // ingredientes do estoque (receita)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [exporting, setExporting] = useState(false);
    const [mostrarBusca, setMostrarBusca] = useState(false);
    const [mostrarOrdenacao, setMostrarOrdenacao] = useState(false);
    const [ordenacao, setOrdenacao] = useState('padrao');

    const [form, setForm] = useState(null); // null ou { id, values, recipe, addons }
    const [pick, setPick] = useState({ ingredientId: '', quantity: '' });

    const loadProducts = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = {};
            if (filter !== 'all') params.category = filter;
            if (search.trim()) params.search = search.trim();
            const res = await api.get('/products', { params });
            setProducts(res.data);
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao carregar os produtos.'));
        } finally {
            setLoading(false);
        }
    }, [filter, search]);

    useEffect(() => {
        const timer = setTimeout(loadProducts, 300);
        return () => clearTimeout(timer);
    }, [loadProducts]);

    const loadStockItems = async () => {
        try {
            const res = await api.get('/ingredients');
            setStockItems(res.data);
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao carregar os ingredientes do estoque.'));
        }
    };

    // ---------- Cadastro / edição de produto ----------

    const openCreate = () => {
        setError('');
        setInfo('');
        setPick({ ingredientId: '', quantity: '' });
        loadStockItems();
        setForm({
            id: null,
            values: { ...EMPTY_FORM },
            recipe: [],
        });
    };

    const openEdit = (product) => {
        setError('');
        setInfo('');
        setPick({ ingredientId: '', quantity: '' });
        loadStockItems();
        setForm({
            id: product.id,
            values: {
                name: product.name,
                category: product.category,
                price: String(product.price),
                status: product.status || 'ativo',
                notes: product.notes || '',
            },
            recipe: (product.recipe || []).map((r) => ({ ...r })),
        });
    };

    const changeForm = (field, value) => {
        setForm((prev) => ({ ...prev, values: { ...prev.values, [field]: value } }));
    };

    // ---------- Receita (ingredientes do produto) ----------

    const addToRecipe = () => {
        const item = stockItems.find((s) => String(s.id) === String(pick.ingredientId));
        const quantity = Number(pick.quantity);
        if (!item || !(quantity > 0)) {
            setError('Escolha um ingrediente e informe uma quantidade maior que zero.');
            return;
        }
        setError('');
        setForm((prev) => {
            const others = prev.recipe.filter((r) => r.ingredient_id !== item.id);
            return {
                ...prev,
                recipe: [...others, { ingredient_id: item.id, name: item.name, unit: item.unit, quantity }],
            };
        });
        setPick({ ingredientId: '', quantity: '' });
    };

    const removeFromRecipe = (ingredientId) => {
        setForm((prev) => ({ ...prev, recipe: prev.recipe.filter((r) => r.ingredient_id !== ingredientId) }));
    };

    // ---------- Salvar produto ----------

    const saveForm = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        const payload = {
            ...form.values,
            is_active: form.values.is_active === 'true',
            ingredients: form.recipe.map((r) => ({ id: r.ingredient_id, quantity: r.quantity })),
        };
        try {
            const res = form.id
                ? await api.put(`/products/${form.id}`, payload)
                : await api.post('/products', payload);
            setInfo(res.data.message);
            setForm(null);
            loadProducts();
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao salvar o produto.'));
        }
    };

    // ---------- Excluir produto ----------

    const deleteProduct = async (product) => {
        if (!window.confirm(`Excluir "${product.name}" do cardápio?`)) return;
        setError('');
        setInfo('');
        try {
            const res = await api.delete(`/products/${product.id}`);
            setInfo(res.data.message);
            setForm(null);
            loadProducts();
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao excluir o produto.'));
        }
    };

    const handleExport = (product, format) => {
        if (format === 'csv') {
            exportProductCsv(product);
            return;
        }

        if (format === 'txt') {
            exportProductTxt(product);
            return;
        }

        if (!exportProductPdf(product)) {
            setError('Não foi possível abrir a janela de exportação. Permita pop-ups para exportar em PDF.');
        }
    };

    // Exporta TODOS os produtos (ignora filtros e busca)
    const exportAll = async (format) => {
        setExporting(true);
        setError('');
        setInfo('');
        try {
            const res = await api.get('/products');
            const all = res.data || [];

            if (all.length === 0) {
                setInfo('Nenhum produto cadastrado para exportar.');
                return;
            }

            if (format === 'csv') {
                exportProductsCsv(all);
            } else if (format === 'txt') {
                exportProductsTxt(all);
            } else if (!exportProductsPdf(all)) {
                setError('Não foi possível abrir a janela de exportação. Permita pop-ups para exportar em PDF.');
                return;
            }

            setInfo(`${all.length} produto(s) exportado(s).`);
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao exportar os produtos.'));
        } finally {
            setExporting(false);
        }
    };

    // Ordenação visual: trabalha numa cópia, sem alterar o products da API
    const visibleProducts = [...products];
    if (ordenacao === 'nome') {
        visibleProducts.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    } else if (ordenacao === 'menor') {
        visibleProducts.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (ordenacao === 'maior') {
        visibleProducts.sort((a, b) => Number(b.price) - Number(a.price));
    }

    const produtoAtual = form ? products.find((p) => p.id === form.id) : null;

    return (
        <div className="products-page">
            <PageHeader title="Produtos" subtitle="Gerencie produtos, preços e disponibilidade" />

            {error && <p className="products-message products-message--error">{error}</p>}
            {info && <p className="products-message products-message--info">{info}</p>}

            {/* Filtros e busca */}
            <div className="products-controls">
                <SegmentedControl
                    options={FILTERS.map(f => ({ value: f.key, label: f.label }))}
                    value={filter}
                    onChange={setFilter}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, minmax(max-content, 1fr))',
                        width: '100%',
                        minWidth: 0,
                    }}
                />
                <div className="products-controls-actions">
                    <ActionToolbar
                        onAdd={openCreate}
                        onSearch={() => setMostrarBusca(v => !v)}
                        onFilter={() => setMostrarOrdenacao(v => !v)}
                    />
                    <details className="products-export-all">
                        <summary>Exportar tudo</summary>
                        <div className="products-export-menu">
                            <button type="button" onClick={(e) => { e.currentTarget.closest('details').open = false; exportAll('pdf'); }} disabled={exporting}>PDF</button>
                            <button type="button" onClick={(e) => { e.currentTarget.closest('details').open = false; exportAll('csv'); }} disabled={exporting}>CSV</button>
                            <button type="button" onClick={(e) => { e.currentTarget.closest('details').open = false; exportAll('txt'); }} disabled={exporting}>TXT</button>
                        </div>
                    </details>
                </div>
            </div>

            {mostrarOrdenacao && (
                <div className="products-ordenacao">
                    <label className="products-ordenacao-label" htmlFor="products-ordenacao">Ordenar por</label>
                    <select
                        id="products-ordenacao"
                        className="products-ordenacao-select"
                        aria-label="Ordenar por"
                        value={ordenacao}
                        onChange={(e) => {
                            setOrdenacao(e.target.value);
                            setMostrarOrdenacao(false);
                        }}
                    >
                        <option value="padrao">Padrão</option>
                        <option value="nome">Nome (A-Z)</option>
                        <option value="menor">Menor preço</option>
                        <option value="maior">Maior preço</option>
                    </select>
                </div>
            )}

            {(mostrarBusca || search) && (
                <div className="products-search">
                    <input
                        type="text"
                        placeholder="Buscar produto"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            )}

            {/* Formulário de cadastro / edição */}
            {form && (
                <form onSubmit={saveForm} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '700px' }}>
                    <h2>{form.id ? 'Editar produto' : 'Novo produto'}</h2>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Nome</label>
                            <input type="text" required value={form.values.name} onChange={(e) => changeForm('name', e.target.value)} style={{ width: '100%', padding: '8px' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Categoria</label>
                            <select value={form.values.category} onChange={(e) => changeForm('category', e.target.value)} style={{ width: '100%', padding: '8px' }}>
                                {CATEGORIES.map((c) => (
                                    <option key={c.key} value={c.key}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Valor (R$)</label>
                            <input type="number" required min="0" step="0.01" value={form.values.price} onChange={(e) => changeForm('price', e.target.value)} style={{ width: '100%', padding: '8px' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Status</label>
                            <select value={form.values.status || 'ativo'} onChange={(e) => changeForm('status', e.target.value)} style={{ width: '100%', padding: '8px' }}>
                                <option value="ativo">Ativo</option>
                                <option value="inativo">Inativo</option>
                                <option value="desenvolvimento">Em desenvolvimento</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Observações</label>
                        <input type="text" value={form.values.notes} onChange={(e) => changeForm('notes', e.target.value)} style={{ width: '100%', padding: '8px' }} />
                    </div>

                    {/* Receita: ingredientes do estoque usados no produto */}
                    <div style={{ borderTop: '1px solid #ddd', paddingTop: '12px' }}>
                        <h3 style={{ margin: '0 0 8px' }}>Receita — Ingredientes do estoque</h3>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            <select value={pick.ingredientId} onChange={(e) => setPick((p) => ({ ...p, ingredientId: e.target.value }))} style={{ padding: '8px', flex: 1 }}>
                                <option value="">Selecione um ingrediente</option>
                                {stockItems.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder="Qtd do ingrediente (ex: 200g)"
                                value={pick.quantity}
                                onChange={(e) => setPick((p) => ({ ...p, quantity: e.target.value }))}
                                style={{ padding: '8px', width: '140px' }}
                            />
                            <button type="button" onClick={addToRecipe} style={{ padding: '8px 12px' }}>Adicionar ingrediente</button>
                        </div>
                        {form.recipe.length === 0 && <p style={{ fontSize: '13px', color: '#666' }}>Nenhum ingrediente na receita.</p>}
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {form.recipe.map((r) => (
                                <li key={r.ingredient_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', border: '1px solid #eee', borderRadius: '6px', marginBottom: '6px' }}>
                                    <span>{r.quantity} {r.unit} - {r.name}</span>
                                    <button type="button" onClick={() => removeFromRecipe(r.ingredient_id)} style={{ color: '#b91c1c' }}>Remover</button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                        <button type="button" onClick={() => setForm(null)} style={{ padding: '10px 20px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', borderRadius: '6px' }}>Cancelar</button>
                        <button type="submit" style={{ padding: '10px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Salvar</button>
                    </div>

                    {form.id && produtoAtual && (
                        <>
                            <div className="products-form-divider" />
                            <div className="products-form-actions">
                                <button type="button" className="products-form-danger" onClick={() => deleteProduct(produtoAtual)}>Excluir</button>
                                <button type="button" onClick={() => handleExport(produtoAtual, 'pdf')}>PDF</button>
                                <button type="button" onClick={() => handleExport(produtoAtual, 'csv')}>CSV</button>
                                <button type="button" onClick={() => handleExport(produtoAtual, 'txt')}>TXT</button>
                            </div>
                        </>
                    )}
                </form>
            )}

            {/* Listagem */}
            {loading && <p className="products-empty">Carregando...</p>}
            {!loading && products.length === 0 && <p className="products-empty">Nenhum produto encontrado.</p>}

            {products.length > 0 && (
                <div className="products-grid">
                    {visibleProducts.map((p) => (
                        <ProductCard
                            key={p.id}
                            product={p}
                            onOpen={() => {
                                // TODO: abrir o pop-up de detalhe do produto (próxima etapa)
                            }}
                            onEdit={openEdit}
                            categoryLabel={categoryLabel}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
