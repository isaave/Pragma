import React from 'react';
import { ChevronDown, Download, Plus, Search, SlidersHorizontal } from 'lucide-react';

// Toolbar de ações alinhada ao SegmentedControl: mesma altura, borda e raio.
const COLORS = {
    border: '#03071e',
    icon: '#03071e',
    hoverBackground: 'rgba(3, 7, 30, 0.06)',
    focusRing: '#6366f1',
};

const SIZES = {
    height: '30px',
    borderRadius: '999px',
    borderWidth: '1px',
    containerPadding: '1px',
    buttonSize: '26px',
    buttonGap: '4px',
    iconSize: 17,
    iconStrokeWidth: 1.75,
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
    outline-offset: 0;
}
[data-table-toolbar] summary {
    list-style: none;
}
[data-table-toolbar] summary::-webkit-details-marker {
    display: none;
}
`;

const controlStyle = {
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
    fontFamily: FONT_FAMILY,
    listStyle: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
};

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
        flexShrink: 0,
        maxWidth: '100%',
    },
    exportWrap: {
        position: 'relative',
        display: 'inline-flex',
        flex: '0 0 auto',
    },
    exportSummary: {
        ...controlStyle,
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

export default function TableToolbar({ onAdd, onFilter, onSearch, exportOptions = [], ariaLabel = 'Ações', style }) {
    const actions = [];
    if (onAdd) actions.push({ key: 'add', label: 'Adicionar', Icon: Plus, onClick: onAdd });
    if (onFilter) actions.push({ key: 'filter', label: 'Filtrar', Icon: SlidersHorizontal, onClick: onFilter });
    if (onSearch) actions.push({ key: 'search', label: 'Pesquisar', Icon: Search, onClick: onSearch });

    if (actions.length === 0 && exportOptions.length === 0) {
        return null;
    }

    return (
        <div data-table-toolbar="" role="toolbar" aria-label={ariaLabel} style={{ ...styles.container, ...style }}>
            <style>{INJECTED_CSS}</style>
            {actions.map(({ key, label, Icon, onClick }) => (
                <button
                    key={key}
                    type="button"
                    aria-label={label}
                    title={label}
                    onClick={onClick}
                    style={controlStyle}
                >
                    <Icon size={SIZES.iconSize} strokeWidth={SIZES.iconStrokeWidth} aria-hidden="true" />
                </button>
            ))}
            {exportOptions.length > 0 && (
                <details style={styles.exportWrap}>
                    <summary style={styles.exportSummary} aria-label="Exportar tudo" title="Exportar tudo">
                        <Download size={SIZES.iconSize} strokeWidth={SIZES.iconStrokeWidth} aria-hidden="true" />
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
