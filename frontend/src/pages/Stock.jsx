import React, { useState, useEffect, useCallback } from 'react';
import api from '../Services/api';
import { exportStockCsv, exportStockListCsv, exportStockListPdf, exportStockListTxt, exportStockPdf, exportStockTxt } from '../lib/exportStock';
import SegmentedControl from '../components/ui/SegmentedControl';
import TableToolbar from '../components/ui/TableToolbar';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import StockCard from '../components/StockCard';
import '../styles/stock.css';

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
    const [exporting, setExporting] = useState(false);
    const [mostrarBusca, setMostrarBusca] = useState(false);
    const [mostrarOrdenacao, setMostrarOrdenacao] = useState(false);
    const [ordenacao, setOrdenacao] = useState('padrao');

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
            setForm(null);
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

    // Exporta TODOS os ingredientes (ignora filtros e busca)
    const exportAll = async (format) => {
        setExporting(true);
        setError('');
        setInfo('');
        try {
            const res = await api.get('/ingredients');
            const all = res.data || [];

            if (all.length === 0) {
                setInfo('Nenhum ingrediente cadastrado para exportar.');
                return;
            }

            if (format === 'csv') {
                exportStockListCsv(all);
            } else if (format === 'txt') {
                exportStockListTxt(all);
            } else if (!exportStockListPdf(all)) {
                setError('Não foi possível abrir a janela de exportação. Permita pop-ups para exportar em PDF.');
                return;
            }

            setInfo(`${all.length} ingrediente(s) exportado(s).`);
        } catch (err) {
            setError(getErrorMessage(err, 'Erro ao exportar o estoque.'));
        } finally {
            setExporting(false);
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
                {userRole === 'Chefe' ? (
                    <TableToolbar
                        onAdd={openCreate}
                        onFilter={() => setMostrarOrdenacao(v => !v)}
                        onSearch={() => setMostrarBusca(v => !v)}
                        exportOptions={[
                            { label: 'PDF', onClick: () => exportAll('pdf'), disabled: exporting },
                            { label: 'CSV', onClick: () => exportAll('csv'), disabled: exporting },
                            { label: 'TXT', onClick: () => exportAll('txt'), disabled: exporting },
                        ]}
                        ariaLabel="Ações do estoque"
                    />
                ) : (
                    <TableToolbar
                        onFilter={() => setMostrarOrdenacao(v => !v)}
                        onSearch={() => setMostrarBusca(v => !v)}
                        exportOptions={[
                            { label: 'PDF', onClick: () => exportAll('pdf'), disabled: exporting },
                            { label: 'CSV', onClick: () => exportAll('csv'), disabled: exporting },
                            { label: 'TXT', onClick: () => exportAll('txt'), disabled: exporting },
                        ]}
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

            {/* Formulário de cadastro / edição */}
            <Modal
                open={!!form}
                onClose={() => setForm(null)}
                maxWidth="640px"
                showDivider={false}
                closePlacement="top"
                title={form && form.id ? 'Editar ingrediente' : 'Novo ingrediente'}
                titleExtra={form && form.id && itemAtual ? (
                    <StatusBadge label={itemAtual.stock_status} tone={statusTone(itemAtual.stock_status)} />
                ) : null}
            >
                {form && (
                    <form className="stock-form" onSubmit={saveForm}>
                        <div className="stock-field">
                            <label>Nome</label>
                            <input type="text" required value={form.values.name} onChange={(e) => changeForm('name', e.target.value)} />
                        </div>
                        <div className="stock-field">
                            <label>Unidade</label>
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
                        <div className="stock-field">
                            <label>Quantidade atual</label>
                            <input type="number" required min="0" step="0.01" value={form.values.quantity} onChange={(e) => changeForm('quantity', e.target.value)} />
                        </div>
                        <div className="stock-field">
                            <label>Capacidade máxima</label>
                            <input type="number" required min="0.01" step="0.01" value={form.values.capacity} onChange={(e) => changeForm('capacity', e.target.value)} />
                        </div>
                        <div className="stock-field">
                            <label>Validade do lote</label>
                            <input type="date" value={form.values.expiry_date} onChange={(e) => changeForm('expiry_date', e.target.value)} />
                        </div>
                        <div className="stock-field">
                            <label>Última compra</label>
                            <input type="date" value={form.values.last_purchase_date} onChange={(e) => changeForm('last_purchase_date', e.target.value)} />
                        </div>
                        <div className="stock-field stock-field--full">
                            <label>Observações</label>
                            <input type="text" value={form.values.notes} onChange={(e) => changeForm('notes', e.target.value)} />
                        </div>
                        <div className="stock-field stock-field--full">
                            <button type="submit" className="stock-form-primary">Salvar</button>
                        </div>
                        {form.id && itemAtual && (
                            <>
                                <div className="stock-form-divider" />
                                <div className="stock-form-actions">
                                    <button type="button" className="stock-form-danger" onClick={() => deleteItem(itemAtual)}>Excluir</button>
                                    <button type="button" onClick={() => handleExport(itemAtual, 'pdf')}>PDF</button>
                                    <button type="button" onClick={() => handleExport(itemAtual, 'csv')}>CSV</button>
                                    <button type="button" onClick={() => handleExport(itemAtual, 'txt')}>TXT</button>
                                </div>
                            </>
                        )}
                    </form>
                )}
            </Modal>

            {/* Formulário de adicionar estoque (modal "Adicionar" do Figma) */}
            <Modal
                open={!!restock}
                onClose={() => setRestock(null)}
                maxWidth="520px"
                showDivider={false}
                closePlacement="top"
                title={restock ? restock.item.name : ''}
                titleExtra={restock ? (
                    <StatusBadge label={restock.item.stock_status} tone={statusTone(restock.item.stock_status)} />
                ) : null}
            >
                {restock && (
                    <form className="stock-form" onSubmit={saveRestock}>
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
                        <div className="stock-field stock-field--full">
                            <button type="submit" className="stock-form-primary">Adicionar</button>
                        </div>
                    </form>
                )}
            </Modal>

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
                            onEdit={userRole === 'Chefe' ? openEdit : undefined}
                            formatDate={formatDate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
