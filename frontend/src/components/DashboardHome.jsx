import React, { useState, useEffect, useMemo } from 'react';
import { Bot, Check, Pencil, Send, Sparkles, Utensils, X } from 'lucide-react';
import api from '../Services/api';
import { formatPrice } from '../lib/orderStatus';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import '../styles/dashboard.css';

const hours = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

const CATEGORY_LABELS = {
    hamburguer: 'Hambúrgueres',
    combo: 'Combos',
    acompanhamento: 'Acompanhamentos',
    bebida: 'Bebidas',
    sobremesa: 'Sobremesas',
    adicional: 'Adicionais',
};

const suggestions = [
    'Qual o faturamento de hoje?',
    'Como faço para criar um pedido?',
    'Quais ingredientes estão com estoque baixo?',
    'Como cadastro um produto?',
    'Quanto gastamos em saídas este mês?',
];

/* ------------------------------------------------------------------ */
/*  Gráfico de linhas — Fluxo de Caixa Operacional                    */
/* ------------------------------------------------------------------ */

const LineChart = ({ hours, sales, costs, profit }) => {
    const width = 640;
    const height = 220;
    const pad = { top: 20, right: 20, bottom: 30, left: 40 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const maxVal = Math.max(1, ...sales, ...costs) * 1.2;

    const x = (i) => pad.left + (i / Math.max(1, hours.length - 1)) * innerW;
    const y = (v) => pad.top + innerH - (v / maxVal) * innerH;

    const pathFor = (arr) =>
        arr.length ? arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ') : '';

    const lineFor = (arr) =>
        arr.length ? arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ') : '';

    const areaFor = (arr) =>
        arr.length
            ? `${pathFor(arr)} L${x(arr.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`
            : '';

    return (
        <svg className="dash-line-chart" viewBox={`0 0 ${width} ${height}`} width="100%" height={220} role="img" aria-label="Fluxo de caixa operacional">
            {[0.25, 0.5, 0.75, 1].map((f) => (
                <line
                    key={f}
                    className="dash-grid-line"
                    x1={pad.left}
                    x2={width - pad.right}
                    y1={y(maxVal * f)}
                    y2={y(maxVal * f)}
                />
            ))}
            <path d={areaFor(sales)} className="dash-line-area" />
            <path d={pathFor(sales)} className="dash-line--sales" />
            <path d={pathFor(costs)} className="dash-line--costs" />
            {profit && <path d={lineFor(profit)} className="dash-line--profit" />}
            {sales.map((v, i) => (
                <circle key={`s${i}`} className="dash-line-point--sales" cx={x(i)} cy={y(v)} r="3" />
            ))}
            {costs.map((v, i) => (
                <circle key={`c${i}`} className="dash-line-point--costs" cx={x(i)} cy={y(v)} r="3" />
            ))}
            {hours.map((h, i) => {
                const step = Math.max(1, Math.ceil(hours.length / 8));
                return (i % step === 0 || i === hours.length - 1) ? (
                    <text key={h} className="dash-axis-label" x={x(i)} y={height - 8} textAnchor="middle">
                        {h}
                    </text>
                ) : null;
            })}
        </svg>
    );
};

/* ------------------------------------------------------------------ */
/*  Gráfico de rosca — Faturamento por Categoria                      */
/* ------------------------------------------------------------------ */

const DonutChart = ({ data }) => {
    const first = data[0] || { label: '—', percent: 0, value: 1, color: '#94a3b8' };
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
    const segments = data.map((item, index) => ({
        ...item,
        frac: item.value / total,
        dash: (item.value / total) * circumference,
        offset: data.slice(0, index).reduce((sum, prev) => sum + prev.value, 0) / total * circumference,
    }));

    return (
        <svg className="dash-donut" viewBox="0 0 180 180" width="180" height="180" role="img" aria-label="Faturamento por categoria">
            <circle className="dash-donut-track" cx="90" cy="90" r={radius} />
            {segments.map((seg, index) => (
                <circle
                    key={seg.label}
                    className={`dash-donut-seg--${index}`}
                    cx="90"
                    cy="90"
                    r={radius}
                    strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
                    strokeDashoffset={-seg.offset}
                    transform="rotate(-90 90 90)"
                />
            ))}
            <text className="dash-donut-percent" x="90" y="86" textAnchor="middle">
                {Math.round(first.percent)}%
            </text>
            <text className="dash-donut-label" x="90" y="106" textAnchor="middle">
                {first.label}
            </text>
        </svg>
    );
};

/* ------------------------------------------------------------------ */
/*  Componentes modulares                                              */
/* ------------------------------------------------------------------ */

const Card = ({ title, subtitle, aside, children }) => (
    <section className="dash-card">
        {title || subtitle || aside ? (
            <div className="dash-card__header">
                <div className="dash-card__heading">
                    {title ? <h3 className="dash-card__title">{title}</h3> : null}
                    {subtitle ? <p className="dash-card__subtitle">{subtitle}</p> : null}
                </div>
                {aside ? <div className="dash-card__aside">{aside}</div> : null}
            </div>
        ) : null}
        {children}
    </section>
);

const KpiCard = ({ label, value, change, hint, onEdit }) => {
    const pct = Number(change || 0);
    const isDown = pct < 0;
    const isNeutral = pct === 0;
    const changeClass = isNeutral
        ? 'dash-kpi__change--neutral'
        : isDown
            ? 'dash-kpi__change--down'
            : 'dash-kpi__change--up';
    const formatted = `${Math.abs(pct).toFixed(1).replace('.', ',')}%`;
    const changeText = isNeutral ? formatted : `${isDown ? '-' : '+'}${formatted}`;

    return (
        <div className="dash-kpi">
            <span className="dash-kpi__label">{label}</span>
            <div className="dash-kpi__value-row">
                <span className="dash-kpi__value">{value}</span>
                {onEdit ? (
                    <button
                        type="button"
                        className="dash-kpi__edit"
                        aria-label="Editar saídas"
                        title="Editar saídas"
                        onClick={onEdit}
                    >
                        <Pencil size={12} aria-hidden="true" />
                    </button>
                ) : null}
            </div>
            <span className="dash-kpi__meta">
                <span className={`dash-kpi__change ${changeClass}`}>{changeText}</span>
                <span className="dash-kpi__hint">{hint}</span>
            </span>
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Tela principal                                                    */
/* ------------------------------------------------------------------ */

export default function DashboardHome() {
    const [dashboard, setDashboard] = useState(null);
    const [error, setError] = useState('');
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [thinking, setThinking] = useState(false);
    const [expenseOpen, setExpenseOpen] = useState(false);
    const [expenseDraft, setExpenseDraft] = useState({ description: '', value: '' });
    const [expenseItems, setExpenseItems] = useState([]);
    const [expenseError, setExpenseError] = useState('');

    const loadDashboard = async () => {
        try {
            const res = await api.get('/reports/dashboard');
            setDashboard(res.data || null);
            setError('');
        } catch {
            setError('Não foi possível carregar os dados do dashboard.');
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const ask = async (q) => {
        const text = (q ?? question).trim();
        if (!text) return;
        setThinking(true);
        setAnswer('');
        try {
            const res = await api.post('/ai/ask', { question: text });
            setAnswer(res.data.answer || 'Sem resposta.');
        } catch {
            setAnswer('Não foi possível obter a resposta da IA.');
        } finally {
            setThinking(false);
        }
    };

    const addExpenseItem = () => {
        const description = expenseDraft.description.trim();
        const value = Number(expenseDraft.value);
        if (!description || !(value > 0)) {
            setExpenseError('Informe a descrição e um valor maior que zero.');
            return;
        }
        setExpenseItems((items) => [...items, { id: Date.now(), description, value }]);
        setExpenseDraft({ description: '', value: '' });
        setExpenseError('');
    };

    const removeExpenseItem = (id) => {
        setExpenseItems((items) => items.filter((item) => item.id !== id));
    };

    const removeSavedExpense = async (id) => {
        try {
            await api.delete(`/expenses/${id}`);
            await loadDashboard();
        } catch (err) {
            setExpenseError(err.response?.data?.message || 'Não foi possível remover a saída.');
        }
    };

    const closeExpense = () => {
        setExpenseOpen(false);
        setExpenseDraft({ description: '', value: '' });
        setExpenseItems([]);
        setExpenseError('');
    };

    const submitExpenses = async () => {
        if (!expenseItems.length) {
            closeExpense();
            return;
        }
        try {
            await Promise.all(expenseItems.map((item) => api.post('/expenses', {
                description: item.description,
                value: item.value,
            })));
            closeExpense();
            await loadDashboard();
        } catch (err) {
            setExpenseError(err.response?.data?.message || 'Não foi possível registar as saídas.');
        }
    };

    const { kpis, topProducts, categoryData, lowStock, activities, cashFlow } = useMemo(() => {
        const data = dashboard || {};

        const kpis = (data.kpis || []).map((kpi) => ({
            ...kpi,
            value: kpi.id === 'orders' ? String(kpi.value) : formatPrice(kpi.value),
        }));

        const timeAgo = (value) => {
            if (!value) return 'agora mesmo';
            const diff = Date.now() - new Date(value).getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return 'agora mesmo';
            if (mins < 60) return `${mins}m atrás`;
            const hoursAgo = Math.floor(mins / 60);
            if (hoursAgo < 24) return `${hoursAgo}h atrás`;
            return `${Math.floor(hoursAgo / 24)}d atrás`;
        };

        const topProducts = (data.top_products || []).slice(0, 3);

        const categoryRows = data.categories || [];
        const categoryTotal = categoryRows.reduce((sum, c) => sum + Number(c.value || 0), 0) || 1;
        const categoryData = categoryRows.slice(0, 3).map((c, i) => ({
            label: CATEGORY_LABELS[c.category] || 'Outros',
            value: Number(c.value || 0),
            percent: (Number(c.value || 0) / categoryTotal) * 100,
            color: ['#1d4ed8', '#3b82f6', '#60a5fa'][i % 3],
        }));

        const lowStock = data.low_stock || [];
        const activities = (data.activities || []).map((a, index) => ({
            id: a.at || index,
            time: timeAgo(a.at),
            text: a.text,
        }));

        const realFlow = data.cash_flow || {};
        const hours = realFlow.hours || [];
        const cashFlow = {
            hours,
            sales: realFlow.sales || hours.map(() => 0),
            costs: realFlow.costs || hours.map(() => 0),
            profit: realFlow.profit || hours.map(() => 0),
        };

        return { kpis, topProducts, categoryData, lowStock, activities, cashFlow };
    }, [dashboard]);

    if (error) {
        return (
            <div className="dash-error">
                <p className="dash-error__text">{error}</p>
            </div>
        );
    }

    return (
        <div className="dash-page">
            <PageHeader title="Painel do Chefe" subtitle="Monitore faturamento, insumos e desempenho de vendas em tempo real" />

            <div className="dash-kpi-grid">
                {kpis.map((kpi) => (
                    <KpiCard
                        key={kpi.id}
                        {...kpi}
                        onEdit={kpi.id === 'out' ? () => setExpenseOpen(true) : undefined}
                    />
                ))}
            </div>

            <div className="dash-row dash-row--charts">
                <Card
                    title="Fluxo de Caixa Operacional"
                    subtitle="Comparativo em tempo real entre receitas e custos de produção"
                    aside={
                        <div className="dash-legend">
                            <span className="dash-legend__item">
                                <span className="dash-legend__dot dash-legend__dot--sales" />Vendas
                            </span>
                            <span className="dash-legend__item">
                                <span className="dash-legend__dot dash-legend__dot--costs" />Custos
                            </span>
                        </div>
                    }
                >
                    <LineChart hours={cashFlow.hours} sales={cashFlow.sales} costs={cashFlow.costs} profit={cashFlow.profit} />
                </Card>

                <Card title="Faturamento por Categoria" subtitle="Percentual das vendas por grupo de produto">
                    <div className="dash-category">
                        <div className="dash-category__chart">
                            <DonutChart data={categoryData} />
                        </div>
                        <div className="dash-category__legend">
                            {categoryData.map((item, index) => (
                                <div className="dash-category__row" key={`${item.label}-${index}`}>
                                    <span className={`dash-dot dash-dot--${index}`} />
                                    <span className="dash-category__name">{item.label}</span>
                                    <span className="dash-category__value">{formatPrice(item.value)}</span>
                                    <span className="dash-category__percent">{Math.round(item.percent)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            <div className="dash-row dash-row--lists">
                <Card title="Produtos Mais Vendidos" subtitle="Os itens favoritos dos clientes">
                    <div className="dash-list">
                        {topProducts.map((p, index) => (
                            <div className="dash-list__row dash-top-product" key={p.name}>
                                <span className="dash-top-product__rank">{index + 1}</span>
                                <span className="dash-top-product__thumb"><Utensils size={16} /></span>
                                <span className="dash-top-product__info">
                                    <span className="dash-top-product__name">{p.name}</span>
                                    <span className="dash-top-product__meta">{p.units} vendidos</span>
                                </span>
                                <span className="dash-top-product__value">{formatPrice(p.value)}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Alerta de Insumos" subtitle="Itens com estoque abaixo do ponto crítico">
                    <div className="dash-list">
                        {lowStock.map((item) => (
                            <div className="dash-list__row dash-alert" key={item.name}>
                                <span className="dash-alert__info">
                                    <span className="dash-alert__name">{item.name}</span>
                                    <span className="dash-alert__meta">Atual: {item.current} / Mínimo: {item.min}</span>
                                </span>
                                <span className={`dash-badge ${item.badge === 'Crítico' ? 'dash-badge--critical' : 'dash-badge--warning'}`}>
                                    {item.badge}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Atividades Recentes" subtitle="Últimos eventos do sistema da hamburgueria">
                    <div className="dash-list">
                        {activities.map((a, index) => (
                            <div className="dash-list__row dash-activity" key={`${a.id}-${index}`}>
                                <span className="dash-activity__time">{a.time}</span>
                                <span className="dash-activity__text">{a.text}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* ===== ASSISTENTE DE IA ===== */}
            <section className="dash-assistant">
                <header className="dash-assistant__header">
                    <div className="dash-assistant__avatar"><Sparkles size={18} aria-hidden="true" /></div>
                    <div className="dash-assistant__intro">
                        <h3 className="dash-assistant__title">Assistente de IA</h3>
                        <p className="dash-assistant__help">
                            Pergunte sobre vendas, estoque, saídas ou como usar qualquer tela — ele também pode agir no sistema.
                        </p>
                    </div>
                    <span className={`dash-assistant__presence ${thinking ? 'dash-assistant__presence--busy' : ''}`}>
                        <span className="dash-assistant__presence-dot" />
                        {thinking ? 'A pensar' : 'Online'}
                    </span>
                </header>

                <div className="dash-assistant__suggestions">
                    {suggestions.map((s) => (
                        <button className="dash-assistant__suggestion" key={s} type="button" onClick={() => ask(s)}>
                            <Sparkles size={11} aria-hidden="true" />
                            {s}
                        </button>
                    ))}
                </div>

                {(answer || thinking) && (
                    <div className="dash-assistant__thread">
                        {answer && (
                            <div className="dash-assistant__message">
                                <div className="dash-assistant__message-avatar"><Bot size={14} aria-hidden="true" /></div>
                                <div className="dash-assistant__bubble">{answer}</div>
                            </div>
                        )}
                        {thinking && (
                            <p className="dash-assistant__status">
                                <span className="dash-assistant__typing"><i /><i /><i /></span>
                                A consultar os dados e a IA...
                            </p>
                        )}
                    </div>
                )}

                <form
                    className="dash-assistant__form"
                    onSubmit={(e) => { e.preventDefault(); ask(); }}
                >
                    <textarea
                        className="dash-assistant__textarea"
                        placeholder="Ex.: Qual foi a receita total de hoje? Quais produtos mais vendem?"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
                        aria-label="Pergunta para o assistente de IA"
                    />
                    <button className="dash-assistant__submit" type="submit" disabled={thinking || !question.trim()}>
                        <Send size={16} /> {thinking ? 'A pensar...' : 'Enviar'}
                    </button>
                </form>
            </section>

            <Modal
                className="dash-expense-modal"
                open={expenseOpen}
                onClose={closeExpense}
                maxWidth="520px"
                showDivider={false}
                title="Saída"
                titleSize="28px"
            >
                <div className="dash-expense">
                    <div className="dash-expense__row">
                        <div className="dash-expense__field dash-expense__field--description">
                            <label className="dash-expense__label" htmlFor="dash-expense-description">Descrição</label>
                            <input
                                id="dash-expense-description"
                                className="dash-expense__input dash-expense__input--description"
                                type="text"
                                placeholder="Ex.: mercado"
                                value={expenseDraft.description}
                                onChange={(e) => setExpenseDraft((draft) => ({ ...draft, description: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExpenseItem(); } }}
                            />
                        </div>
                        <div className="dash-expense__field dash-expense__field--value">
                            <label className="dash-expense__label" htmlFor="dash-expense-value">Valor</label>
                            <input
                                id="dash-expense-value"
                                className="dash-expense__input dash-expense__input--value"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={expenseDraft.value}
                                onChange={(e) => setExpenseDraft((draft) => ({ ...draft, value: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExpenseItem(); } }}
                            />
                        </div>
                        <button
                            type="button"
                            className="dash-expense__add-item"
                            aria-label="Adicionar item"
                            title="Adicionar item"
                            onClick={addExpenseItem}
                        >
                            <Check size={14} aria-hidden="true" />
                        </button>
                    </div>

                    {expenseError && <p className="dash-expense__error" role="alert">{expenseError}</p>}

                    <div className="dash-expense__items">
                        {expenseItems.length === 0 ? (
                            <p className="dash-expense__empty">Nenhuma saída adicionada.</p>
                        ) : (
                            <ul className="dash-expense__chips">
                                {expenseItems.map((item) => (
                                    <li className="dash-expense__chip" key={item.id}>
                                        <span className="dash-expense__chip-text">{`${item.description} · ${formatPrice(item.value)}`}</span>
                                        <button
                                            type="button"
                                            className="dash-expense__chip-remove"
                                            aria-label={`Remover ${item.description}`}
                                            title={`Remover ${item.description}`}
                                            onClick={() => removeExpenseItem(item.id)}
                                        >
                                            <X size={12} aria-hidden="true" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {(dashboard?.expenses || []).length > 0 && (
                        <div className="dash-expense__items">
                            <p className="dash-expense__label">Saídas registadas</p>
                            <ul className="dash-expense__chips">
                                {dashboard.expenses.map((expense) => (
                                    <li className="dash-expense__chip" key={expense.id}>
                                        <span className="dash-expense__chip-text">
                                            {`${expense.description} · ${formatPrice(expense.value)} · ${expense.expense_date}`}
                                        </span>
                                        <button
                                            type="button"
                                            className="dash-expense__chip-remove"
                                            aria-label={`Remover saída ${expense.description}`}
                                            title={`Remover saída ${expense.description}`}
                                            onClick={() => removeSavedExpense(expense.id)}
                                        >
                                            <X size={12} aria-hidden="true" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="dash-expense__footer">
                        <button
                            type="button"
                            className="dash-expense__submit"
                            disabled={expenseItems.length === 0}
                            onClick={submitExpenses}
                        >
                            Adicionar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
