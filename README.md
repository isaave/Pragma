# Pragma — House Burguer

Sistema de gestão administrativa para a **House Burguer**: pedidos, histórico, cardápio, estoque, relatórios e gestão de utilizadores, num painel único.

## Sobre o projeto

O Pragma é uma aplicação web (SPA + API) pensada para o dia a dia de uma hamburgueria: a equipa acompanha os pedidos em tempo real, mantém o estoque e o cardápio atualizados, consulta relatórios de vendas e gere os acessos por cargo e nível de permissão.

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | React 19, Vite, TypeScript/JSX, Tailwind CSS, Lucide Icons, Axios |
| Backend | Laravel (PHP), Sanctum (autenticação por token), MySQL |
| Email | Gmail SMTP + filas do Laravel (envio assíncrono) |

## Funcionalidades

- Autenticação com token (login, logout, recuperação de senha por código de 6 dígitos enviado por email)
- CRUD de utilizadores com cargos e níveis de acesso
- Perfil do utilizador com foto, edição de dados e credenciais
- Gestão de pedidos e histórico
- Cadastro de produtos e controle de estoque de ingredientes
- Relatórios
- Sidebar retrátil com atalhos e documentos legais (Termos de Uso e Política de Privacidade)

## Como correr localmente

### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
php artisan queue:work   # necessário para o envio de emails
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend consome a API em `http://127.0.0.1:8000`.

## Estrutura

```
.
├── backend/    # API Laravel (rotas, controllers, models, migrations, mail)
└── frontend/   # Painel React + Vite
```

## Equipa

Isabella Avelina · Pedro-William

## Suporte

ippsolutionpragma@gmail.com
