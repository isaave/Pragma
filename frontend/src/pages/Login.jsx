import React, { useState } from 'react';
import api from '../Services/api'; // Ajusta o caminho conforme a localização do teu api.js

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Envia os dados de login para a rota POST /api/login do Laravel
            const response = await api.post('/login', {
                email,
                password
            });

            // Se o login for bem-sucedido, guardamos o token e os dados do utilizador
            const { token, user } = response.data;
            localStorage.setItem('pragma_token', token);
            localStorage.setItem('pragma_user', JSON.stringify(user));

            alert(`Bem-vindo de volta, ${user.name}!`);
            
            // Aqui podes redirecionar o utilizador para a página principal (ex: dashboard)
            // window.location.href = '/dashboard';

        } catch (err) {
            // Se der erro (ex: credenciais inválidas), mostra a mensagem
            if (err.response && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('Ocorreu um erro ao tentar fazer login. Tenta novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f5f5f5' }}>
            <form onSubmit={handleLogin} style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '320px' }}>
                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#333' }}>Pragma - Login</h2>

                {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>E-mail</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Palavra-passe</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                        style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    style={{ width: '100%', padding: '0.75rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    {loading ? 'A entrar...' : 'Entrar'}
                </button>
            </form>
        </div>
    );
}