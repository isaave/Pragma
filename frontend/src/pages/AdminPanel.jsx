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
                const res = await api.put(`/users/${editId}`, formData);
                alert(res.data.message || 'Utilizador atualizado com sucesso!');
            } else {
                const res = await api.post('/users', formData);
                alert(res.data.message || 'Utilizador criado com sucesso!');
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
        <div>
        

            <main>
                <h1>Gestão de Utilizadores</h1>
                <p>Bem-vindo, {currentUser?.name} ({currentUser?.role})</p>

                {isChefe && (
                    <form onSubmit={handleSubmit}>
                        <label>
                            Nome Completo
                            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                        </label>
                        <label>
                            E-mail
                            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                        </label>
                        {/* Senha gerada automaticamente pelo sistema e enviada por email */}
                        <label>
                            Cargo
                            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                <option value="Atendente">Atendente</option>                                
                                <option value="Auxiliar de cozinha">Auxiliar de cozinha</option>
                                <option value="Gerente">Gerente</option>
                                <option value="Chefe">Chefe</option>
                            </select>
                        </label>
                        <label>
                            Nível de Acesso
                            <select value={formData.access_level} onChange={e => setFormData({...formData, access_level: e.target.value})}>
                                <option value="Nível 1">Nível 1 - Básico (Pedidos e cardápio)</option>
                                <option value="Nível 2">Nível 2 - Intermediário (Relatórios)</option>
                                <option value="Nível 3">Nível 3 - Avançado (Acesso total)</option>
                            </select>
                        </label>
                        <label>
                            Status
                            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                <option value="Ativo">Ativo</option>
                                <option value="Inativo">Inativo</option>
                            </select>
                        </label>
                        <button type="submit">
                            {isEditing ? 'Atualizar' : 'Adicionar'}
                        </button>
                        {isEditing && (
                            <button type="button" onClick={resetForm}>
                                Cancelar
                            </button>
                        )}
                    </form>
                )}

                <table>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>E-mail</th>
                            <th>Cargo</th>
                            <th>Nível de Acesso</th>
                            <th>Status</th>
                            {isChefe && <th>Ações</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{user.role}</td>
                                <td>{user.access_level}</td>
                                <td>{user.status}</td>
                                {isChefe && (
                                    <td>
                                        <button onClick={() => handleEdit(user)}>Editar</button>
                                        <button onClick={() => handleDelete(user.id)}>Apagar</button>
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