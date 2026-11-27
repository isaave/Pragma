import React, { useState, useEffect, useCallback } from 'react';
import { stockApi } from '../Services/api';
import { exportStockCsv, exportStockPdf, exportStockTxt } from '../lib/exportStock';
import SegmentedControl from '../components/ui/SegmentedControl';
import TableToolbar from '../components/ui/TableToolbar';
import SideDrawer from '../components/ui/SideDrawer';
import PageHeader from '../components/ui/PageHeader';
import StockCard from '../components/StockCard';
import { useResourceFocus } from '../hooks/useResourceFocus';
import '../styles/stock.css';

const FILTERS = [
    { key: 'all', label: 'Todos' },
    { key: 'low', label: 'Estoque baixo' },
    { key: 'expiring', label: 'Próximo da validade' },
    { key: 'out', label: 'Em falta' },
];

const UNIT_OPTIONS = ['unidade', 'grama', 'kilos', 'toneladas'];

// Data de hoje no formato YYYY-MM-DD (fuso local), usado pelos <input type="date">
const todayStr = () => new Date().toLocaleDateString('en-CA');

const EMPTY_FORM = {
    name: '',
    unit: 'unidade',
    quantity: '0',
    capacity: '',
    unit_cost: '0',
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
    const [highlightedId, setHighlightedId] = useState(null);
    const [mostrarBusca, setMostrarBusca] = useState(false);
    const [mostrarOrdenacao, setMostrarOrdenacao] = useState(false);
    const [ordenacao, setOrdenacao] = useState('padrao');

    // form: null (fechado) ou { id: número|null, values: {...} }  -> cadastro/edição
    const [form, setForm] = useState(null);
    // restock: null (fechado) ou { item, values: {...} }  -> adicionar estoque
    const [restock, setRestock] = useState(null);
    // Confirmação de exclusão dentro do mesmo painel lateral
    const [pendingDelete, setPendingDelete] = useState(null);

    const loadItems = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = {};
            if (filter !== 'all') params.filter = filter;
            if (search.trim()) params.search = search.trim();
            const res = await stockApi.list(params);
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

    // Notificação de estoque: limpa filtros e destaca o ingrediente de origem.
    useResourceFocus(({ resourceType, resourceId, highlight }) => {
        if (resourceType !== 'ingredient' || !resourceId || highlight === false) return;
        setFilter('all');
        setSearch('');
        setHighlightedId(Number(resourceId));
        window.setTimeout(() => {
            const element = document.getElementById(`ingredient-${resourceId}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element?.focus({ preventScroll: true });
        }, 350);
        window.setTimeout(() => setHighlightedId(null), 3200);
    });

    let storedUser = null;
    try { storedUser = JSON.parse(localStorage.getItem('pragma_user') || 'null'); } catch { /* ignora */ }
    const accessLevel = String(storedUser?.access_level || '').toLowerCase();

    // ---------- Cadastro / edição ----------

    const openCreate = () => {
        setError('');
        setInfo('');
        setRestock(null);
        setPendingDelete(null);
        setForm({ id: null, values: { ...EMPTY_FORM } });
    };

    const openEdit = (item) => {
        setError('');
        setInfo('');
        setRestock(null);
        setPendingDelete(null);
        setForm({
            id: item.id,
            values: {
                name: item.name,
                unit: item.unit,
                quantity: String(item.quantity),
                capacity: String(item.capacity),
                unit_cost: String(item.unit_cost ?? 0),
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
                ? await stockApi.update(form.id, form.values)
                : await stockApi.create(form.values);
            setInfo(res.data.message);
            setForm(null);
            loadItems();
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao salvar o ingrediente.'));
        }
    };

    // ---------- Exclusão ----------

    const requestDeleteItem = (item) => {
        setError('');
        setInfo('');
        setForm(null);
        setRestock(null);
        setPendingDelete(item);
    };

    const confirmDeleteItem = async () => {
        if (!pendingDelete) return;
        setError('');
        setInfo('');
        try {
            const res = await stockApi.remove(pendingDelete.id);
            setInfo(res.data.message);
            setPendingDelete(null);
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
        setPendingDelete(null);
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
            const res = await stockApi.restock(restock.item.id, restock.values);
            setInfo(res.data.message);
            setRestock(null);
            loadItems();
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao adicionar estoque.'));
        }
    };

    // ---------- Exportação ----------

    const handleExport = (item, format) => {
        if (format === 'csv') {
            exportStockCsv(item);
            return;
        }

        if (format === 'txt') {
            exportStockTxt(item);
            return;
        }

        if (!exportStockPdf(item)) {
            setError('Não foi possível abrir a janela de exportação. Permita pop-ups para exportar em PDF.');
        }
    };

    // ---------- Tela ----------

    // Ordenação visual: trabalha numa cópia, sem alterar o items da API
    const visibleItems = [...items];
    if (ordenacao === 'nome') {
        visibleItems.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
    } else if (ordenacao === 'nivel') {
        visibleItems.sort((a, b) => Number(a.percentage) - Number(b.percentage));
    } else if (ordenacao === 'validade') {
        visibleItems.sort((a, b) => {
            if (a.expiry_date && b.expiry_date) return a.expiry_date.localeCompare(b.expiry_date);
            if (a.expiry_date) return -1;
            if (b.expiry_date) return 1;
            return 0;
        });
    }

    const closeDrawer = () => {
        setForm(null);
        setRestock(null);
        setPendingDelete(null);
    };

    const itemAtual = form ? items.find((i) => i.id === form.id) : null;

    const statusTone = (status) => {
        if (status === 'Estoque mediano') return 'neutral';
        if (status === 'Em falta') return 'danger';
        if (status === 'Estoque baixo') return 'warning';
        if (status === 'Estoque alto') return 'success';
        return 'neutral';
    };

    return (
        <div className="stock-page">
            <PageHeader title="Estoque" subtitle="Controle de itens, alertas e níveis de estoque" />

            {error && <p className="stock-message stock-message--error" role="alert">{error}</p>}
            {info && <p className="stock-message stock-message--info" role="status">{info}</p>}

            {/* Filtros, busca e botão de novo ingrediente */}
            <div className="stock-controls">
                <SegmentedControl
                    options={FILTERS.map(f => ({ value: f.key, label: f.label }))}
                    value={filter}
                    onChange={setFilter}
                />
                {accessLevel === 'completo' ? (
                    <TableToolbar
                        onAdd={openCreate}
                        onFilter={() => setMostrarOrdenacao(v => !v)}
                        onSearch={() => setMostrarBusca(v => !v)}
                        ariaLabel="Ações do estoque"
                    />
                ) : (
                    <TableToolbar
                        onFilter={() => setMostrarOrdenacao(v => !v)}
                        onSearch={() => setMostrarBusca(v => !v)}
                        ariaLabel="Ações do estoque"
                    />
                )}
            </div>

            {mostrarOrdenacao && (
                <div className="stock-ordenacao">
                    <label className="stock-ordenacao-label" htmlFor="stock-ordenacao">Ordenar por</label>
                    <select
                        id="stock-ordenacao"
                        className="stock-ordenacao-select"
                        aria-label="Ordenar por"
                        value={ordenacao}
                        onChange={(e) => {
                            setOrdenacao(e.target.value);
                            setMostrarOrdenacao(false);
                        }}
                    >
                        <option value="padrao">Padrão</option>
                        <option value="nome">Nome (A-Z)</option>
                        <option value="nivel">Menor nível</option>
                        <option value="validade">Validade mais próxima</option>
                    </select>
                </div>
            )}

            {(mostrarBusca || search) && (
                <div className="stock-search">
                    <input
                        type="text"
                        placeholder="Buscar ingrediente"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            )}

            {/* Formulário de cadastro / edição no painel lateral */}
            {form && (
                <SideDrawer
                    open
                    onClose={closeDrawer}
                    title={form.id ? 'Editar ingrediente' : 'Novo ingrediente'}
                    eyebrow="Estoque"
                    subtitle="Informe os dados do ingrediente e seus níveis."
                    ariaLabel={form.id ? 'Editar ingrediente' : 'Novo ingrediente'}
                    footer={
                        <>
                            {form.id && itemAtual && (
                                <button
                                    type="button"
                                    className="side-drawer-button side-drawer-button--danger"
                                    onClick={() => requestDeleteItem(itemAtual)}
                                >
                                    Excluir
                                </button>
                            )}
                            <span className="side-drawer-footer-spacer" />
                            <button type="button" className="side-drawer-button" onClick={closeDrawer}>
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="stock-drawer-form"
                                className="side-drawer-button side-drawer-button--primary"
                            >
                                Salvar
                            </button>
                        </>
                    }
                >
                    <form id="stock-drawer-form" className="stock-form" onSubmit={saveForm}>
                        <div className="stock-field">
                            <label>Nome</label>
                            <input type="text" required value={form.values.name} onChange={(e) => changeForm('name', e.target.value)} />
                        </div>
                        <div className="stock-field">
                            <label htmlFor="stock-unit">Unidade de medida</label>
                            <select
                                id="stock-unit"
                                required
                                value={form.values.unit}
                                onChange={(e) => changeForm('unit', e.target.value)}
                            >
                                {UNIT_OPTIONS.map((unit) => (
                                    <option key={unit} value={unit}>
                                        {unit.charAt(0).toUpperCase() + unit.slice(1)}
                                    </option>
                                ))}
                                {form.values.unit && !UNIT_OPTIONS.includes(form.values.unit) && (
                                    <option value={form.values.unit}>{form.values.unit}</option>
                                )}
                            </select>
                        </div>
                        <div className="stock-field">
                            <label htmlFor="stock-quantity">Quantidade atual ({form.values.unit || 'unidade'})</label>
                            <input
                                id="stock-quantity"
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={form.values.quantity}
                                onChange={(e) => changeForm('quantity', e.target.value)}
                            />
                        </div>
                        <div className="stock-field">
                            <label>Validade do lote</label>
                            <input type="date" value={form.values.expiry_date} onChange={(e) => changeForm('expiry_date', e.target.value)} />
                        </div>
                        <div className="stock-field">
                            <label>Capacidade máxima</label>
                            <input type="number" required min="0.01" step="0.01" value={form.values.capacity} onChange={(e) => changeForm('capacity', e.target.value)} />
                        </div>
                        <div className="stock-field">
                            <label>Última compra</label>
                            <input type="date" value={form.values.last_purchase_date} onChange={(e) => changeForm('last_purchase_date', e.target.value)} />
                        </div>
                        <div className="stock-field stock-field--full">
                            <label>Observações</label>
                            <input type="text" value={form.values.notes} onChange={(e) => changeForm('notes', e.target.value)} />
                        </div>
                        {form.id && itemAtual && (
                            <>
                                <div className="stock-form-divider" />
                                <div className="stock-form-actions">
                                    <button type="button" onClick={() => handleExport(itemAtual, 'pdf')}>PDF</button>
                                    <button type="button" onClick={() => handleExport(itemAtual, 'csv')}>CSV</button>
                                    <button type="button" onClick={() => handleExport(itemAtual, 'txt')}>TXT</button>
                                </div>
                            </>
                        )}
                    </form>
                </SideDrawer>
            )}

            {/* Formulário de adicionar estoque no painel lateral */}
            {restock && (
                <SideDrawer
                    open
                    onClose={closeDrawer}
                    title={restock.item.name}
                    eyebrow="Estoque"
                    subtitle="Adicione quantidade ao lote deste ingrediente."
                    ariaLabel={`Adicionar estoque de ${restock.item.name}`}
                    footer={
                        <>
                            <button type="button" className="side-drawer-button" onClick={closeDrawer}>
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="restock-drawer-form"
                                className="side-drawer-button side-drawer-button--primary"
                            >
                                Adicionar
                            </button>
                        </>
                    }
                >
                    <form id="restock-drawer-form" className="stock-form" onSubmit={saveRestock}>
                        <div className="stock-field stock-field--quantity">
                            <label>Quantidade ({restock.item.unit})</label>
                            <input type="number" required min="0.01" step="0.01" value={restock.values.quantity} onChange={(e) => changeRestock('quantity', e.target.value)} />
                        </div>
                        <div className="stock-field">
                            <label>Validade do lote</label>
                            <input type="date" value={restock.values.expiry_date} onChange={(e) => changeRestock('expiry_date', e.target.value)} />
                        </div>
                        <div className="stock-field">
                            <label>Última compra</label>
                            <input type="date" value={restock.values.last_purchase_date} onChange={(e) => changeRestock('last_purchase_date', e.target.value)} />
                        </div>
                        <div className="stock-field stock-field--full">
                            <label>Observações</label>
                            <input type="text" value={restock.values.notes} onChange={(e) => changeRestock('notes', e.target.value)} />
                        </div>
                        <div className="stock-form-divider" />
                        <div className="stock-form-actions">
                            <button type="button" onClick={() => handleExport(restock.item, 'pdf')}>PDF</button>
                            <button type="button" onClick={() => handleExport(restock.item, 'csv')}>CSV</button>
                            <button type="button" onClick={() => handleExport(restock.item, 'txt')}>TXT</button>
                        </div>
                    </form>
                </SideDrawer>
            )}

            {/* Confirmação de exclusão no próprio painel */}
            {pendingDelete && (
                <SideDrawer
                    open
                    onClose={closeDrawer}
                    title={`Excluir ${pendingDelete.name}`}
                    eyebrow="Estoque"
                    ariaLabel={`Excluir ${pendingDelete.name}`}
                    footer={
                        <>
                            <button type="button" className="side-drawer-button" onClick={closeDrawer}>
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="side-drawer-button side-drawer-button--danger"
                                onClick={confirmDeleteItem}
                            >
                                Excluir ingrediente
                            </button>
                        </>
                    }
                >
                    <p className="side-drawer-help">
                        O ingrediente será removido do estoque. Esta ação não pode ser desfeita.
                    </p>
                </SideDrawer>
            )}

            {/* Listagem */}
            {loading && <p className="stock-empty">Carregando...</p>}
            {!loading && items.length === 0 && <p className="stock-empty">Nenhum ingrediente encontrado.</p>}

            {items.length > 0 && (
                <div className="stock-grid">
                    {visibleItems.map((item) => (
                        <StockCard
                            key={item.id}
                            item={item}
                            onOpen={openRestock}
                            onEdit={accessLevel === 'completo' ? openEdit : undefined}
                            formatDate={formatDate}
                            statusTone={statusTone}
                            highlighted={highlightedId === item.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
