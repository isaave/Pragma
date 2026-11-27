import React, { useContext } from 'react';

// Ações do topo (sino/perfil) injetadas pelo App nas telas com cabeçalho inline.
// eslint-disable-next-line react/only-export-components
/** @type {React.Context<React.ReactNode>} */
export const HeaderActionsContext = React.createContext(null);

// O ProfileButton tem margin-bottom/align-self próprios para a barra antiga;
// dentro do cabeçalho ele precisa ficar alinhado ao título e ao sino.
const INJECTED_CSS = `
.page-header-actions > button {
    align-self: center !important;
    margin-bottom: 0 !important;
}
`;

export default function PageHeader({ title, subtitle }) {
    const actions = useContext(HeaderActionsContext);

    return (
        <header className="page-header" style={actions ? { flexWrap: 'nowrap' } : undefined}>
            <div className="page-header-text" style={actions ? { flex: '1 1 auto' } : undefined}>
                <h1 className="page-header-title" style={actions ? { overflowWrap: 'anywhere' } : undefined}>{title}</h1>
                <p className="page-header-subtitle" style={actions ? { overflowWrap: 'anywhere' } : undefined}>{subtitle}</p>
            </div>
            {actions && (
                <div className="page-header-actions">
                    <style>{INJECTED_CSS}</style>
                    {actions}
                </div>
            )}
        </header>
    );
}
