import React from 'react';

// Uso:
// <SegmentedControl
//     ariaLabel="Filtrar pedidos"
//     options={[
//         { value: 'todos', label: 'Todos' },
//         { value: 'novos', label: 'Novos' },
//         { value: 'completo', label: 'Completo' },
//     ]}
//     value={filtro}
//     onChange={setFiltro}
// />

// TODO: confirmar no Dev Mode do Figma (valores aproximados)
const COLORS = {
    border: 'var(--control-border, #03071e)', // branco no escuro, marinho no claro
    selectedBackground: 'var(--segmented-selected-bg, #03071e)', // marinho no claro, azul claro no escuro
    selectedText: '#ffffff',
    idleText: 'var(--segmented-idle-text, #312e81)', // roxo no claro, azul do subtítulo no escuro
    focusRing: '#6366f1',
};

// TODO: confirmar no Dev Mode do Figma (valores aproximados)
const SIZES = {
    height: '30px',
    borderRadius: '999px',
    borderWidth: '1px',
    containerPadding: '3px',
    optionPaddingX: '16px',
    optionGap: '6px',
    fontSize: '12.5px',
    selectedFontWeight: 700,
    idleFontWeight: 500,
    transition: 'background-color 150ms ease',
    focusRingWidth: '2px',
    focusRingOffset: '0px',
};

const FONT_FAMILY = "'Helvetica Neue', Helvetica, Arial, sans-serif";

// Esconde a barra de rolagem (WebKit) e garante outline só no teclado.
// Não dá para declarar ::-webkit-scrollbar nem :focus-visible via style inline.
const INJECTED_CSS = `
[data-segmented-control]::-webkit-scrollbar { display: none; }
[data-segmented-control] button:focus-visible {
    outline: ${SIZES.focusRingWidth} solid ${COLORS.focusRing};
    outline-offset: ${SIZES.focusRingOffset};
}
`;

const styles = {
    container: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: SIZES.optionGap,
        boxSizing: 'border-box',
        height: SIZES.height,
        maxWidth: '100%',
        padding: SIZES.containerPadding,
        background: 'transparent',
        border: `${SIZES.borderWidth} solid ${COLORS.border}`,
        borderRadius: SIZES.borderRadius,
        overflowX: 'auto',
        overflowY: 'hidden',
        flexWrap: 'nowrap',
        whiteSpace: 'nowrap',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // Edge/IE antigos
        WebkitOverflowScrolling: 'touch',
        fontFamily: FONT_FAMILY,
    },
    option: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
        boxSizing: 'border-box',
        height: '100%',
        margin: 0,
        padding: `0 ${SIZES.optionPaddingX}`,
        border: 'none',
        background: 'transparent',
        color: COLORS.idleText,
        borderRadius: SIZES.borderRadius,
        fontFamily: FONT_FAMILY,
        fontSize: SIZES.fontSize,
        fontWeight: SIZES.idleFontWeight,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        transition: SIZES.transition,
    },
    optionSelected: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: '0 0 auto',
        boxSizing: 'border-box',
        height: '100%',
        margin: 0,
        padding: `0 ${SIZES.optionPaddingX}`,
        border: 'none',
        background: COLORS.selectedBackground,
        color: COLORS.selectedText,
        borderRadius: SIZES.borderRadius,
        fontFamily: FONT_FAMILY,
        fontSize: SIZES.fontSize,
        fontWeight: SIZES.selectedFontWeight,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        transition: SIZES.transition,
    },
};

export default function SegmentedControl({
    options = [],
    value,
    onChange,
    ariaLabel,
    style,
}) {
    return (
        <div
            role="group"
            aria-label={ariaLabel}
            data-segmented-control=""
            style={{ ...styles.container, ...style }}
        >
            <style>{INJECTED_CSS}</style>
            {options.map((option) => {
                const selected = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                            if (!selected && onChange) {
                                onChange(option.value);
                            }
                        }}
                        style={selected ? styles.optionSelected : styles.option}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
