import React from 'react';
import { ChevronDown, Download, LayoutGrid, List, Plus, Search, SlidersHorizontal, Table2 } from 'lucide-react';

// Toolbar de ações alinhada ao SegmentedControl: mesma altura, borda e raio.
const COLORS = {
    border: 'var(--control-border, #03071e)',
    // Mesma lógica do SegmentedControl: marinho no claro, branco no escuro.
    icon: 'var(--table-toolbar-icon, #03071e)',
    surface: 'var(--table-toolbar-bg, var(--card-bg, #ffffff))',
    hoverBackground: 'var(--table-toolbar-hover, rgba(3, 7, 30, 0.06))',
    divider: 'var(--table-toolbar-divider, var(--control-border, #03071e))',
    focusRing: '#6366f1',
};

// O container ajusta essas variáveis quando a linha de controles fica estreita.
const SIZES = {
    height: '30px',
    borderRadius: '999px',
    borderWidth: '1px',
    containerPadding: 'var(--tt-padding, 1px)',
    buttonSize: 'var(--tt-button-size, 26px)',
    buttonHeight: 'var(--tt-button-height, 26px)',
    buttonGap: 'var(--tt-gap, 4px)',
    iconSize: 17,
    iconStrokeWidth: 1.75,
    actionPaddingX: '10px',
    labelSize: '11.5px',
    dividerHeight: '18px',
    focusRingWidth: '2px',
};

const FONT_FAMILY = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const INJECTED_CSS = `
[data-table-toolbar] button:hover,
[data-table-toolbar] summary:hover {
    background: ${COLORS.hoverBackground};
}
[data-table-toolbar] button:focus-visible,
[data-table-toolbar] summary:focus-visible {
    outline: ${SIZES.focusRingWidth} solid ${COLORS.focusRing};
    outline-offset: -1px;
}
[data-table-toolbar] [data-view-mode][aria-pressed='true'] {
    background: var(--table-toolbar-selected, var(--control-border, #03071e));
    color: var(--table-toolbar-selected-icon, var(--card-bg, #ffffff));
}
[data-table-toolbar] .tt-action,
[data-table-toolbar] .tt-export-summary {
    width: var(--tt-action-width, auto);
    padding: var(--tt-action-padding, 0 ${SIZES.actionPaddingX});
    gap: 6px;
    border-radius: 999px;
}
[data-table-toolbar] .tt-label {
    font-size: ${SIZES.labelSize};
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
}
[data-table-toolbar] .tt-divider {
    flex: 0 0 auto;
    width: 1px;
    height: ${SIZES.dividerHeight};
    margin: 0 2px;
    border-radius: 1px;
    background: ${COLORS.divider};
    opacity: 0.55;
}
[data-table-toolbar] summary {
    list-style: none;
}
[data-table-toolbar] summary::-webkit-details-marker {
    display: none;
}
@media (max-width: 900px) {
    [data-table-toolbar] {
        --tt-action-width: var(--tt-button-size, 26px);
        --tt-action-padding: 0;
    }
    [data-table-toolbar] .tt-label,
    [data-table-toolbar] details > summary svg:last-child {
        display: none;
    }
}
@media (max-width: 600px) {
    [data-table-toolbar] {
        --tt-gap: 2px;
        --tt-padding: 0px;
        --tt-button-size: 24px;
        --tt-button-height: 24px;
    }
}
`;

// Seleção sem o azul acinzentado: usa a mesma cor do contorno da toolbar,
// com o ícone invertido para manter contraste (marinho/claro e branco/escuro).
const selectedControlStyle = {
    background: 'var(--table-toolbar-selected, var(--control-border, #03071e))',
    color: 'var(--table-toolbar-selected-icon, var(--card-bg, #ffffff))',
};

const controlStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    boxSizing: 'border-box',
    width: SIZES.buttonSize,
    height: SIZES.buttonHeight,
    margin: 0,
    padding: 0,
    border: 'none',
    background: 'transparent',
    color: COLORS.icon,
    borderRadius: '50%',
    cursor: 'pointer',
    fontFamily: FONT_FAMILY,
    listStyle: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
};

const actionControlStyle = {
    ...controlStyle,
    width: 'var(--tt-action-width, auto)',
    height: SIZES.buttonHeight,
    padding: 'var(--tt-action-padding, 0 10px)',
    gap: '6px',
    borderRadius: '999px',
};

const dividerStyle = {
    flex: '0 0 auto',
    width: '1px',
    height: SIZES.dividerHeight,
    margin: '0 2px',
    background: COLORS.divider,
    opacity: 0.55,
};

const styles = {
    container: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: SIZES.buttonGap,
        boxSizing: 'border-box',
        height: SIZES.height,
        padding: SIZES.containerPadding,
        background: COLORS.surface,
        border: `${SIZES.borderWidth} solid ${COLORS.border}`,
        borderRadius: SIZES.borderRadius,
        fontFamily: FONT_FAMILY,
        flexShrink: 0,
        maxWidth: '100%',
    },
    exportWrap: {
        position: 'relative',
        display: 'inline-flex',
        flex: '0 0 auto',
    },
    exportSummary: {
        ...actionControlStyle,
    },
    exportMenu: {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        zIndex: 70,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        minWidth: '104px',
        maxWidth: 'calc(100vw - 32px)',
        padding: '6px',
        boxSizing: 'border-box',
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        boxShadow: '0 14px 36px rgba(0, 0, 0, 0.28)',
    },
    exportOption: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        boxSizing: 'border-box',
        width: '100%',
        padding: '6px 10px',
        border: 'none',
        borderRadius: '8px',
        background: 'transparent',
        color: 'var(--text-primary)',
        fontFamily: FONT_FAMILY,
        fontSize: '12px',
        fontWeight: 600,
        textAlign: 'left',
        cursor: 'pointer',
    },
};

export default function TableToolbar({
    onAdd,
    onFilter,
    onSearch,
    exportOptions = [],
    viewModes = [],
    viewMode,
    onViewModeChange,
    ariaLabel = 'Ações',
    style,
}) {
    const actions = [];
    if (onAdd) actions.push({ key: 'add', label: 'Adicionar', Icon: Plus, onClick: onAdd });
    if (onFilter) actions.push({ key: 'filter', label: 'Filtrar', Icon: SlidersHorizontal, onClick: onFilter });
    if (onSearch) actions.push({ key: 'search', label: 'Buscar', Icon: Search, onClick: onSearch });

    const viewIcons = { cards: LayoutGrid, card: LayoutGrid, grid: LayoutGrid, list: List, table: Table2 };
    const viewButtons = viewModes.map((mode) => {
        if (typeof mode === 'string') {
            return { value: mode, label: mode, Icon: viewIcons[mode] || LayoutGrid };
        }
        return { ...mode, Icon: mode.Icon || viewIcons[mode.value] || LayoutGrid };
    });

    if (actions.length === 0 && exportOptions.length === 0 && viewButtons.length === 0) {
        return null;
    }

    return (
        <div data-table-toolbar="" role="toolbar" aria-label={ariaLabel} style={{ ...styles.container, ...style }}>
            <style>{INJECTED_CSS}</style>
            {viewButtons.map(({ value, label, Icon }) => (
                <button
                    key={value}
                    type="button"
                    data-view-mode=""
                    aria-label={label}
                    title={label}
                    aria-pressed={viewMode === value}
                    onClick={() => onViewModeChange?.(value)}
                    style={viewMode === value ? { ...controlStyle, ...selectedControlStyle } : controlStyle}
                >
                    <Icon size={SIZES.iconSize} strokeWidth={SIZES.iconStrokeWidth} aria-hidden="true" />
                </button>
            ))}
            {viewButtons.length > 0 && actions.length > 0 && (
                <span className="tt-divider" style={dividerStyle} aria-hidden="true" />
            )}
            {actions.map(({ key, label, Icon, onClick }) => (
                <button
                    key={key}
                    type="button"
                    className="tt-action"
                    aria-label={label}
                    title={label}
                    onClick={onClick}
                    style={actionControlStyle}
                >
                    <Icon size={SIZES.iconSize} strokeWidth={SIZES.iconStrokeWidth} aria-hidden="true" />
                    <span className="tt-label">{label}</span>
                </button>
            ))}
            {exportOptions.length > 0 && (viewButtons.length > 0 || actions.length > 0) && (
                <span className="tt-divider" style={dividerStyle} aria-hidden="true" />
            )}
            {exportOptions.length > 0 && (
                <details style={styles.exportWrap}>
                    <summary
                        className="tt-action tt-export-summary"
                        style={styles.exportSummary}
                        aria-label="Exportar tudo"
                        title="Exportar tudo"
                    >
                        <Download size={SIZES.iconSize} strokeWidth={SIZES.iconStrokeWidth} aria-hidden="true" />
                        <span className="tt-label">Exportar</span>
                        <ChevronDown size={11} strokeWidth={SIZES.iconStrokeWidth} aria-hidden="true" />
                    </summary>
                    <div style={styles.exportMenu}>
                        {exportOptions.map((option) => (
                            <button
                                key={option.label}
                                type="button"
                                style={styles.exportOption}
                                disabled={option.disabled}
                                onClick={(event) => {
                                    event.currentTarget.closest('details').open = false;
                                    option.onClick?.();
                                }}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
}
