import React, { useState, useEffect, useCallback } from 'react';
import api from '../Services/api';

const CATEGORIES = [
    { key: 'hamburguer', label: 'Hambúrguer' },
    { key: 'combo', label: 'Combo' },
    { key: 'acompanhamento', label: 'Acompanhamento' },
    { key: 'bebida', label: 'Bebida' },
    { key: 'sobremesa', label: 'Sobremesa' },
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
    is_active: 'true', // vem de um <select>, por isso texto; vira boolean ao salvar
    notes: '',
};

const categoryLabel = (key) => {
    const found = CATEGORIES.find((c) => c.key === key);
    return found ? found.label : key;
};

const formatPrice = (value) =>
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Junta as mensagens de validação (422) ou usa a mensagem geral da API
const getErrorMessage = (err, fallback) => {
    const data = err.response && err.response.data;
    if (data && data.errors) return Object.values(data.errors).flat().join(' ');
    if (data && data.message) return data.message;
    return fallback;
};

export default function Products() {
    const [products, setProducts] = useState([]);
    const [stockItems, setStockItems] = useState([]); // ingredientes do estoque (para montar a receita)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    // form: null (fechado) ou { id: número|null, values: {...}, recipe: [{ingredient_id, name, unit, quantity}] }
    const [form, setForm] = useState(null);
    // ingrediente escolhido para adicionar à receita
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

    // Recarrega ao trocar de categoria ou ao digitar na busca (com pequena espera)
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

    // ---------- Cadastro / edição ----------

    const openCreate = () => {
        setError('');
        setInfo('');
        setPick({ ingredientId: '', quantity: '' });
        loadStockItems();
        setForm({ id: null, values: { ...EMPTY_FORM }, recipe: [] });
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
                description: product.description || '',
                price: String(product.price),
                is_active: product.is_active ? 'true' : 'false',
                notes: product.notes || '',
            },
            recipe: product.recipe.map((r) => ({ ...r })),
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
            // Se o ingrediente já está na receita, só atualiza a quantidade
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

    // ---------- Salvar ----------

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

    // ---------- Exclusão ----------

    const deleteProduct = async (product) => {
        if (!window.confirm(`Excluir "${product.name}" do cardápio?`)) return;
        setError('');
        setInfo('');
        try {
            const res = await api.delete(`/products/${product.id}`);
            setInfo(res.data.message);
            loadProducts();
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao excluir o produto.'));
        }
    };

    // ---------- Tela ----------

    return (
        <div>
            <h1>Produtos</h1>
            <p>Gerencie produtos, preços e disponibilidade</p>

            {error && <p>{error}</p>}
            {info && <p>{info}</p>}

            {/* Categorias, busca e botão de novo produto */}
            <div>
                {FILTERS.map((f) => (
                    <button key={f.key} type="button" disabled={filter === f.key} onClick={() => setFilter(f.key)}>
                        {f.label}
                    </button>
                ))}
            </div>
            <div>
                <input
                    type="text"
                    placeholder="Buscar produto"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button type="button" onClick={openCreate}>Novo produto</button>
            </div>

            {/* Formulário de cadastro / edição */}
            {form && (
                <form onSubmit={saveForm}>
                    <h2>{form.id ? 'Editar produto' : 'Novo produto'}</h2>
                    <div>
                        <label>Nome </label>
                        <input type="text" required value={form.values.name} onChange={(e) => changeForm('name', e.target.value)} />
                    </div>
                    <div>
                        <label>Categoria </label>
                        <select value={form.values.category} onChange={(e) => changeForm('category', e.target.value)}>
                            {CATEGORIES.map((c) => (
                                <option key={c.key} value={c.key}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label>Descrição </label>
                        <input type="text" value={form.values.description} onChange={(e) => changeForm('description', e.target.value)} />
                    </div>
                    <div>
                        <label>Valor (R$) </label>
                        <input type="number" required min="0" step="0.01" value={form.values.price} onChange={(e) => changeForm('price', e.target.value)} />
                    </div>
                    <div>
                        <label>Status </label>
                        <select value={form.values.is_active} onChange={(e) => changeForm('is_active', e.target.value)}>
                            <option value="true">Ativo</option>
                            <option value="false">Inativo</option>
                        </select>
                    </div>
                    <div>
                        <label>Observações </label>
                        <input type="text" value={form.values.notes} onChange={(e) => changeForm('notes', e.target.value)} />
                    </div>

                    {/* Receita: ingredientes do estoque usados no produto */}
                    <h3>Ingredientes</h3>
                    <div>
                        <select value={pick.ingredientId} onChange={(e) => setPick((p) => ({ ...p, ingredientId: e.target.value }))}>
                            <option value="">Selecione um ingrediente</option>
                            {stockItems.map((s) => (
                                <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="Qtd"
                            value={pick.quantity}
                            onChange={(e) => setPick((p) => ({ ...p, quantity: e.target.value }))}
                        />
                        <button type="button" onClick={addToRecipe}>Adicionar ingrediente</button>
                    </div>
                    {form.recipe.length === 0 && <p>Nenhum ingrediente na receita.</p>}
                    <ul>
                        {form.recipe.map((r) => (
                            <li key={r.ingredient_id}>
                                {r.quantity} {r.unit} - {r.name}{' '}
                                <button type="button" onClick={() => removeFromRecipe(r.ingredient_id)}>Remover</button>
                            </li>
                        ))}
                    </ul>

                    <button type="submit">Salvar</button>
                    <button type="button" onClick={() => setForm(null)}>Cancelar</button>
                </form>
            )}

            {/* Listagem */}
            {loading && <p>Carregando...</p>}
            {!loading && products.length === 0 && <p>Nenhum produto encontrado.</p>}

            {products.length > 0 && (
                <table border="1" cellPadding="4">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Categoria</th>
                            <th>Descrição</th>
                            <th>Valor</th>
                            <th>Ingredientes</th>
                            <th>Disponibilidade</th>
                            <th>Status</th>
                            <th>Observações</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((p) => (
                            <tr key={p.id}>
                                <td>{p.name}</td>
                                <td>{categoryLabel(p.category)}</td>
                                <td>{p.description || '-'}</td>
                                <td>{formatPrice(p.price)}</td>
                                <td>
                                    {p.recipe.length === 0
                                        ? '-'
                                        : p.recipe.map((r) => `${r.quantity} ${r.name}`).join(', ')}
                                </td>
                                <td>{p.available ? 'Disponível' : 'Indisponível'}</td>
                                <td>{p.is_active ? 'Ativo' : 'Inativo'}</td>
                                <td>{p.notes || '-'}</td>
                                <td>
                                    <button type="button" onClick={() => openEdit(p)}>Editar</button>
                                    <button type="button" onClick={() => deleteProduct(p)}>Excluir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
