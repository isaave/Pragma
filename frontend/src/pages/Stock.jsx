import React, { useState, useEffect, useCallback } from 'react';
import api from '../Services/api';

const FILTERS = [
    { key: 'all', label: 'Todos' },
    { key: 'low', label: 'Estoque baixo' },
    { key: 'expiring', label: 'Próximo da validade' },
    { key: 'out', label: 'Em falta' },
];

// Data de hoje no formato YYYY-MM-DD (fuso local), usado pelos <input type="date">
const todayStr = () => new Date().toLocaleDateString('en-CA');

const EMPTY_FORM = {
    name: '',
    unit: 'unidades',
    quantity: '0',
    capacity: '',
    expiry_date: '',
    last_purchase_date: '',
    notes: '',
};

const emptyRestock = () => ({
    quantity: '',
    expiry_date: '',
    last_purchase_date: todayStr(),
    notes: '',
});

// "2026-01-15" -> "15/01/2026"
const formatDate = (value) => {
    if (!value) return '-';
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
};

// Junta as mensagens de validação (422) ou usa a mensagem geral da API
const getErrorMessage = (err, fallback) => {
    const data = err.response && err.response.data;
    if (data && data.errors) return Object.values(data.errors).flat().join(' ');
    if (data && data.message) return data.message;
    return fallback;
};

export default function Stock() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    // form: null (fechado) ou { id: número|null, values: {...} }  -> cadastro/edição
    const [form, setForm] = useState(null);
    // restock: null (fechado) ou { item, values: {...} }  -> adicionar estoque
    const [restock, setRestock] = useState(null);

    const loadItems = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = {};
            if (filter !== 'all') params.filter = filter;
            if (search.trim()) params.search = search.trim();
            const res = await api.get('/ingredients', { params });
            setItems(res.data);
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao carregar o estoque.'));
        } finally {
            setLoading(false);
        }
    }, [filter, search]);

    // Recarrega ao trocar de filtro ou ao digitar na busca (com pequena espera)
    useEffect(() => {
        const timer = setTimeout(loadItems, 300);
        return () => clearTimeout(timer);
    }, [loadItems]);

    // ---------- Cadastro / edição ----------

    const openCreate = () => {
        setError('');
        setInfo('');
        setRestock(null);
        setForm({ id: null, values: { ...EMPTY_FORM } });
    };

    const openEdit = (item) => {
        setError('');
        setInfo('');
        setRestock(null);
        setForm({
            id: item.id,
            values: {
                name: item.name,
                unit: item.unit,
                quantity: String(item.quantity),
                capacity: String(item.capacity),
                expiry_date: item.expiry_date || '',
                last_purchase_date: item.last_purchase_date || '',
                notes: item.notes || '',
            },
        });
    };

    const changeForm = (field, value) => {
        setForm((prev) => ({ ...prev, values: { ...prev.values, [field]: value } }));
    };

    const saveForm = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        try {
            const res = form.id
                ? await api.put(`/ingredients/${form.id}`, form.values)
                : await api.post('/ingredients', form.values);
            setInfo(res.data.message);
            setForm(null);
            loadItems();
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao salvar o ingrediente.'));
        }
    };

    // ---------- Exclusão ----------

    const deleteItem = async (item) => {
        if (!window.confirm(`Excluir "${item.name}" do estoque?`)) return;
        setError('');
        setInfo('');
        try {
            const res = await api.delete(`/ingredients/${item.id}`);
            setInfo(res.data.message);
            loadItems();
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao excluir o ingrediente.'));
        }
    };

    // ---------- Adicionar estoque ----------

    const openRestock = (item) => {
        setError('');
        setInfo('');
        setForm(null);
        setRestock({ item, values: emptyRestock() });
    };

    const changeRestock = (field, value) => {
        setRestock((prev) => ({ ...prev, values: { ...prev.values, [field]: value } }));
    };

    const saveRestock = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        try {
            const res = await api.post(`/ingredients/${restock.item.id}/restock`, restock.values);
            setInfo(res.data.message);
            setRestock(null);
            loadItems();
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao adicionar estoque.'));
        }
    };

    // ---------- Tela ----------

    return (
        <div>
            <h1>Estoque</h1>
            <p>Controle de itens, alertas e níveis de estoque</p>

            {error && <p>{error}</p>}
            {info && <p>{info}</p>}

            {/* Filtros, busca e botão de novo ingrediente */}
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
                    placeholder="Buscar ingrediente"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button type="button" onClick={openCreate}>Novo ingrediente</button>
            </div>

            {/* Formulário de cadastro / edição */}
            {form && (
                <form onSubmit={saveForm}>
                    <h2>{form.id ? 'Editar ingrediente' : 'Novo ingrediente'}</h2>
                    <div>
                        <label>Nome </label>
                        <input type="text" required value={form.values.name} onChange={(e) => changeForm('name', e.target.value)} />
                    </div>
                    <div>
                        <label>Unidade </label>
                        <input type="text" required list="stock-units" value={form.values.unit} onChange={(e) => changeForm('unit', e.target.value)} />
                        <datalist id="stock-units">
                            <option value="unidades" />
                            <option value="hambúrgueres" />
                            <option value="kg" />
                            <option value="g" />
                            <option value="L" />
                            <option value="ml" />
                        </datalist>
                    </div>
                    <div>
                        <label>Quantidade atual </label>
                        <input type="number" required min="0" step="0.01" value={form.values.quantity} onChange={(e) => changeForm('quantity', e.target.value)} />
                    </div>
                    <div>
                        <label>Capacidade máxima </label>
                        <input type="number" required min="0.01" step="0.01" value={form.values.capacity} onChange={(e) => changeForm('capacity', e.target.value)} />
                    </div>
                    <div>
                        <label>Validade do lote </label>
                        <input type="date" value={form.values.expiry_date} onChange={(e) => changeForm('expiry_date', e.target.value)} />
                    </div>
                    <div>
                        <label>Última compra </label>
                        <input type="date" value={form.values.last_purchase_date} onChange={(e) => changeForm('last_purchase_date', e.target.value)} />
                    </div>
                    <div>
                        <label>Observações </label>
                        <input type="text" value={form.values.notes} onChange={(e) => changeForm('notes', e.target.value)} />
                    </div>
                    <button type="submit">Salvar</button>
                    <button type="button" onClick={() => setForm(null)}>Cancelar</button>
                </form>
            )}

            {/* Formulário de adicionar estoque (modal "Adicionar" do Figma) */}
            {restock && (
                <form onSubmit={saveRestock}>
                    <h2>Adicionar estoque: {restock.item.name}</h2>
                    <div>
                        <label>Quantidade a adicionar ({restock.item.unit}) </label>
                        <input type="number" required min="0.01" step="0.01" value={restock.values.quantity} onChange={(e) => changeRestock('quantity', e.target.value)} />
                    </div>
                    <div>
                        <label>Validade do lote </label>
                        <input type="date" value={restock.values.expiry_date} onChange={(e) => changeRestock('expiry_date', e.target.value)} />
                    </div>
                    <div>
                        <label>Última compra </label>
                        <input type="date" value={restock.values.last_purchase_date} onChange={(e) => changeRestock('last_purchase_date', e.target.value)} />
                    </div>
                    <div>
                        <label>Observações </label>
                        <input type="text" value={restock.values.notes} onChange={(e) => changeRestock('notes', e.target.value)} />
                    </div>
                    <button type="submit">Adicionar</button>
                    <button type="button" onClick={() => setRestock(null)}>Cancelar</button>
                </form>
            )}

            {/* Listagem */}
            {loading && <p>Carregando...</p>}
            {!loading && items.length === 0 && <p>Nenhum ingrediente encontrado.</p>}

            {items.length > 0 && (
                <table border="1" cellPadding="4">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Quantidade</th>
                            <th>Nível</th>
                            <th>Status</th>
                            <th>Última compra</th>
                            <th>Validade</th>
                            <th>Observações</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.id}>
                                <td>{item.name}</td>
                                <td>{item.quantity} {item.unit}</td>
                                <td>{item.percentage}% de {item.capacity}</td>
                                <td>{item.stock_status}</td>
                                <td>{formatDate(item.last_purchase_date)}</td>
                                <td>
                                    {formatDate(item.expiry_date)}
                                    {item.near_expiry && ' (atenção: validade próxima)'}
                                </td>
                                <td>{item.notes || '-'}</td>
                                <td>
                                    <button type="button" onClick={() => openRestock(item)}>Adicionar estoque</button>
                                    <button type="button" onClick={() => openEdit(item)}>Editar</button>
                                    <button type="button" onClick={() => deleteItem(item)}>Excluir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
