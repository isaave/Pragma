import React, { useState, useEffect } from 'react';
import api from '../Services/api';

export default function AdminPanel() {
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'Atendente',
        access_level: 'Nível 1',
        status: 'Ativo'
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('pragma_user');
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser));
        }
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error("Erro ao buscar utilizadores", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/users/${editId}`, formData);
                alert('Utilizador atualizado com sucesso!');
            } else {
                await api.post('/users', formData);
                alert('Utilizador criado com sucesso!');
            }
            resetForm();
            fetchUsers();
        } catch (error) {
            alert('Erro ao guardar utilizador. Verifica os dados.');
        }
    };

    const resetForm = () => {
        setFormData({ name: '', email: '', password: '', role: 'Atendente', access_level: 'Nível 1', status: 'Ativo' });
        setIsEditing(false);
        setEditId(null);
    };

    const handleEdit = (user) => {
        setFormData({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role || 'Atendente',
            access_level: user.access_level || 'Nível 1',
            status: user.status || 'Ativo'
        });
        setIsEditing(true);
        setEditId(user.id);
    };

    const handleDelete = async (id) => {
        if (confirm('Tens a certeza que queres apagar este utilizador?')) {
            try {
                await api.delete(`/users/${id}`);
                fetchUsers();
            } catch (error) {
                alert('Erro ao apagar utilizador.');
            }
        }
    };

    const isChefe = (currentUser?.role || '').toLowerCase() === 'chefe';

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f4f6f9' }}>
            <aside style={{ width: '80px', backgroundColor: '#0b132b', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
                <div style={{ color: 'white', fontWeight: 'bold', marginBottom: '20px' }}>🍔</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', color: 'white' }}>
                    <span title="Utilizadores" style={{ cursor: 'pointer', padding: '10px', background: '#1c2541', borderRadius: '8px' }}>👤</span>
                    {isChefe && <span title="Relatórios e Gráficos (Dashboard)" style={{ cursor: 'pointer', padding: '10px' }}>📊</span>}
                    <span title="Cardápio" style={{ cursor: 'pointer', padding: '10px' }}>🍔</span>
                </div>
            </aside>

            <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                <h1>Gestão de Utilizadores</h1>
                <p>Bem-vindo, {currentUser?.name} ({currentUser?.role})</p>

                {isChefe && (
                    <form onSubmit={handleSubmit} style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        <input type="text" placeholder="Nome Completo" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                        <input type="email" placeholder="E-mail" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                        <input type="password" placeholder="Senha Inicial" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} {...(!isEditing && {required: true})} />
                        <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                            <option value="Atendente">Atendente</option>
                            <option value="Chefe">Chefe</option>
                        </select>
                        <select value={formData.access_level} onChange={e => setFormData({...formData, access_level: e.target.value})}>
                            <option value="Nível 1">Nível 1</option>
                            <option value="Nível 2">Nível 2</option>
                            <option value="Nível 3">Nível 3</option>
                        </select>
                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                            <option value="Ativo">Ativo</option>
                            <option value="Inativo">Inativo</option>
                        </select>
                        <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px' }}>
                            {isEditing ? 'Atualizar' : 'Adicionar'}
                        </button>
                        {isEditing && (
                            <button type="button" onClick={resetForm} style={{ background: '#7c879d', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px' }}>
                                Cancelar
                            </button>
                        )}
                    </form>
                )}

                <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead>
                        <tr style={{ background: '#2563eb', color: 'white' }}>
                            <th style={{ padding: '12px' }}>Nome</th>
                            <th style={{ padding: '12px' }}>E-mail</th>
                            <th style={{ padding: '12px' }}>Cargo</th>
                            <th style={{ padding: '12px' }}>Nível de Acesso</th>
                            <th style={{ padding: '12px' }}>Status</th>
                            {isChefe && <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px' }}>{user.name}</td>
                                <td style={{ padding: '12px' }}>{user.email}</td>
                                <td style={{ padding: '12px' }}>{user.role}</td>
                                <td style={{ padding: '12px' }}>{user.access_level}</td>
                                <td style={{ padding: '12px' }}>{user.status}</td>
                                {isChefe && (
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <button onClick={() => handleEdit(user)} style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                                        <button onClick={() => handleDelete(user.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>
        </div>
    );
}