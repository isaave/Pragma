import React, { useState, useEffect } from 'react';
import { DollarSign, Package, ShoppingCart, AlertTriangle, Send, Sparkles } from 'lucide-react';
import api from '../Services/api';

const formatPrice = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Dashboard() {
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
        <div>
            <div>
                <h1>Dashboard</h1>
                <p>Visão geral do negócio e assistente de IA</p>
            </div>

            {error && <p>{error}</p>}

            <div>
                <div>
                    <div>
                        <DollarSign size={20} /> Receita hoje
                    </div>
                    <span>{formatPrice(kpis.revenueToday)}</span>
                </div>
                <div>
                    <div>
                        <DollarSign size={20} /> Receita total
                    </div>
                    <span>{formatPrice(kpis.revenueTotal)}</span>
                </div>
                <div>
                    <div>
                        <ShoppingCart size={20} /> Pedidos
                    </div>
                    <span>{kpis.ordersCount}</span>
                </div>
                <div>
                    <div>
                        <Package size={20} /> Produtos ativos
                    </div>
                    <span>{kpis.productsActive}</span>
                </div>
                <div>
                    <div>
                        <AlertTriangle size={20} /> Estoque crítico
                    </div>
                    <span>{kpis.lowStock}</span>
                </div>
            </div>

            <div>
                <div>
                    <h2>
                        <Sparkles size={20} /> Assistente de IA
                    </h2>
                    <p>Faça perguntas sobre vendas, movimentação de dinheiro, estoque e produtos.</p>
                </div>

                <div>
                    {suggestions.map((s) => (
                        <button key={s} type="button" onClick={() => { setQuestion(s); ask(s); }}>
                            {s}
                        </button>
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
                        <Send size={16} />
                        {thinking ? 'A pensar...' : 'Enviar'}
                    </button>
                </div>

                {thinking && <p>A consultar os dados e a IA...</p>}
                {answer && <p>{answer}</p>}
            </div>
        </div>
    );
}
