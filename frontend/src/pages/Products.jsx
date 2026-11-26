import React, { useState, useEffect, useCallback } from 'react';
import { Check, Minimize2, Trash2, X } from 'lucide-react';
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
import TableToolbar from '../components/ui/TableToolbar';
import ProductCard from '../components/ProductCard';
import ProductDetail from '../components/ProductDetail';
import Modal from '../components/ui/Modal';
import useIsMobile from '../hooks/useIsMobile';
import useAutoDismiss from '../hooks/useAutoDismiss';
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

    const [detailId, setDetailId] = useState(null);
    const [detailExpanded, setDetailExpanded] = useState(false);
    useAutoDismiss(info, setInfo, 4000);
    const isMobile = useIsMobile();

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
    const selectedProduct = products.find((p) => p.id === detailId) || null;

    return (
        <div className="products-page">
            <PageHeader title="Produtos" subtitle="Gerencie produtos, preços e disponibilidade" />

            {error && <p className="products-message products-message--error">{error}</p>}
            {info && <p className="products-message products-message--info" role="status" aria-live="polite">{info}</p>}

            {/* Filtros e busca */}
            <div className="products-controls">
                <SegmentedControl
                    options={FILTERS.map(f => ({ value: f.key, label: f.label }))}
                    value={filter}
                    onChange={setFilter}
                    style={{
                        flex: '0 1 auto',
                        minWidth: 0,
                        width: 'max-content',
                    }}
                />
                <TableToolbar
                    onAdd={openCreate}
                    onSearch={() => setMostrarBusca(v => !v)}
                    onFilter={() => setMostrarOrdenacao(v => !v)}
                    exportOptions={[
                        { label: 'PDF', onClick: () => exportAll('pdf'), disabled: exporting },
                        { label: 'CSV', onClick: () => exportAll('csv'), disabled: exporting },
                        { label: 'TXT', onClick: () => exportAll('txt'), disabled: exporting },
                    ]}
                    ariaLabel="Ações dos produtos"
                />
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
                <Modal
                    open
                    onClose={() => setForm(null)}
                    maxWidth="560px"
                    showDivider={false}
                    ariaLabel="Produto"
                    titleNode={
                        <input
                            type="text"
                            required
                            form="product-form"
                            className="products-modal-title"
                            placeholder="Nome do produto"
                            aria-label="Nome do produto"
                            value={form.values.name}
                            onChange={(e) => changeForm('name', e.target.value)}
                        />
                    }
                    headerActions={
                        form.id && produtoAtual ? (
                            <button
                                type="button"
                                className="products-modal-delete"
                                aria-label="Excluir produto"
                                title="Excluir produto"
                                onClick={() => deleteProduct(produtoAtual)}
                            >
                                <Trash2 size={16} aria-hidden="true" />
                            </button>
                        ) : null
                    }
                >
                    {form && (
                        <form id="product-form" className="products-form" onSubmit={saveForm}>
                            <div className="products-modal-pills">
                                <select
                                    className="products-pill-select"
                                    aria-label="Status"
                                    value={form.values.status || 'ativo'}
                                    onChange={(e) => changeForm('status', e.target.value)}
                                >
                                    <option value="ativo">Ativo</option>
                                    <option value="inativo">Inativo</option>
                                    <option value="desenvolvimento">Em desenvolvimento</option>
                                </select>
                                <select
                                    className="products-pill-select"
                                    aria-label="Categoria"
                                    value={form.values.category}
                                    onChange={(e) => changeForm('category', e.target.value)}
                                >
                                    {CATEGORIES.map((c) => (
                                        <option key={c.key} value={c.key}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="products-recipe">
                                <span className="sr-only">Receita — Ingredientes do estoque</span>
                                <div className="products-recipe-row">
                                    <div className="products-recipe-field products-recipe-field--ingredient">
                                        <label className="products-field-label" htmlFor="product-ingredient">Ingrediente</label>
                                        <select
                                            id="product-ingredient"
                                            className="products-field"
                                            value={pick.ingredientId}
                                            onChange={(e) => setPick((p) => ({ ...p, ingredientId: e.target.value }))}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addToRecipe();
                                                }
                                            }}
                                        >
                                            <option value="">Selecione um ingrediente</option>
                                            {stockItems.map((s) => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="products-recipe-field products-recipe-field--qty">
                                        <label className="products-field-label" htmlFor="product-quantity">Qtd</label>
                                        <input
                                            id="product-quantity"
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            placeholder="Qtd do ingrediente (ex: 200g)"
                                            className="products-field"
                                            value={pick.quantity}
                                            onChange={(e) => setPick((p) => ({ ...p, quantity: e.target.value }))}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addToRecipe();
                                                }
                                            }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="products-round-button products-check-button"
                                        aria-label="Adicionar ingrediente"
                                        title="Adicionar ingrediente"
                                        onClick={addToRecipe}
                                    >
                                        <Check size={14} aria-hidden="true" />
                                    </button>
                                </div>
                                {form.recipe.length === 0 && (
                                    <p className="products-recipe-empty">Nenhum ingrediente na receita.</p>
                                )}
                                <ul className="products-recipe-chips">
                                    {form.recipe.map((r) => (
                                        <li key={r.ingredient_id} className="products-recipe-chip">
                                            <span>{r.quantity} {r.unit !== 'unidades' ? `${r.unit} ` : ''}{r.name}</span>
                                            <button
                                                type="button"
                                                className="products-chip-remove"
                                                aria-label={`Remover ${r.name}`}
                                                title={`Remover ${r.name}`}
                                                onClick={() => removeFromRecipe(r.ingredient_id)}
                                            >
                                                <X size={12} aria-hidden="true" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="products-form-field">
                                <label className="products-notes-label" htmlFor="product-notes">Observações</label>
                                <input
                                    id="product-notes"
                                    type="text"
                                    className="products-field"
                                    value={form.values.notes}
                                    onChange={(e) => changeForm('notes', e.target.value)}
                                />
                            </div>

                            <div className="products-form-field">
                                <label className="products-field-label" htmlFor="product-price">Valor</label>
                                <div className="products-price-field">
                                    <span className="products-price-prefix">R$</span>
                                    <input
                                        id="product-price"
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        className="products-price-input"
                                        value={form.values.price}
                                        onChange={(e) => changeForm('price', e.target.value)}
                                    />
                                </div>
                            </div>

                            {error && <p className="products-modal-error" role="alert">{error}</p>}

                            <button type="submit" className="products-submit">
                                {form.id ? 'Salvar' : 'Adicionar'}
                            </button>

                            {form.id && produtoAtual && (
                                <div className="products-modal-export">
                                    <div className="products-form-divider" />
                                    <div className="products-modal-export-actions">
                                        <button type="button" onClick={() => handleExport(produtoAtual, 'pdf')}>PDF</button>
                                        <button type="button" onClick={() => handleExport(produtoAtual, 'csv')}>CSV</button>
                                        <button type="button" onClick={() => handleExport(produtoAtual, 'txt')}>TXT</button>
                                    </div>
                                </div>
                            )}
                        </form>
                    )}
                </Modal>
            )}

            {/* Listagem */}
            {loading && <p className="products-empty">Carregando...</p>}
            {!loading && products.length === 0 && <p className="products-empty">Nenhum produto encontrado.</p>}

            <div className="products-layout">
                {products.length > 0 && (
                    <div className="products-grid">
                        {visibleProducts.map((p) => (
                            <ProductCard
                                key={p.id}
                                product={p}
                                onOpen={(p) => {
                                    setDetailId(p.id);
                                    setDetailExpanded(false);
                                }}
                                onEdit={openEdit}
                                categoryLabel={categoryLabel}
                                selected={p.id === detailId}
                            />
                        ))}
                    </div>
                )}

                {selectedProduct && !detailExpanded && !isMobile && (
                    <aside className="products-detail">
                        <ProductDetail
                            product={selectedProduct}
                            variant="panel"
                            expanded={detailExpanded}
                            onToggleExpand={() => setDetailExpanded(v => !v)}
                            onClose={() => setDetailId(null)}
                            onEdit={() => {
                                const p = selectedProduct;
                                setDetailId(null);
                                openEdit(p);
                            }}
                            onDelete={() => deleteProduct(selectedProduct)}
                            formatPrice={formatPrice}
                            categoryLabel={categoryLabel}
                        />
                    </aside>
                )}
            </div>

            {selectedProduct && (detailExpanded || isMobile) && (
                <Modal
                    open
                    onClose={() => setDetailId(null)}
                    maxWidth="520px"
                    showDivider={false}
                    closePlacement="top"
                    title={selectedProduct.name}
                    headerStart={
                        !isMobile ? (
                            <button
                                type="button"
                                className="products-detail__collapse"
                                aria-label="Recolher"
                                title="Recolher"
                                onClick={() => setDetailExpanded(false)}
                            >
                                <Minimize2 size={16} />
                            </button>
                        ) : undefined
                    }
                >
                    <ProductDetail
                        product={selectedProduct}
                        variant="modal"
                        expanded={detailExpanded}
                        onToggleExpand={() => setDetailExpanded(v => !v)}
                        onClose={() => setDetailId(null)}
                        onEdit={() => {
                            const p = selectedProduct;
                            setDetailId(null);
                            openEdit(p);
                        }}
                        onDelete={() => deleteProduct(selectedProduct)}
                        formatPrice={formatPrice}
                        categoryLabel={categoryLabel}
                    />
                </Modal>
            )}
        </div>
    );
}
