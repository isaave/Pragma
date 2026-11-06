import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ClipboardList, History, Package, BarChart3, Users } from 'lucide-react';
import api from '../Services/api';
import logo from '../assets/LogoHouseBurguer.png';

// ---- Estilos organizados ----
const styles = {
    root: {
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        fontFamily: 'system-ui, sans-serif',
    },
    // LADO ESQUERDO — Onboarding (gradiente azul → roxo)
    left: {
        flex: 1,
        background: 'linear-gradient(160deg, #60a5fa 0%, #1e3a8a 50%, #8b5cf6 100%)',
        color: 'white',
        padding: '48px 56px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '28px',
        boxSizing: 'border-box',
    },
    welcomeTitle: { fontSize: '34px', margin: 0, lineHeight: 1.2, fontWeight: 300 },
    welcomeTitleStrong: { fontWeight: 700 },
    featureGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '14px',
        maxWidth: '560px',
    },
    featureCard: {
        background: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.22)',
        borderRadius: '16px',
        padding: '16px 18px',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    featureTitle: { fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' },
    featureDesc: { fontSize: '13px', color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.4 },

    // LADO DIREITO — Card de autenticação
    right: {
        flex: 1,
        background: '#f7f8fb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
    },
    card: {
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 10px 40px rgba(3, 7, 30, 0.08)',
        padding: '40px 36px',
        width: 'min(420px, 100%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
    },
    logo: {
        width: '88px',
        height: '88px',
        borderRadius: '50%',
        objectFit: 'cover',
        alignSelf: 'center',
        boxShadow: '0 4px 16px rgba(3, 7, 30, 0.12)',
    },
    cardTitle: { fontSize: '24px', fontWeight: 700, margin: 0, textAlign: 'center', color: '#03071e' },
    fieldLabel: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '13px',
        fontWeight: 600,
        color: '#475569',
        position: 'relative',
    },
    input: {
        width: '100%',
        padding: '12px 44px 12px 42px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        background: '#f8fafc',
        fontSize: '14px',
        color: '#0f172a',
        boxSizing: 'border-box',
        outline: 'none',
    },
    inputWrap: {
        position: 'relative',
        width: '100%',
    },
    inputIcon: {
        position: 'absolute',
        left: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#94a3b8',
        pointerEvents: 'none',
    },
    inputToggle: {
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#94a3b8',
        padding: '0',
        display: 'flex',
    },
    forgotLink: {
        alignSelf: 'flex-end',
        background: 'none',
        border: 'none',
        color: '#2563eb',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        padding: 0,
    },
    submit: {
        width: '100%',
        padding: '13px',
        borderRadius: '12px',
        border: 'none',
        background: '#2563eb',
        color: 'white',
        fontSize: '15px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    firstAccess: { fontSize: '13px', color: '#64748b', margin: 0, textAlign: 'center' },
    firstAccessLink: {
        background: 'none',
        border: 'none',
        color: '#2563eb',
        fontWeight: 600,
        fontSize: '13px',
        cursor: 'pointer',
        padding: 0,
    },
    alertError: {
        background: '#fef2f2',
        color: '#b91c1c',
        border: '1px solid #fecaca',
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '13px',
        margin: 0,
    },
    alertInfo: {
        background: '#eff6ff',
        color: '#1d4ed8',
        border: '1px solid #bfdbfe',
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '13px',
        margin: 0,
    },
    secondaryBtn: {
        width: '100%',
        padding: '11px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        background: 'white',
        color: '#475569',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
    },
};

const features = [
    { icon: ClipboardList, title: 'Pedidos', desc: 'Gerencie pedidos e acompanhe cada etapa.' },
    { icon: History, title: 'Histórico', desc: 'Acesse registros anteriores e acompanhe a evolução do seu negócio.' },
    { icon: Package, title: 'Estoque', desc: 'Consulte produtos e acompanhe seu estoque.' },
    { icon: BarChart3, title: 'Relatórios', desc: 'Visualize métricas e insights para tomar decisões informadas.' },
    { icon: Users, title: 'Gestão de Usuários', desc: 'Cadastre usuários e organize sua equipe.', wide: true },
];

export default function Login({ onLoginSuccess }) {
    const [view, setView] = useState('login'); // login | forgot | verify | reset
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const titles = {
        login: 'Login',
        forgot: 'Recuperar senha',
        verify: 'Verificar código',
        reset: 'Redefinir senha',
    };

    const go = (next) => {
        setView(next);
        setError('');
        setInfo('');
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await api.post('/login', { email, password });
            const { token, user } = response.data;
            localStorage.setItem('pragma_token', token);
            localStorage.setItem('pragma_user', JSON.stringify(user));
            if (onLoginSuccess) onLoginSuccess();
        } catch (err) {
            setError(err.response?.data?.message || 'Ocorreu um erro ao tentar fazer login. Tenta novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        setLoading(true);
        try {
            const res = await api.post('/password/forgot', { email });
            setInfo(res.data.message);
            go('verify');
            setInfo(res.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao solicitar código.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        setLoading(true);
        try {
            const res = await api.post('/password/verify', { email, code });
            setInfo(res.data.message);
            go('reset');
            setInfo(res.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Código inválido.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/password/reset', {
                email,
                code,
                password,
                password_confirmation: confirmPassword,
            });
            go('login');
            setInfo(res.data.message);
            setPassword('');
            setConfirmPassword('');
            setCode('');
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao redefinir senha.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.root}>
            {/* ===== LADO ESQUERDO: Onboarding ===== */}
            <div style={styles.left}>
                <div>
                    <h1 style={styles.welcomeTitle}>Seja bem-vindo(a) ao</h1>
                    <h1 style={{ ...styles.welcomeTitle, ...styles.welcomeTitleStrong }}>Pragma</h1>
                </div>

                <div style={styles.featureGrid}>
                    {features.map(({ icon: Icon, title, desc, wide }) => (
                        <div key={title} style={{ ...styles.featureCard, gridColumn: wide ? 'span 2' : undefined }}>
                            <h3 style={styles.featureTitle}>
                                <Icon size={18} />
                                {title}
                            </h3>
                            <p style={styles.featureDesc}>{desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ===== LADO DIREITO: Autenticação ===== */}
            <div style={styles.right}>
                <div style={styles.card}>
                    <img src={logo} alt="House Burguer" style={styles.logo} />
                    <h2 style={styles.cardTitle}>{titles[view]}</h2>

                    {error && <p style={styles.alertError}>{error}</p>}
                    {info && <p style={styles.alertInfo}>{info}</p>}

                    {view === 'login' && (
                        <>
                            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <label style={styles.fieldLabel}>
                                    Email
                                    <div style={styles.inputWrap}>
                                        <span style={styles.inputIcon}><Mail size={18} /></span>
                                        <input
                                            type="email"
                                            style={styles.input}
                                            placeholder="username@gmail.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </label>

                                <label style={styles.fieldLabel}>
                                    Senha
                                    <div style={styles.inputWrap}>
                                        <span style={styles.inputIcon}><Lock size={18} /></span>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            style={{ ...styles.input, paddingLeft: '42px' }}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            style={styles.inputToggle}
                                            onClick={() => setShowPassword(!showPassword)}
                                            title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </label>

                                <button
                                    type="button"
                                    style={styles.forgotLink}
                                    onClick={() => go('forgot')}
                                >
                                    Esqueceu sua senha?
                                </button>

                                <button type="submit" style={styles.submit} disabled={loading}>
                                    {loading ? 'A entrar...' : 'Entrar'}
                                </button>
                            </form>

                            <p style={styles.firstAccess}>
                                Esse é seu primeiro acesso?{' '}
                                <button type="button" style={styles.firstAccessLink} onClick={() => go('forgot')}>
                                    Clique aqui.
                                </button>
                            </p>
                        </>
                    )}

                    {view === 'forgot' && (
                        <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <label style={styles.fieldLabel}>
                                Email
                                <div style={styles.inputWrap}>
                                    <span style={styles.inputIcon}><Mail size={18} /></span>
                                    <input
                                        type="email"
                                        style={styles.input}
                                        placeholder="username@gmail.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </label>
                            <button type="submit" style={styles.submit} disabled={loading}>
                                {loading ? 'A enviar...' : 'Enviar código'}
                            </button>
                            <button type="button" style={styles.secondaryBtn} onClick={() => go('login')}>
                                Voltar ao login
                            </button>
                        </form>
                    )}

                    {view === 'verify' && (
                        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <p style={styles.firstAccess}>Digite o código de 6 dígitos enviado ao seu email.</p>
                            <label style={styles.fieldLabel}>
                                Código
                                <input
                                    type="text"
                                    style={{ ...styles.input, paddingLeft: '14px', textAlign: 'center', letterSpacing: '8px', fontSize: '18px' }}
                                    placeholder="000000"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                    maxLength={6}
                                    required
                                />
                            </label>
                            <button type="submit" style={styles.submit} disabled={loading}>
                                {loading ? 'A verificar...' : 'Verificar'}
                            </button>
                            <button type="button" style={styles.secondaryBtn} onClick={() => go('forgot')}>
                                Voltar
                            </button>
                        </form>
                    )}

                    {view === 'reset' && (
                        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <label style={styles.fieldLabel}>
                                Nova senha
                                <div style={styles.inputWrap}>
                                    <span style={styles.inputIcon}><Lock size={18} /></span>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        style={styles.input}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </label>
                            <label style={styles.fieldLabel}>
                                Confirmar senha
                                <div style={styles.inputWrap}>
                                    <span style={styles.inputIcon}><Lock size={18} /></span>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        style={styles.input}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </label>
                            <button type="submit" style={styles.submit} disabled={loading}>
                                {loading ? 'A redefinir...' : 'Redefinir'}
                            </button>
                            <button type="button" style={styles.secondaryBtn} onClick={() => go('login')}>
                                Voltar ao login
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
