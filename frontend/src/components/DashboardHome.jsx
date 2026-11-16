import React, { useState } from 'react';
import { Send } from 'lucide-react';
import api from '../Services/api';

/* ------------------------------------------------------------------ */
/*  Dados (mockados para o painel analítico)                           */
/* ------------------------------------------------------------------ */

const kpis = [
    { id: 'revenue', label: 'Faturamento Total', value: 'R$ 84.210,00', change: '+12,4%', hint: 'vs. período anterior' },
    { id: 'orders', label: 'Pedidos Concluídos', value: '342', change: '+8,1%', hint: 'vs. período anterior' },
    { id: 'out', label: 'Saída', value: 'R$ 41.300,00', change: '+5,2%', hint: 'custos operacionais' },
    { id: 'profit', label: 'Lucro Estimado', value: 'R$ 42.910,00', change: '+9,8%', hint: 'faturamento - saída' },
];

const cashFlow = {
    hours: ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'],
    sales: [420, 560, 380, 640, 720, 810, 690, 540, 460, 530, 610, 720, 640],
    costs: [180, 240, 160, 300, 340, 390, 330, 260, 210, 240, 280, 330, 290],
    profit: [240, 320, 220, 360, 420, 470, 400, 300, 250, 290, 330, 390, 350],
};

const categorySales = [
    { label: 'Hambúrgueres', value: 55200, revenue: 'R$ 55.200,00', percent: 55, color: '#1d4ed8' },
    { label: 'Combos', value: 21050, revenue: 'R$ 21.050,00', percent: 25, color: '#3b82f6' },
    { label: 'Bebidas', value: 16840, revenue: 'R$ 16.840,00', percent: 20, color: '#60a5fa' },
];

const topProducts = [
    { name: 'X-Burguer', units: 42, value: 'R$ 7.938,00' },
    { name: 'X-Burguer Combo', units: 18, value: 'R$ 5.112,00' },
    { name: 'X-Burguer + Bebida', units: 12, value: 'R$ 3.408,00' },
];

const lowStock = [
    { name: 'Pão Teste', current: 2, min: 5, badge: 'Crítico' },
    { name: 'Hambúrguer X', current: 3, min: 10, badge: 'Atenção' },
    { name: 'Queijo Ralado', current: 1, min: 4, badge: 'Crítico' },
];

const activities = [
    { id: 1, time: '20m atrás', text: 'Pedido #0003 — status alterado para Preparando' },
    { id: 2, time: '48m atrás', text: 'Pedido #0002 — pagamento confirmado e saída registrada' },
    { id: 3, time: '1h atrás', text: 'Pedido #0001 — status alterado para Pronto' },
    { id: 4, time: '2h atrás', text: 'Pedido #0000 — reembolso processado para cliente' },
];

const suggestions = [
    'Qual o faturamento de hoje?',
    'Quais produtos mais vendem?',
    'Qual o lucro operacional da semana?',
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
                {data[0].percent}%
            </text>
            <text x="90" y="106" textAnchor="middle" fontSize="11" fill="#64748b">
                Burgers
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
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [thinking, setThinking] = useState(false);

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
                        <DonutChart data={categorySales} />
                        <div>
                            {categorySales.map((item) => (
                                <div key={item.label}>
                                    {item.label} — {item.percent}% — {item.revenue}
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
                                {p.name} — {p.units} unidades — {p.value}
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
