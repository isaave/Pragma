import React, { useState, useEffect } from 'react';
import api from '../Services/api';

const BACKEND_URL = 'http://127.0.0.1:8000';

export default function Profile() {
    const [user, setUser] = useState(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/profile');
            setUser(res.data);
            setName(res.data.name || '');
            setEmail(res.data.email || '');
            setAvatarPreview(res.data.avatar_url ? `${BACKEND_URL}${res.data.avatar_url}` : null);
        } catch (err) {
            setError('Erro ao carregar perfil.');
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleUploadAvatar = async () => {
        if (!avatarFile) return;
        setError('');
        setMessage('');
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', avatarFile);
            const res = await api.post('/profile/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage(res.data.message);
            setAvatarFile(null);
            setAvatarPreview(res.data.avatar_url ? `${BACKEND_URL}${res.data.avatar_url}` : null);
            fetchProfile();
            // atualiza localStorage
            const stored = localStorage.getItem('pragma_user');
            if (stored) {
                const u = JSON.parse(stored);
                u.avatar = res.data.avatar;
                localStorage.setItem('pragma_user', JSON.stringify(u));
            }
        } catch (err) {
            setError('Erro ao enviar imagem.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (password && password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        setLoading(true);
        try {
            const payload = { name, email };
            if (password) {
                payload.password = password;
                payload.password_confirmation = confirmPassword;
            }
            const res = await api.put('/profile', payload);
            setMessage(res.data.message);
            setUser(res.data.user);
            // atualiza localStorage
            const stored = localStorage.getItem('pragma_user');
            if (stored) {
                const u = JSON.parse(stored);
                u.name = res.data.user.name;
                u.email = res.data.user.email;
                localStorage.setItem('pragma_user', JSON.stringify(u));
            }
            setPassword('');
            setConfirmPassword('');
        } catch (err) {
            if (err.response && err.response.data.message) setError(err.response.data.message);
            else setError('Erro ao atualizar perfil.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1>Perfil do Utilizador</h1>
            {error && <div>{error}</div>}
            {message && <div>{message}</div>}

            {avatarPreview && (
                <div>
                    <img src={avatarPreview} alt="Avatar" width="120" height="120" />
                </div>
            )}

            <label>
                Anexar imagem
                <input type="file" accept="image/*" onChange={handleAvatarChange} />
            </label>
            <button type="button" onClick={handleUploadAvatar} disabled={!avatarFile || loading}>
                {loading ? 'A enviar...' : 'Guardar imagem'}
            </button>

            <form onSubmit={handleSubmit}>
                <label>
                    Nome
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                </label>
                <label>
                    Email corporativo
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </label>
                <label>
                    Nova senha
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
                </label>
                <label>
                    Confirmar senha
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </label>
                <button type="submit" disabled={loading}>
                    {loading ? 'A guardar...' : 'Guardar alterações'}
                </button>
            </form>
        </div>
    );
}