import React from 'react';
import { AlertTriangle } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Dados (mockados para o painel analítico)                           */
/* ------------------------------------------------------------------ */

const kpis = [
    { id: 'revenue', label: 'Faturamento Total', value: 'R$ 84.210,00', change: '+12,4%', tone: 'positive', hint: 'vs. período anterior' },
    { id: 'orders', label: 'Pedidos Concluídos', value: '342', change: '+8,1%', tone: 'positive', hint: 'vs. período anterior' },
    { id: 'out', label: 'Saída', value: 'R$ 41.300,00', change: '+5,2%', tone: 'warning', hint: 'custos operacionais' },
    { id: 'profit', label: 'Lucro Estimado', value: 'R$ 42.910,00', change: '+9,8%', tone: 'positive', hint: 'faturamento - saída' },
];

const cashFlow = {
    hours: ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'],
    sales: [420, 560, 380, 640, 720, 810, 690, 540, 460, 530, 610, 720, 640],
    costs: [180, 240, 160, 300, 340, 390, 330, 260, 210, 240, 280, 330, 290],
};

const categorySales = [
    { label: 'Hambúrgueres', value: 55200, percent: 55, color: '#1d4ed8' },
    { label: 'Combos', value: 21050, percent: 25, color: '#3b82f6' },
    { label: 'Bebidas', value: 16840, percent: 20, color: '#60a5fa' },
];

const topProducts = [
    { name: 'X-Burguer', units: 42, value: 'R$ 7.938,00' },
    { name: 'X-Burguer Combo', units: 18, value: 'R$ 5.112,00' },
    { name: 'X-Burguer + Bebida', units: 12, value: 'R$ 3.408,00' },
];

const lowStock = [
    { name: 'Pão Teste', current: 2, min: 5, badge: 'Crítico' },
    { name: 'Hambúrguer X', current: 3, min: 10, badge: 'Atenção' },
];

const activities = [
    { id: 1, time: '20m atrás', text: 'Pedido #0003 — status alterado para Preparando' },
    { id: 2, time: '48m atrás', text: 'Pedido #0002 — pagamento confirmado e saída registrada' },
    { id: 3, time: '1h atrás', text: 'Pedido #0001 — status alterado para Pronto' },
];

/* ------------------------------------------------------------------ */
/*  Gráfico de linhas — Fluxo de Caixa Operacional                    */
/* ------------------------------------------------------------------ */

const LineChart = ({ hours, sales, costs }) => {
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
                {categorySales[0].percent}%
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

const Card = ({ title, children, style }) => (
    <section
        style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            ...style,
        }}
    >
        {title && <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{title}</h3>}
        {children}
    </section>
);

const KpiCard = ({ label, value, change, tone, hint }) => (
    <div
        style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        }}
    >
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {label}
        </span>
        <span style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{value}</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: tone === 'positive' ? '#16a34a' : tone === 'warning' ? '#d97706' : '#dc2626' }}>
            {change} · {hint}
        </span>
    </div>
);

/* ------------------------------------------------------------------ */
/*  Tela principal                                                    */
/* ------------------------------------------------------------------ */

export default function DashboardHome() {

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Dashboard</h1>
                <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0' }}>Visão geral do negócio e assistente de IA</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {kpis.map((kpi) => (
                    <KpiCard key={kpi.id} {...kpi} />
                ))}
            </div>

            {/* ===== GRÁFICOS ===== */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                <Card title="Fluxo de Caixa Operacional">
                    <LineChart hours={cashFlow.hours} sales={cashFlow.sales} costs={cashFlow.costs} />
                </Card>
                <Card title="Faturamento por Categoria">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <DonutChart data={categorySales} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 140 }}>
                            {categorySales.map((item) => (
                                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155' }}>
                                    <span style={{ width: 12, height: 12, borderRadius: '4px', background: item.color, display: 'inline-block' }} />
                                    {item.label}
                                    <strong>{item.percent}%</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            {/* ===== COLUNAS INFERIORES ===== */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <Card title="Produtos Mais Vendidos">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {topProducts.map((p) => (
                            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8', fontWeight: 800 }}>
                                    {p.units}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{p.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Alerta de Insumos">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {lowStock.map((item) => (
                            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                                <AlertTriangle size={18} color={item.badge === 'Crítico' ? '#dc2626' : '#d97706'} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.name}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                        Atual: {item.current} · Mínimo: {item.min}
                                    </div>
                                </div>
                                <span
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        color: item.badge === 'Crítico' ? '#dc2626' : '#d97706',
                                        background: item.badge === 'Crítico' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(217, 119, 6, 0.12)',
                                        padding: '4px 10px',
                                        borderRadius: '999px',
                                    }}
                                >
                                    {item.badge}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Atividades Recentes">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {activities.map((a) => (
                            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155' }}>
                                <span
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        color: '#1d4ed8',
                                        background: 'rgba(29, 78, 216, 0.1)',
                                        padding: '4px 10px',
                                        borderRadius: '999px',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {a.time}
                                </span>
                                {a.text}
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
