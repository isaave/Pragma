import React, { useState, useEffect, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { productsApi, stockApi } from '../Services/api';
import { exportProductCsv, exportProductPdf, exportProductTxt } from '../lib/exportProduct';
import PageHeader from '../components/ui/PageHeader';
import SegmentedControl from '../components/ui/SegmentedControl';
import TableToolbar from '../components/ui/TableToolbar';
import ProductCard from '../components/ProductCard';
import ProductDetail from '../components/ProductDetail';
import Modal from '../components/ui/Modal';
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal';
import StatusBadge from '../components/ui/StatusBadge';
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

const QUANTITY_UNITS = [
    { value: 'unidade', label: 'Unidade' },
    { value: 'grama', label: 'Grama' },
    { value: 'kilos', label: 'Kilos' },
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
    description: '',
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
    const [mostrarBusca, setMostrarBusca] = useState(false);
    const [mostrarOrdenacao, setMostrarOrdenacao] = useState(false);
    const [ordenacao, setOrdenacao] = useState('padrao');

    const [form, setForm] = useState(null); // null ou { id, values, recipe }
    const [pick, setPick] = useState({ ingredientId: '', quantity: '', unit: 'unidade' });
    const [pendingDelete, setPendingDelete] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [detailId, setDetailId] = useState(null);
    useAutoDismiss(info, setInfo, 4000);
    let storedUser = null;
    try { storedUser = JSON.parse(localStorage.getItem('pragma_user') || 'null'); } catch { /* ignora */ }
    const accessLevel = String(storedUser?.access_level || '').toLowerCase();

    const loadProducts = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = {};
            if (filter !== 'all') params.category = filter;
            if (search.trim()) params.search = search.trim();
            const res = await productsApi.list(params);
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
            const res = await stockApi.list();
            setStockItems(res.data);
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao carregar os ingredientes do estoque.'));
        }
    };

    // ---------- Cadastro / edição de produto ----------

    const openCreate = () => {
        setError('');
        setInfo('');
        setPendingDelete(null);
        setDetailId(null);
        setPick({ ingredientId: '', quantity: '', unit: 'unidade' });
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
        setPendingDelete(null);
        setDetailId(null);
        setPick({ ingredientId: '', quantity: '', unit: 'unidade' });
        loadStockItems();
        setForm({
            id: product.id,
            values: {
                name: product.name,
                category: product.category,
                description: product.description || '',
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
                recipe: [...others, { ingredient_id: item.id, name: item.name, unit: pick.unit || item.unit, quantity }],
            };
        });
        setPick({ ingredientId: '', quantity: '', unit: 'unidade' });
    };

    const removeFromRecipe = (ingredientId) => {
        setForm((prev) => ({ ...prev, recipe: prev.recipe.filter((r) => r.ingredient_id !== ingredientId) }));
    };

    // ---------- Salvar produto ----------

    const saveForm = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setError('');
        setInfo('');
        setSubmitting(true);
        const payload = {
            ...form.values,
            is_active: form.values.status === 'ativo',
            ingredients: form.recipe.map((r) => ({
                id: r.ingredient_id,
                quantity: r.quantity,
                unit: r.unit || 'unidade',
            })),
        };
        try {
            const res = form.id
                ? await productsApi.update(form.id, payload)
                : await productsApi.create(payload);
            setInfo(res.data.message);
            setForm(null);
            loadProducts();
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao salvar o produto.'));
        } finally {
            setSubmitting(false);
        }
    };

    // ---------- Excluir produto ----------

    const requestDeleteProduct = (product) => {
        setError('');
        setInfo('');
        setForm(null);
        setDetailId(null);
        setPendingDelete(product);
    };

    const confirmDeleteProduct = async () => {
        if (!pendingDelete || deleting) return;
        setError('');
        setInfo('');
        setDeleting(true);
        try {
            const res = await productsApi.remove(pendingDelete.id);
            setInfo(res.data.message);
            setPendingDelete(null);
            loadProducts();
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao excluir o produto.'));
        } finally {
            setDeleting(false);
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

    // Ordenação visual: trabalha numa cópia, sem alterar o products da API
    const visibleProducts = [...products];
    if (ordenacao === 'nome') {
        visibleProducts.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    } else if (ordenacao === 'menor') {
        visibleProducts.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (ordenacao === 'maior') {
        visibleProducts.sort((a, b) => Number(b.price) - Number(a.price));
    }

    const closeDrawer = () => {
        setForm(null);
        setDetailId(null);
        setPendingDelete(null);
    };

    const produtoAtual = form ? products.find((p) => p.id === form.id) : null;
    const formBadge = !form?.id
        ? { label: 'Novo', tone: 'neutral' }
        : form.values.status === 'desenvolvimento'
          ? { label: 'Em desenvolvimento', tone: 'neutral' }
          : form.values.status === 'inativo'
            ? { label: 'Inativo', tone: 'warning' }
            : produtoAtual?.available
              ? { label: 'Disponível', tone: 'success' }
              : { label: 'Indisponível', tone: 'warning' };
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
                {accessLevel === 'completo' ? (
                    <TableToolbar
                        onAdd={openCreate}
                        onSearch={() => setMostrarBusca(v => !v)}
                        onFilter={() => setMostrarOrdenacao(v => !v)}
                        ariaLabel="Ações dos produtos"
                    />
                ) : (
                    <TableToolbar
                        onSearch={() => setMostrarBusca(v => !v)}
                        onFilter={() => setMostrarOrdenacao(v => !v)}
                        ariaLabel="Ações dos produtos"
                    />
                )}
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

            {/* Formulário de cadastro / edição em popup */}
            {form && (
                <Modal
                    open
                    onClose={closeDrawer}
                    title={form.id ? 'Editar produto' : 'Produto novo'}
                    subtitle="Preencha os dados e revise a receita antes de salvar."
                    ariaLabel={form.id ? 'Editar produto' : 'Novo produto'}
                    maxWidth={520}
                    closePlacement="top"
                    centerTitle
                    showDivider={false}
                    className="products-form-modal"
                    headerActions={<StatusBadge label={formBadge.label} tone={formBadge.tone} />}
                >
                    {form && (
                        <form id="product-form" className="products-form" onSubmit={saveForm}>
                            <div className="products-form-field">
                                <label className="products-field-label" htmlFor="product-name">Nome</label>
                                <input
                                    id="product-name"
                                    type="text"
                                    required
                                    className="products-field"
                                    placeholder="Nome do produto"
                                    value={form.values.name}
                                    onChange={(e) => changeForm('name', e.target.value)}
                                />
                            </div>
                            <div className="products-form-field">
                                <label className="products-field-label" htmlFor="product-description">Descrição</label>
                                <input
                                    id="product-description"
                                    type="text"
                                    className="products-field"
                                    placeholder="Ex.: 1 patty, salada e maionese"
                                    value={form.values.description || ''}
                                    onChange={(e) => changeForm('description', e.target.value)}
                                />
                            </div>
                            <div className="products-form-field">
                                <label className="products-field-label" htmlFor="product-category">Categoria</label>
                                <select
                                    id="product-category"
                                    className="products-field"
                                    value={form.values.category}
                                    onChange={(e) => changeForm('category', e.target.value)}
                                >
                                    {CATEGORIES.map((c) => (
                                        <option key={c.key} value={c.key}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="products-form-field">
                                <label className="products-field-label" htmlFor="product-status">Status</label>
                                <select
                                    id="product-status"
                                    className="products-field"
                                    value={form.values.status || 'ativo'}
                                    onChange={(e) => changeForm('status', e.target.value)}
                                >
                                    <option value="ativo">Ativo</option>
                                    <option value="inativo">Inativo</option>
                                    <option value="desenvolvimento">Em desenvolvimento</option>
                                </select>
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

                            <div className="products-form-field">
                                <span className="products-field-label">Quantidade em estoque</span>
                                <input
                                    className="products-field"
                                    type="text"
                                    readOnly
                                    value={
                                        !form.id
                                            ? 'Definida pela receita'
                                            : produtoAtual?.available
                                              ? 'Disponível'
                                              : 'Indisponível'
                                    }
                                    aria-label="Quantidade em estoque"
                                />
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
                                            onChange={(e) => {
                                                const ingredientId = e.target.value;
                                                const ingredient = stockItems.find((s) => String(s.id) === String(ingredientId));
                                                const suggestedUnit = QUANTITY_UNITS.some((u) => u.value === ingredient?.unit)
                                                    ? ingredient.unit
                                                    : 'unidade';
                                                setPick((p) => ({ ...p, ingredientId, unit: suggestedUnit }));
                                            }}
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
                                    <div className="products-recipe-field products-recipe-field--unit">
                                        <label className="products-field-label" htmlFor="product-unit">Unidade</label>
                                        <select
                                            id="product-unit"
                                            className="products-field"
                                            value={pick.unit}
                                            onChange={(e) => setPick((p) => ({ ...p, unit: e.target.value }))}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addToRecipe();
                                                }
                                            }}
                                        >
                                            {QUANTITY_UNITS.map((u) => (
                                                <option key={u.value} value={u.value}>{u.label}</option>
                                            ))}
                                        </select>
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

                            <div className="products-form-field products-form-field--full">
                                <label className="products-field-label" htmlFor="product-notes">Observações</label>
                                <input
                                    id="product-notes"
                                    type="text"
                                    className="products-field"
                                    value={form.values.notes}
                                    onChange={(e) => changeForm('notes', e.target.value)}
                                />
                            </div>

                            {error && <p className="products-modal-error" role="alert">{error}</p>}

                            {form.id && produtoAtual && (
                                <>
                                    <div className="products-form-divider" />
                                    <div className="products-form-actions products-form-actions--export">
                                        <button type="button" onClick={() => handleExport(produtoAtual, 'pdf')}>PDF</button>
                                        <button type="button" onClick={() => handleExport(produtoAtual, 'csv')}>CSV</button>
                                        <button type="button" onClick={() => handleExport(produtoAtual, 'txt')}>TXT</button>
                                    </div>
                                </>
                            )}

                            <div className="products-form-actions products-form-actions--modal">
                                <span className="products-form-secondary-actions">
                                    {form.id && produtoAtual && (
                                        <button
                                            type="button"
                                            className="products-form-danger"
                                            onClick={() => requestDeleteProduct(produtoAtual)}
                                        >
                                            Excluir
                                        </button>
                                    )}
                                </span>
                                <button type="submit" className="products-submit" disabled={submitting}>
                                    {submitting ? 'Salvando...' : form.id ? 'Salvar' : 'Adicionar'}
                                </button>
                            </div>
                        </form>
                    )}
                </Modal>
            )}

            {/* Listagem */}
            {loading && <p className="products-empty">Carregando...</p>}
            {!loading && products.length === 0 && <p className="products-empty">Nenhum produto encontrado.</p>}

            <div className="products-grid">
                {visibleProducts.map((p) => (
                    <ProductCard
                        key={p.id}
                        product={p}
                        onOpen={(p) => {
                            // Clicar no card abre o popup de detalhes; o lápis abre o popup de edição.
                            setForm(null);
                            setPendingDelete(null);
                            setDetailId(p.id);
                        }}
                        onEdit={accessLevel === 'completo' ? openEdit : undefined}
                        categoryLabel={categoryLabel}
                        selected={p.id === detailId}
                    />
                ))}
            </div>

            {selectedProduct && !form && !pendingDelete && (
                <Modal
                    open
                    onClose={closeDrawer}
                    title={selectedProduct.name}
                    subtitle="Detalhes do produto e da receita"
                    ariaLabel={`Detalhes de ${selectedProduct.name}`}
                    maxWidth={520}
                    closePlacement="top"
                    centerTitle
                    showDivider={false}
                    className="products-detail-modal"
                >
                    <ProductDetail
                        product={selectedProduct}
                        variant="modal"
                        expanded={false}
                        onToggleExpand={() => {}}
                        onClose={closeDrawer}
                        onEdit={() => openEdit(selectedProduct)}
                        onDelete={() => requestDeleteProduct(selectedProduct)}
                        formatPrice={formatPrice}
                        categoryLabel={categoryLabel}
                        canEdit={false}
                        canDelete={false}
                    />
                    <div className="products-form-actions products-form-actions--modal">
                        <span className="products-form-secondary-actions">
                            {accessLevel === 'completo' && (
                                <button
                                    type="button"
                                    className="products-form-danger"
                                    onClick={() => requestDeleteProduct(selectedProduct)}
                                >
                                    Excluir
                                </button>
                            )}
                        </span>
                        <button
                            type="button"
                            className="products-submit"
                            onClick={() => openEdit(selectedProduct)}
                            disabled={accessLevel !== 'completo'}
                        >
                            Editar produto
                        </button>
                    </div>
                </Modal>
            )}

            <DeleteConfirmModal
                open={Boolean(pendingDelete)}
                onClose={closeDrawer}
                name={pendingDelete?.name}
                subject="produto"
                note="do cardápio"
                onConfirm={confirmDeleteProduct}
                confirming={deleting}
                error={error}
                className="products-delete-modal"
            />
        </div>
    );
}
