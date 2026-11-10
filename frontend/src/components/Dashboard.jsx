import React, { useState, useEffect } from 'react';
import { LayoutDashboard, DollarSign, Package, ShoppingCart, AlertTriangle, Send, Sparkles } from 'lucide-react';
import api from '../Services/api';

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const styles = {
    page: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        fontFamily: FONT,
    },
    title: { fontSize: '26px', fontWeight: 700, color: '#03071e', margin: 0 },
    subtitle: { fontSize: '14px', color: '#94a3b8', margin: '4px 0 0' },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
    },
    kpi: {
        background: '#ffffff',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 4px 16px rgba(3, 7, 30, 0.05)',
        border: '1px solid #eef2f7',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    kpiLabel: { fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' },
    kpiValue: { fontSize: '24px', fontWeight: 700, color: '#03071e' },
    kpiIcon: (bg) => ({
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        marginBottom: '4px',
    }),
    chatCard: {
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 16px rgba(3, 7, 30, 0.05)',
        border: '1px solid #eef2f7',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    chatTitle: { fontSize: '18px', fontWeight: 700, color: '#03071e', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' },
    chatSubtitle: { fontSize: '13px', color: '#94a3b8', margin: 0 },
    chatInputRow: {
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-end',
    },
    chatInput: {
        flex: 1,
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        background: '#fafbfd',
        fontSize: '14px',
        fontFamily: FONT,
        resize: 'vertical',
        minHeight: '44px',
        boxSizing: 'border-box',
        outline: 'none',
    },
    sendBtn: {
        padding: '12px 18px',
        borderRadius: '12px',
        border: 'none',
        background: '#1d4ed8',
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: FONT,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    answerBox: {
        background: '#f8fafc',
        border: '1px solid #eef2f7',
        borderRadius: '12px',
        padding: '16px',
        fontSize: '14px',
        color: '#334155',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
    },
    thinking: { fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' },
    suggestions: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
    },
    suggestion: {
        padding: '6px 12px',
        borderRadius: '999px',
        border: '1px solid #e2e8f0',
        background: '#ffffff',
        color: '#475569',
        fontSize: '12px',
        cursor: 'pointer',
        fontFamily: FONT,
    },
};

const formatPrice = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState({ revenueToday: 0, revenueTotal: 0, ordersCount: 0, productsActive: 0, lowStock: 0 });
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [thinking, setThinking] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const [ordersRes, productsRes, ingredientsRes] = await Promise.all([
                    api.get('/orders'),
                    api.get('/products'),
                    api.get('/ingredients'),
                ]);
                if (!active) return;
                const orders = ordersRes.data || [];
                const products = productsRes.data || [];
                const ingredients = ingredientsRes.data || [];
                const today = new Date().toDateString();
                const revenueToday = orders
                    .filter((o) => o.status !== 'cancelled' && new Date(o.created_at).toDateString() === today)
                    .reduce((s, o) => s + Number(o.total || 0), 0);
                const revenueTotal = orders
                    .filter((o) => o.status !== 'cancelled')
                    .reduce((s, o) => s + Number(o.total || 0), 0);
                setKpis({
                    revenueToday,
                    revenueTotal,
                    ordersCount: orders.length,
                    productsActive: products.filter((p) => p.is_active && p.status === 'ativo').length,
                    lowStock: ingredients.filter((i) => i.stock_status === 'Estoque baixo' || i.stock_status === 'Em falta').length,
                });
            } catch (err) {
                if (active) setError('Não foi possível carregar os dados do dashboard.');
            } finally {
                if (active) setLoading(false);
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
        setError('');
        try {
            const res = await api.post('/ai/ask', { question: text });
            setAnswer(res.data.answer || 'Sem resposta.');
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao consultar a IA.');
        } finally {
            setThinking(false);
        }
    };

    const suggestions = [
        'Qual foi a receita total de hoje?',
        'Quais são os produtos mais vendidos?',
        'Quais ingredientes estão com estoque baixo?',
        'Quantos pedidos foram entregues?',
    ];

    return (
        <div style={styles.page}>
            <div>
                <h1 style={styles.title}>Dashboard</h1>
                <p style={styles.subtitle}>Visão geral do negócio e assistente de IA</p>
            </div>

            {error && <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p>}

            {/* KPIs */}
            <div style={styles.grid}>
                <div style={styles.kpi}>
                    <div style={styles.kpiIcon('#1d4ed8')}><DollarSign size={20} /></div>
                    <span style={styles.kpiLabel}>Receita hoje</span>
                    <span style={styles.kpiValue}>{formatPrice(kpis.revenueToday)}</span>
                </div>
                <div style={styles.kpi}>
                    <div style={styles.kpiIcon('#03071e')}><DollarSign size={20} /></div>
                    <span style={styles.kpiLabel}>Receita total</span>
                    <span style={styles.kpiValue}>{formatPrice(kpis.revenueTotal)}</span>
                </div>
                <div style={styles.kpi}>
                    <div style={styles.kpiIcon('#6366f1')}><ShoppingCart size={20} /></div>
                    <span style={styles.kpiLabel}>Pedidos</span>
                    <span style={styles.kpiValue}>{kpis.ordersCount}</span>
                </div>
                <div style={styles.kpi}>
                    <div style={styles.kpiIcon('#15803d')}><Package size={20} /></div>
                    <span style={styles.kpiLabel}>Produtos ativos</span>
                    <span style={styles.kpiValue}>{kpis.productsActive}</span>
                </div>
                <div style={styles.kpi}>
                    <div style={styles.kpiIcon('#b91c1c')}><AlertTriangle size={20} /></div>
                    <span style={styles.kpiLabel}>Estoque crítico</span>
                    <span style={styles.kpiValue}>{kpis.lowStock}</span>
                </div>
            </div>

            {/* Assistente de IA */}
            <div style={styles.chatCard}>
                <div>
                    <h2 style={styles.chatTitle}><Sparkles size={20} color="#1d4ed8" /> Assistente de IA</h2>
                    <p style={styles.chatSubtitle}>Faça perguntas sobre vendas, movimentação de dinheiro, estoque e produtos.</p>
                </div>

                <div style={styles.suggestions}>
                    {suggestions.map((s) => (
                        <button key={s} type="button" style={styles.suggestion} onClick={() => { setQuestion(s); ask(s); }}>
                            {s}
                        </button>
                    ))}
                </div>

                <div style={styles.chatInputRow}>
                    <textarea
                        style={styles.chatInput}
                        placeholder="Ex.: Qual foi a receita total de hoje? Quais produtos mais vendem?"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
                    />
                    <button type="button" style={styles.sendBtn} onClick={() => ask()} disabled={thinking}>
                        <Send size={16} />
                        {thinking ? 'A pensar...' : 'Enviar'}
                    </button>
                </div>

                {thinking && <p style={styles.thinking}>A consultar os dados e a IA...</p>}
                {answer && <div style={styles.answerBox}>{answer}</div>}
            </div>
        </div>
    );
}
