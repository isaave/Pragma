import React, { useState } from 'react';
import api from '../Services/api';

export default function Login({ onLoginSuccess }) {
    const [view, setView] = useState('login'); // login | forgot | verify | reset
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);

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
            if (err.response && err.response.data.message) setError(err.response.data.message);
            else setError('Ocorreu um erro ao tentar fazer login. Tenta novamente.');
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
            setView('verify');
        } catch (err) {
            if (err.response && err.response.data.message) setError(err.response.data.message);
            else setError('Erro ao solicitar código.');
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
            setView('reset');
        } catch (err) {
            if (err.response && err.response.data.message) setError(err.response.data.message);
            else setError('Código inválido.');
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
                password_confirmation: confirmPassword
            });
            setInfo(res.data.message);
            setView('login');
            setPassword('');
            setConfirmPassword('');
            setCode('');
        } catch (err) {
            if (err.response && err.response.data.message) setError(err.response.data.message);
            else setError('Erro ao redefinir senha.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {view === 'login' && (
                <form onSubmit={handleLogin}>
                    <h2>Pragma - Login</h2>
                    {error && <div>{error}</div>}
                    {info && <div>{info}</div>}
                    <label>
                        E-mail
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </label>
                    <label>
                        Palavra-passe
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </label>
                    <button type="submit" disabled={loading}>{loading ? 'A entrar...' : 'Entrar'}</button>
                    <button type="button" onClick={() => { setView('forgot'); setError(''); setInfo(''); }}>Esqueci a senha</button>
                </form>
            )}

            {view === 'forgot' && (
                <form onSubmit={handleForgot}>
                    <h2>Recuperar senha</h2>
                    {error && <div>{error}</div>}
                    {info && <div>{info}</div>}
                    <label>
                        E-mail
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </label>
                    <button type="submit" disabled={loading}>{loading ? 'A enviar...' : 'Enviar código'}</button>
                    <button type="button" onClick={() => setView('login')}>Voltar</button>
                </form>
            )}

            {view === 'verify' && (
                <form onSubmit={handleVerify}>
                    <h2>Verificar código</h2>
                    {error && <div>{error}</div>}
                    {info && <div>{info}</div>}
                    <label>
                        Código de 6 dígitos
                        <input type="text" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={6} />
                    </label>
                    <button type="submit" disabled={loading}>{loading ? 'A verificar...' : 'Verificar'}</button>
                    <button type="button" onClick={() => setView('forgot')}>Voltar</button>
                </form>
            )}

            {view === 'reset' && (
                <form onSubmit={handleReset}>
                    <h2>Redefinir senha</h2>
                    {error && <div>{error}</div>}
                    {info && <div>{info}</div>}
                    <label>
                        Nova senha
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </label>
                    <label>
                        Confirmar senha
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    </label>
                    <button type="submit" disabled={loading}>{loading ? 'A redefinir...' : 'Redefinir'}</button>
                    <button type="button" onClick={() => setView('login')}>Voltar</button>
                </form>
            )}
        </div>
    );
}