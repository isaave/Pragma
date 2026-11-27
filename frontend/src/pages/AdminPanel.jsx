import React, { useState, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import api from '../Services/api';
import PageHeader from '../components/ui/PageHeader';
import SegmentedControl from '../components/ui/SegmentedControl';
import TableToolbar from '../components/ui/TableToolbar';
import Modal from '../components/ui/Modal';
import '../styles/users.css';

export default function AdminPanel() {
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'atendente',
        access_level: 'basico',
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
                const senha = res.data.temporary_password
                    ? `\n\nSenha temporária: ${res.data.temporary_password}`
                    : '';
                alert((res.data.message || 'Utilizador criado com sucesso!') + senha);
            }
            resetForm();
            fetchUsers();
        } catch (error) {
            const msg = error.response?.data?.message || 'Erro ao guardar utilizador. Verifica os dados.';
            alert(msg);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', email: '', password: '', role: 'atendente', access_level: 'basico', status: 'Ativo' });
        setIsEditing(false);
        setEditId(null);
        setModal(null);
    };

    const handleEdit = (user) => {
        setFormData({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role || 'atendente',
            access_level: user.access_level || 'basico',
            status: user.status || 'Ativo'
        });
        setIsEditing(true);
        setEditId(user.id);
        setModal('edit');
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

    // Permissão vem do nível de acesso; cargo (chefe/atendente) é apenas descritivo
    const isCompleto = String(currentUser?.access_level || '').toLowerCase() === 'completo';
    const labelCargo = valor => String(valor || '').toLowerCase() === 'chefe' ? 'Chefe' : 'Atendente';
    const labelAcesso = valor => String(valor || '').toLowerCase() === 'completo' ? 'Completo' : 'Básico';

    // ----- Novo: filtro / busca / ações -----
    const [filtro, setFiltro] = useState('todos');
    const [busca, setBusca] = useState('');
    const [mostrarBusca, setMostrarBusca] = useState(false);
    const [statusFiltro, setStatusFiltro] = useState('todos');
    const [mostrarFiltros, setMostrarFiltros] = useState(false);

    // ----- Novo: pop-ups -----
    const [modal, setModal] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);

    const closeModal = () => {
        resetForm();
        setSelectedUser(null);
    };

    const visibleUsers = (() => {
        let lista = users;

        if (filtro === 'basico') {
            lista = lista.filter(u => String(u.access_level || '').toLowerCase() === 'basico');
        } else if (filtro === 'completo') {
            lista = lista.filter(u => String(u.access_level || '').toLowerCase() === 'completo');
        }

        if (statusFiltro === 'ativo') {
            lista = lista.filter(u => (u.status || '').toLowerCase() === 'ativo');
        } else if (statusFiltro === 'inativo') {
            lista = lista.filter(u => (u.status || '').toLowerCase() === 'inativo');
        }

        const termo = busca.trim().toLowerCase();
        if (termo) {
            lista = lista.filter(u =>
                (u.name || '').toLowerCase().includes(termo) ||
                (u.email || '').toLowerCase().includes(termo)
            );
        }

        return lista;
    })();

    return (
        <div className="users-page">
            <main className="users-main">
                <PageHeader
                    title="Usuário"
                    subtitle="Gerencie usuários, cargos e níveis de acesso."
                />

                <div className="users-controls">
                    <div className="users-segmented">
                        <SegmentedControl
                            ariaLabel="Filtrar usuários"
                            options={[
                                { value: 'todos', label: 'Todos' },
                                { value: 'basico', label: 'Básico' },
                                { value: 'completo', label: 'Completo' },
                            ]}
                            value={filtro}
                            onChange={setFiltro}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <TableToolbar
                        onAdd={isCompleto ? () => {
                            resetForm();
                            setModal('create');
                        } : undefined}
                        onFilter={() => setMostrarFiltros(v => !v)}
                        onSearch={() => setMostrarBusca(v => !v)}
                        ariaLabel="Ações dos usuários"
                    />
                </div>

                {mostrarBusca && (
                    <div className="users-search">
                        <input
                            type="text"
                            placeholder="Buscar por nome ou e-mail"
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                        />
                    </div>
                )}

                {mostrarFiltros && (
                    <div className="users-status-filter">
                        <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
                            <option value="todos">Todos</option>
                            <option value="ativo">Ativo</option>
                            <option value="inativo">Inativo</option>
                        </select>
                    </div>
                )}

                <Modal
                    open={(modal === 'create' || modal === 'edit') && isCompleto}
                    onClose={closeModal}
                    title={modal === 'create' ? 'Novo Usuário' : 'Editar Usuário'}
                    subtitle={modal === 'create'
                        ? 'Preencha as informações para registrar o novo colaborador'
                        : 'Atualize as informações do colaborador selecionado'}
                >
                    <form className="users-form" onSubmit={handleSubmit}>
                        <label>
                            NOME COMPLETO
                            <input
                                type="text"
                                placeholder="Ex: Lucas Ferreira de Souza"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </label>
                        <label>
                            E-MAIL
                            <input
                                type="email"
                                placeholder="Ex: lucas.souza@empresa.com"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                required
                            />
                        </label>
                        {/* Senha gerada automaticamente pelo sistema e enviada por email */}
                        <label>
                            CARGO
                            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                <option value="atendente">Atendente</option>
                                <option value="chefe">Chefe</option>
                            </select>
                        </label>
                        <label>
                            NÍVEL DE ACESSO
                            <select value={formData.access_level} onChange={e => setFormData({...formData, access_level: e.target.value})}>
                                <option value="basico">Básico — pedidos, histórico e leitura de produtos/estoque</option>
                                <option value="completo">Completo — acesso total a todos os módulos</option>
                            </select>
                        </label>
                        <div className="users-field">
                            <span className="users-field-label">STATUS DO USUÁRIO</span>
                            <div className="users-status-buttons">
                                <button
                                    type="button"
                                    className={`users-status-button ${formData.status === 'Ativo' ? 'is-selected' : ''}`}
                                    onClick={() => setFormData({...formData, status: 'Ativo'})}
                                    aria-pressed={formData.status === 'Ativo'}
                                >
                                    Ativo
                                </button>
                                <button
                                    type="button"
                                    className={`users-status-button ${formData.status === 'Inativo' ? 'is-selected' : ''}`}
                                    onClick={() => setFormData({...formData, status: 'Inativo'})}
                                    aria-pressed={formData.status === 'Inativo'}
                                >
                                    Inativo
                                </button>
                            </div>
                        </div>
                        {modal === 'edit' && (
                            <label>
                                SENHA INICIAL
                                <input
                                    type="password"
                                    placeholder="Deixe em branco para manter a senha atual"
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                />
                            </label>
                        )}
                        <div className="users-form-divider" />
                        <button type="submit" className="users-modal-primary">
                            {isEditing ? 'Salvar alterações' : 'Cadastrar usuário'}
                        </button>
                    </form>
                </Modal>

                <Modal
                    open={modal === 'view'}
                    onClose={closeModal}
                    title="Informações do Usuário"
                    subtitle="Consulte os dados cadastrais e o status atual do colaborador"
                >
                    <div className="users-form">
                        <label>
                            NOME COMPLETO
                            <input type="text" value={selectedUser?.name || ''} readOnly aria-label="Nome completo" />
                        </label>
                        <label>
                            E-MAIL
                            <input type="email" value={selectedUser?.email || ''} readOnly aria-label="E-mail" />
                        </label>
                        <label>
                            CARGO
                            <select value={selectedUser?.role || ''} disabled aria-label="Cargo">
                                <option value="atendente">Atendente</option>
                                <option value="chefe">Chefe</option>
                            </select>
                        </label>
                        <label>
                            NÍVEL DE ACESSO
                            <select value={selectedUser?.access_level || ''} disabled aria-label="Nível de acesso">
                                <option value="basico">Básico — pedidos, histórico e leitura de produtos/estoque</option>
                                <option value="completo">Completo — acesso total a todos os módulos</option>
                            </select>
                        </label>
                        <div className="users-field">
                            <span className="users-field-label">STATUS DO USUÁRIO</span>
                            <div className="users-status-buttons">
                                <button
                                    type="button"
                                    className={`users-status-button ${selectedUser?.status === 'Ativo' ? 'is-selected' : ''}`}
                                    disabled
                                    aria-label="Status ativo"
                                >
                                    Ativo
                                </button>
                                <button
                                    type="button"
                                    className={`users-status-button ${selectedUser?.status === 'Inativo' ? 'is-selected' : ''}`}
                                    disabled
                                    aria-label="Status inativo"
                                >
                                    Inativo
                                </button>
                            </div>
                        </div>
                        <div className="users-form-divider" />
                        {isCompleto && (
                            <button
                                type="button"
                                className="users-modal-primary"
                                onClick={() => handleEdit(selectedUser)}
                            >
                                Editar informações
                            </button>
                        )}
                    </div>
                </Modal>

                <div className="users-table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table className="users-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>E-mail</th>
                            <th>Cargo</th>
                            <th>Nível de Acesso</th>
                            <th>Status</th>
                            {isCompleto && <th>Ações</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {visibleUsers.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <button
                                        type="button"
                                        className="users-name-button"
                                        aria-label={`Ver informações de ${user.name}`}
                                        onClick={() => { setSelectedUser(user); setModal('view'); }}
                                    >
                                        {user.name}
                                    </button>
                                </td>
                                <td>{user.email}</td>
                                <td>{labelCargo(user.role)}</td>
                                <td>{labelAcesso(user.access_level)}</td>
                                <td>{user.status}</td>
                                {isCompleto && (
                                    <td className="users-actions">
                                        <button className="users-action-icon" onClick={() => handleEdit(user)} aria-label="Editar">
                                            <Pencil size={16} />
                                        </button>
                                        <button className="users-action-icon" onClick={() => handleDelete(user.id)} aria-label="Apagar">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}

                        {visibleUsers.length === 0 && (
                            <tr>
                                <td className="users-empty" colSpan={isCompleto ? 6 : 5}>Nenhum usuário encontrado</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
            </main>
        </div>
    );
}