import React, { useState, useEffect, useRef } from 'react';
import { User, ShieldCheck, ChefHat, Pencil, Eye, EyeOff } from 'lucide-react';
import api from '../Services/api';

const BACKEND_URL = 'http://127.0.0.1:8000';
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// ---- Estilos organizados ----
const styles = {
    // Ocupa toda a área disponível (sem scroll)
    page: {
        flex: 1,
        width: '100%',
        background: '#ffffff',
        fontFamily: FONT,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
    },
    card: {
        flex: 1,
        width: '100%',
        background: 'transparent',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        boxShadow: 'none',
        padding: '40px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        overflow: 'hidden',
        // Distribui hierarquicamente: cabeçalho no topo, formulário no meio, rodapé em baixo
        justifyContent: 'space-between',
    },

    // Cabeçalho do cartão
    // Cabeçalho fora do cartão
    titleBlock: {
        padding: '40px 40px 24px',
    },
    title: { fontSize: '28px', fontWeight: 700, color: '#03071e', margin: 0 },
    subtitle: { fontSize: '14px', color: '#94a3b8', margin: '6px 0 0' },

    // Cabeçalho do utilizador
    userHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
    },
    avatar: {
        width: '96px',
        height: '96px',
        borderRadius: '50%',
        objectFit: 'cover',
        background: '#e8edf5',
        flexShrink: 0,
    },
    avatarBtn: {
        position: 'relative',
        width: '96px',
        height: '96px',
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        flexShrink: 0,
        display: 'flex',
    },
    avatarEdit: {
        position: 'absolute',
        right: '-2px',
        bottom: '-2px',
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: '#1d4ed8',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid #ffffff',
        boxSizing: 'border-box',
    },
    userName: { fontSize: '24px', fontWeight: 700, color: '#0f172e', margin: 0 },
    badgeRow: { display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' },
    badge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        fontWeight: 600,
        color: '#1d4ed8',
        background: '#eff6ff',
        border: '1px solid #dbeafe',
        borderRadius: '999px',
        padding: '7px 14px',
    },
    badgeDark: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        fontWeight: 600,
        color: '#e0e7ff',
        background: '#03071e',
        borderRadius: '999px',
        padding: '6px 12px',
    },

    // Formulário
    form: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: '14px',
    },
    fieldLabel: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: '#64748b',
        width: '100%',
    },
    inputWrap: { position: 'relative', width: '100%' },
    input: {
        width: '100%',
        padding: '13px 44px 13px 16px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        background: '#fafbfd',
        fontSize: '14px',
        color: '#0f172e',
        fontFamily: FONT,
        boxSizing: 'border-box',
        outline: 'none',
    },
    fieldIcon: {
        position: 'absolute',
        right: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#94a3b8',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        display: 'flex',
    },
    grid2: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '18px',
    },

    // Alertas
    alertSuccess: {
        background: '#f0fdf4',
        color: '#15803d',
        border: '1px solid #bbf7d0',
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '13px',
        margin: 0,
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

    // Rodapé
    footer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
        borderTop: '1px solid #eef2f7',
        paddingTop: '20px',
        marginTop: 'auto',
    },
    footerNote: { fontSize: '12px', color: '#94a3b8', margin: 0 },
    footerActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    cancelBtn: {
        padding: '11px 22px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        background: '#f8fafc',
        color: '#475569',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: FONT,
    },
    saveBtn: {
        padding: '11px 22px',
        borderRadius: '12px',
        border: 'none',
        background: '#1d4ed8',
        color: 'white',
        fontSize: '14px',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: FONT,
    },
};

// Formata a última atualização (Hoje às HH:MM, ou data completa)
function formatUpdatedAt(value) {
    if (!value) return '';
    const date = new Date(value);
    const now = new Date();
    const time = date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) return `Hoje às ${time}`;
    const day = date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${day} às ${time}`;
}

export default function UserProfile() {
    const [user, setUser] = useState(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [showSenha, setShowSenha] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loadingSave, setLoadingSave] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef(null);

    // Carrega os dados do perfil autenticado
    useEffect(() => {
        let active = true;
        api.get('/profile')
            .then((res) => {
                if (!active) return;
                const data = res.data;
                setUser(data);
                setName(data.name || '');
                setEmail(data.email || '');
            })
            .catch(() => {
                if (active) setError('Não foi possível carregar o perfil.');
            });
        return () => { active = false; };
    }, []);

    const nomeCompleto = user?.name || name || 'Utilizador';
    const avatarUrl = user?.avatar_url
        ? `${BACKEND_URL}${user.avatar_url.startsWith('/') ? '' : '/'}${user.avatar_url}?t=${Date.now()}`
        : null;

    // Upload de nova foto de perfil
    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError('');
        setSuccess('');
        setUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const res = await api.post('/profile/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setUser((prev) => ({ ...prev, avatar: res.data.avatar, avatar_url: res.data.avatar_url }));
            setSuccess(res.data.message || 'Imagem de perfil atualizada!');

            const stored = localStorage.getItem('pragma_user');
            if (stored) {
                const u = JSON.parse(stored);
                localStorage.setItem('pragma_user', JSON.stringify({ ...u, avatar: res.data.avatar, avatar_url: res.data.avatar_url }));
                window.dispatchEvent(new Event('pragma:user'));
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao enviar imagem.');
        } finally {
            setUploadingAvatar(false);
            e.target.value = '';
        }
    };

    const handleCancel = () => {
        setName(user?.name || '');
        setEmail(user?.email || '');
        setSenha('');
        setError('');
        setSuccess('');
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoadingSave(true);
        try {
            const payload = { name, email };
            if (senha) {
                payload.password = senha;
                payload.password_confirmation = senha;
            }
            const res = await api.put('/profile', payload);
            const updated = res.data.user;
            setUser(updated);
            setSenha('');
            setSuccess(res.data.message || 'Perfil atualizado com sucesso!');

            // Mantém a sessão/sidebars em sincronia
            const stored = localStorage.getItem('pragma_user');
            if (stored) {
                const u = JSON.parse(stored);
                localStorage.setItem('pragma_user', JSON.stringify({ ...u, name: updated.name, email: updated.email }));
                window.dispatchEvent(new Event('pragma:user'));
            }
        } catch (err) {
            const msg = err.response?.data?.message
                || (err.response?.data?.errors && Object.values(err.response.data.errors)[0]?.[0])
                || 'Erro ao salvar alterações.';
            setError(msg);
        } finally {
            setLoadingSave(false);
        }
    };

    return (
        <div style={styles.page}>
            {/* Cabeçalho fora do cartão */}
            <div style={styles.titleBlock}>
                <h1 style={styles.title}>Meu perfil pessoal</h1>
                <p style={styles.subtitle}>Gerencie suas informações, cargo e credenciais de segurança</p>
            </div>

            <div style={styles.card}>
                {/* Cabeçalho do utilizador */}
                <div style={styles.userHeader}>
                    <button
                        type="button"
                        style={styles.avatarBtn}
                        onClick={() => fileInputRef.current?.click()}
                        title="Alterar foto de perfil"
                    >
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" style={styles.avatar} />
                        ) : (
                            <User size={96} color="#94a3b8" style={styles.avatar} />
                        )}
                        <span style={styles.avatarEdit}>
                            <Pencil size={14} />
                        </span>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        style={{ display: 'none' }}
                    />
                    {uploadingAvatar && <span style={styles.footerNote}>A enviar imagem…</span>}
                    <div>
                        <h2 style={styles.userName}>{nomeCompleto}</h2>
                        <div style={styles.badgeRow}>
                            <span style={styles.badge}>
                                <ChefHat size={14} />
                                {user?.role || 'Sem cargo'}
                            </span>
                            <span style={styles.badgeDark}>
                                <ShieldCheck size={14} />
                                {user?.access_level ? `Acesso ${user.access_level}` : 'Acesso definido pelo responsável'}
                            </span>
                        </div>
                    </div>
                </div>

                {error && <p style={styles.alertError}>{error}</p>}
                {success && <p style={styles.alertSuccess}>{success}</p>}

                {/* Formulário */}
                <form onSubmit={handleSave} style={styles.form}>
                    <label style={styles.fieldLabel}>
                        Nome completo
                        <div style={styles.inputWrap}>
                            <input
                                type="text"
                                style={styles.input}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                            <span style={styles.fieldIcon}>
                                <Pencil size={16} />
                            </span>
                        </div>
                    </label>

                    <div style={styles.grid2}>
                        <label style={styles.fieldLabel}>
                            E-mail corporativo
                            <div style={styles.inputWrap}>
                                <input
                                    type="email"
                                    style={{ ...styles.input, paddingRight: '16px' }}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </label>

                        <label style={styles.fieldLabel}>
                            Senha
                            <div style={styles.inputWrap}>
                                <input
                                    type={showSenha ? 'text' : 'password'}
                                    style={styles.input}
                                    placeholder="••••••••"
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                />
                                <button
                                    type="button"
                                    style={styles.fieldIcon}
                                    onClick={() => setShowSenha(!showSenha)}
                                    title={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                                >
                                    {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </label>
                    </div>

                    {/* Rodapé do cartão */}
                    <div style={styles.footer}>
                        <p style={styles.footerNote}>
                            Última atualização em: {formatUpdatedAt(user?.updated_at) || '—'}
                        </p>
                        <div style={styles.footerActions}>
                            <button type="button" style={styles.cancelBtn} onClick={handleCancel}>
                                Cancelar
                            </button>
                            <button type="submit" style={styles.saveBtn} disabled={loadingSave}>
                                {loadingSave ? 'A salvar...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
