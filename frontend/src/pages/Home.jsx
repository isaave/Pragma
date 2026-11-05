import React from 'react';

export default function Home() {
    const storedUser = localStorage.getItem('pragma_user');
    const user = storedUser ? JSON.parse(storedUser) : null;

    return (
        <div>
            <h1>Bem-vindo ao Pragma</h1>
            <p>Olá, {user?.name || 'utilizador'}.</p>
            <p>Use o menu para gerir utilizadores ou editar o teu perfil.</p>
        </div>
    );
}