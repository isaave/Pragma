import React, { useState, useEffect, useMemo } from 'react';
import { Send } from 'lucide-react';
import api from '../Services/api';
import { formatPrice } from '../lib/orderStatus';

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
    'Quais produtos mais vendem?',
    'Qual o lucro operacional da semana?',
];

const dayMs = 86400000;
const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);
const startOfYesterday = new Date(startOfToday.getTime() - dayMs);
const now = Date.now();

/* ------------------------------------------------------------------ */
/*  Gráfico de linhas — Fluxo de Caixa Operacional                    */
/* ------------------------------------------------------------------ */

const LineChart = ({ hours, sales, costs, profit }) => {
    const width = 640;
    const height = 220;
    const pad = { top: 20, right: 20, bottom: 30, left: 40 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const maxVal = Math.max(...sales, ...costs) * 1.2;

    const x = (i) => pad.left + (i / Math.max(1, hours.length - 1)) * innerW;
    const y = (v) => pad.top + innerH - (v / maxVal) * innerH;

    const pathFor = (arr) =>
        arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

    const lineFor = (arr) =>
        arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

    const areaFor = (arr) =>
        `${pathFor(arr)} L${x(arr.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={220} role="img" aria-label="Fluxo de caixa operacional">
            {[0.25, 0.5, 0.75, 1].map((f) => (
                <line
                    key={f}
                    x1={pad.left}
                    x2={width - pad.right}
                    y1={y(maxVal * f)}
                    y2={y(maxVal * f)}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                />
            ))}
            <path d={areaFor(sales)} fill="rgba(29, 78, 216, 0.12)" />
            <path d={pathFor(sales)} fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" />
            <path d={pathFor(costs)} fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
            {profit && <path d={lineFor(profit)} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />}
            {sales.map((v, i) => (
                <circle key={`s${i}`} cx={x(i)} cy={y(v)} r="3" fill="#1d4ed8" />
            ))}
            {costs.map((v, i) => (
                <circle key={`c${i}`} cx={x(i)} cy={y(v)} r="3" fill="#dc2626" />
            ))}
            {hours.map((h, i) => (
                <text key={h} x={x(i)} y={height - 8} fontSize="10" fill="#64748b" textAnchor="middle">
                    {h}
                </text>
            ))}
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
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const segments = data.map((item, index) => ({
        ...item,
        frac: item.value / total,
        dash: (item.value / total) * circumference,
        offset: data.slice(0, index).reduce((sum, prev) => sum + prev.value, 0) / total * circumference,
    }));

    return (
        <svg viewBox="0 0 180 180" width="180" height="180" role="img" aria-label="Faturamento por categoria">
            <circle cx="90" cy="90" r={radius} fill="none" stroke="#eef2f7" strokeWidth="26" />
            {segments.map((seg) => (
                <circle
                    key={seg.label}
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="26"
                    strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
                    strokeDashoffset={-seg.offset}
                    transform="rotate(-90 90 90)"
                />
            ))}
            <text x="90" y="86" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0f172a">
                {Math.round(first.percent)}%
            </text>
            <text x="90" y="106" textAnchor="middle" fontSize="11" fill="#64748b">
                {first.label}
            </text>
        </svg>
    );
};

/* ------------------------------------------------------------------ */
/*  Componentes modulares                                              */
/* ------------------------------------------------------------------ */

const Card = ({ title, children }) => (
    <section>
        {title ? <h3>{title}</h3> : null}
        {children}
    </section>
);

const KpiCard = ({ label, value, change, hint }) => (
    <div>
        <span>{label}</span>
        <span>{value}</span>
        <span>{change} · {hint}</span>
    </div>
);

/* ------------------------------------------------------------------ */
/*  Tela principal                                                    */
/* ------------------------------------------------------------------ */

export default function DashboardHome() {
    const [orders, setOrders] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [error, setError] = useState('');
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [thinking, setThinking] = useState(false);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const [ordersRes, ingredientsRes] = await Promise.all([
                    api.get('/orders'),
                    api.get('/ingredients'),
                ]);
                if (!active) return;
                setOrders(ordersRes.data || []);
                setIngredients(ingredientsRes.data || []);
            } catch {
                if (active) setError('Não foi possível carregar os dados do dashboard.');
            }
        };
        load();
        return () => { active = false; };
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

    const { kpis, topProducts, categoryData, lowStock, activities, cashFlow } = useMemo(() => {
        const timeAgo = (value) => {
            if (!value) return 'agora mesmo';
            const diff = now - new Date(value).getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return 'agora mesmo';
            if (mins < 60) return `${mins}m atrás`;
            const hoursAgo = Math.floor(mins / 60);
            if (hoursAgo < 24) return `${hoursAgo}h atrás`;
            return `${Math.floor(hoursAgo / 24)}d atrás`;
        };

        const sumValidDay = (from, to) =>
            orders
                .filter(
                    (o) => o.status !== 'cancelled' && o.created_at && new Date(o.created_at) >= from && new Date(o.created_at) < to
                )
                .reduce((sum, o) => sum + Number(o.total || 0), 0);

        const sumCancelledDay = (from, to) =>
            orders
                .filter((o) => o.status === 'cancelled' && o.created_at && new Date(o.created_at) >= from && new Date(o.created_at) < to)
                .reduce((sum, o) => sum + Number(o.total || 0), 0);

        const validOrders = orders.filter((o) => o.status !== 'cancelled');
        const revenue = validOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
        const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
        const saida = orders.filter((o) => o.status === 'cancelled').reduce((sum, o) => sum + Number(o.total || 0), 0);
        const profit = revenue - saida;

        const revenueYesterday = sumValidDay(startOfYesterday, startOfToday);
        const cancelledYesterday = sumCancelledDay(startOfYesterday, startOfToday);
        const deliveredYesterday = orders.filter(
            (o) => o.status === 'delivered' && o.created_at && new Date(o.created_at) >= startOfYesterday && new Date(o.created_at) < startOfToday
        ).length;

        const pctChange = (current, previous) =>
            previous > 0 ? `${(((current - previous) / previous) * 100).toFixed(1).replace('.', ',')}%` : '0,0%';

        const revenueChange = pctChange(revenue, revenueYesterday);
        const deliveredChange = pctChange(deliveredCount, deliveredYesterday);
        const saidaChange = pctChange(saida, cancelledYesterday);
        const profitChange = pctChange(profit, revenueYesterday - cancelledYesterday);

        const kpis = [
            { id: 'revenue', label: 'Faturamento Total', value: formatPrice(revenue), change: revenueChange, hint: 'vs. período anterior' },
            { id: 'orders', label: 'Pedidos Concluídos', value: String(deliveredCount), change: deliveredChange, hint: 'vs. período anterior' },
            { id: 'out', label: 'Saída', value: formatPrice(saida), change: saidaChange, hint: 'custos operacionais' },
            { id: 'profit', label: 'Lucro Estimado', value: formatPrice(profit), change: profitChange, hint: 'faturamento - saída' },
        ];

        const productAgg = {};
        orders.forEach((o) => (o.items || []).forEach((it) => {
            const name = it.product?.name || 'Produto';
            const entry = (productAgg[name] = productAgg[name] || { name, units: 0, value: 0 });
            entry.units += Number(it.quantity || 0);
            entry.value += Number(it.subtotal || 0);
        }));
        const topProducts = Object.values(productAgg).sort((a, b) => b.units - a.units).slice(0, 3);

        const categoryAgg = {};
        orders.forEach((o) => (o.items || []).forEach((it) => {
            const category = it.product?.category;
            const label = CATEGORY_LABELS[category] || 'Outros';
            const entry = (categoryAgg[label] = categoryAgg[label] || { label, value: 0 });
            entry.value += Number(it.subtotal || 0);
        }));
        const categorySales = Object.values(categoryAgg)
            .sort((a, b) => b.value - a.value)
            .slice(0, 3)
            .map((c, i) => ({ ...c, percent: 0, color: ['#1d4ed8', '#3b82f6', '#60a5fa'][i % 3] }));
        const categoryTotal = categorySales.reduce((sum, c) => sum + c.value, 0) || 1;
        const categoryData = categorySales.map((c) => ({ ...c, percent: (c.value / categoryTotal) * 100 }));

        const lowStock = ingredients
            .filter((i) => i.stock_status === 'Em falta' || i.stock_status === 'Estoque baixo')
            .map((i) => ({
                name: i.name,
                current: i.quantity,
                min: Number(i.capacity) * 0.25,
                badge: i.stock_status === 'Em falta' ? 'Crítico' : 'Atenção',
            }));

        const activities = orders.slice(0, 5).map((o) => {
            const history = o.statusHistory || [];
            const last = history.length ? history[history.length - 1] : { status: o.status, created_at: o.created_at };
            return {
                id: o.id,
                time: timeAgo(last.created_at),
                text: `Pedido #${String(o.id).padStart(4, '0')} — status ${last.status}`,
            };
        });

        const todaysSales = {};
        orders
            .filter((o) => o.status !== 'cancelled' && o.created_at && new Date(o.created_at) >= startOfToday)
            .forEach((o) => {
                const d = new Date(o.created_at);
                const label = `${String(d.getHours()).padStart(2, '0')}:00`;
                if (!hours.includes(label)) return;
                todaysSales[label] = (todaysSales[label] || 0) + Number(o.total || 0);
            });

        const cashFlow = {
            hours,
            sales: hours.map((h) => todaysSales[h] || 0),
            costs: [180, 240, 160, 300, 340, 390, 330, 260, 210, 240, 280, 330, 290],
            profit: [240, 320, 220, 360, 420, 470, 400, 300, 250, 290, 330, 390, 350],
        };

        return { kpis, topProducts, categoryData, lowStock, activities, cashFlow };
    }, [orders, ingredients]);

    if (error) {
        return (
            <div>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div>
            <div>
                <h1>Dashboard</h1>
                <p>Visão geral do negócio e assistente de IA</p>
            </div>

            <div>
                {kpis.map((kpi) => (
                    <KpiCard key={kpi.id} {...kpi} />
                ))}
            </div>

            <div>
                <Card title="Fluxo de Caixa Operacional">
                    <LineChart hours={cashFlow.hours} sales={cashFlow.sales} costs={cashFlow.costs} profit={cashFlow.profit} />
                </Card>

                <Card title="Faturamento por Categoria">
                    <div>
                        <DonutChart data={categoryData} />
                        <div>
                            {categoryData.map((item) => (
                                <div key={item.label}>
                                    {item.label} — {Math.round(item.percent)}% — {formatPrice(item.value)}
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            <div>
                <Card title="Produtos Mais Vendidos">
                    <div>
                        {topProducts.map((p) => (
                            <div key={p.name}>
                                {p.name} — {p.units} unidades — {formatPrice(p.value)}
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Alerta de Insumos">
                    <div>
                        {lowStock.map((item) => (
                            <div key={item.name}>
                                {item.name} — Atual: {item.current} · Mínimo: {item.min} — {item.badge}
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Atividades Recentes">
                    <div>
                        {activities.map((a) => (
                            <div key={a.id}>
                                {a.time} — {a.text}
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* ===== ASSISTENTE DE IA ===== */}
            <section>
                <h3>Assistente de IA</h3>
                <p>
                    Faça perguntas sobre vendas, movimentação de dinheiro, estoque e produtos.
                </p>

                <div>
                    {suggestions.map((s) => (
                        <button key={s} type="button" onClick={() => ask(s)}>{s}</button>
                    ))}
                </div>

                <div>
                    <textarea
                        placeholder="Ex.: Qual foi a receita total de hoje? Quais produtos mais vendem?"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
                    />
                    <button type="button" onClick={() => ask()} disabled={thinking}>
                        <Send size={16} /> {thinking ? 'A pensar...' : 'Enviar'}
                    </button>
                </div>

                {thinking && <p>A consultar os dados e a IA...</p>}
                {answer && <p>{answer}</p>}
            </section>
        </div>
    );
}
