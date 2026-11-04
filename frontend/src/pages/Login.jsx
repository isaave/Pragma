import React, { useState } from 'react';
import api from '../Services/api';

export default function Login({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/login', {
                email,
                password
            });

            const { token, user } = response.data;
            localStorage.setItem('pragma_token', token);
            localStorage.setItem('pragma_user', JSON.stringify(user));

            if (onLoginSuccess) {
                onLoginSuccess();
            }

        } catch (err) {
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
        <div>
            <form onSubmit={handleLogin}>
                <h2>Pragma - Login</h2>

                {error && <div>{error}</div>}

                <label>
                    E-mail
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </label>

                <label>
                    Palavra-passe
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </label>

                <button type="submit" disabled={loading}>
                    {loading ? 'A entrar...' : 'Entrar'}
                </button>
            </form>
        </div>
    );
}