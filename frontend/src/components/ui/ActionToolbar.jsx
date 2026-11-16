import React from 'react';
import { Plus, SlidersHorizontal, Search } from 'lucide-react';

// Uso:
// <ActionToolbar
//     onAdd={() => setModalAberto(true)}
//     onFilter={() => setPainelFiltros(true)}
//     onSearch={() => setBuscaVisivel(true)}
// />

// TODO: confirmar no Dev Mode do Figma (valores aproximados)
// Altura, borda e cor de ícone/texto iguais às do SegmentedControl,
// para os dois ficarem alinhados lado a lado.
const COLORS = {
    border: '#03071e',
    icon: '#03071e',
    hoverBackground: 'rgba(3, 7, 30, 0.06)',
    focusRing: '#6366f1',
};

// TODO: confirmar no Dev Mode do Figma (valores aproximados)
const SIZES = {
    height: '30px',
    borderRadius: '999px',
    borderWidth: '1px',
    containerPadding: '1px',
    buttonSize: '26px',
    buttonGap: '4px',
    iconSize: 17,
    iconStrokeWidth: 1.75,
    transition: 'background-color 150ms ease',
    focusRingWidth: '2px',
    focusRingOffset: '0px',
};

const FONT_FAMILY = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// :hover e :focus-visible não existem em estilo inline.
const INJECTED_CSS = `
[data-action-toolbar] button:hover {
    background: ${COLORS.hoverBackground};
}
[data-action-toolbar] button:focus-visible {
    outline: ${SIZES.focusRingWidth} solid ${COLORS.focusRing};
    outline-offset: ${SIZES.focusRingOffset};
}
`;

const styles = {
    container: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: SIZES.buttonGap,
        boxSizing: 'border-box',
        height: SIZES.height,
        padding: SIZES.containerPadding,
        background: 'transparent',
        border: `${SIZES.borderWidth} solid ${COLORS.border}`,
        borderRadius: SIZES.borderRadius,
        fontFamily: FONT_FAMILY,
    },
    button: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
        boxSizing: 'border-box',
        width: SIZES.buttonSize,
        height: SIZES.buttonSize,
        margin: 0,
        padding: 0,
        border: 'none',
        background: 'transparent',
        color: COLORS.icon,
        borderRadius: '50%',
        cursor: 'pointer',
        transition: SIZES.transition,
    },
};

export default function ActionToolbar({ onAdd, onFilter, onSearch, style }) {
    const actions = [];
    if (onAdd) {
        actions.push({ key: 'add', label: 'Adicionar', Icon: Plus, onClick: onAdd });
    }
    if (onFilter) {
        actions.push({ key: 'filter', label: 'Filtrar', Icon: SlidersHorizontal, onClick: onFilter });
    }
    if (onSearch) {
        actions.push({ key: 'search', label: 'Pesquisar', Icon: Search, onClick: onSearch });
    }

    if (actions.length === 0) {
        return null;
    }

    return (
        <div data-action-toolbar="" style={{ ...styles.container, ...style }}>
            <style>{INJECTED_CSS}</style>
            {actions.map(({ key, label, Icon, onClick }) => (
                <button
                    key={key}
                    type="button"
                    aria-label={label}
                    title={label}
                    onClick={onClick}
                    style={styles.button}
                >
                    <Icon
                        size={SIZES.iconSize}
                        strokeWidth={SIZES.iconStrokeWidth}
                        aria-hidden="true"
                    />
                </button>
            ))}
        </div>
    );
}
