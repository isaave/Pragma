import React from 'react';
import { Maximize2, Trash2 } from 'lucide-react';
import CloseButton from './ui/CloseButton';

// Uso:
// <ProductDetail product={product} variant="panel" onToggleExpand={...} onClose={...}
//     onEdit={...} onDelete={...} formatPrice={formatPrice} categoryLabel={categoryLabel} />

export default function ProductDetail({
    product,
    variant = 'panel',
    expanded,
    onToggleExpand,
    onClose,
    onEdit,
    onDelete,
    formatPrice,
    categoryLabel,
    canEdit = true,
    canDelete = true,
}) {
    const isModal = variant === 'modal';

    const statusLabel =
        product.status === 'ativo'
            ? product.available
                ? 'Disponível'
                : 'Indisponível'
            : product.status === 'inativo'
                ? 'Inativo'
                : product.status === 'desenvolvimento'
                    ? 'Em desenvolvimento'
                    : product.status;

    const statusTone =
        product.status === 'inativo'
            ? 'danger'
            : product.status === 'desenvolvimento' || (product.status === 'ativo' && !product.available)
                ? 'warning'
                : product.status === 'ativo' && product.available
                    ? 'success'
                    : '';

    const recipe = product.recipe || [];

    return (
        <div
            className={`products-detail-content${isModal ? ' products-detail-content--modal' : ''}`}
            data-expanded={expanded ? 'true' : 'false'}
        >
            {!isModal && (
                <div className="products-detail-top">
                    <button
                        type="button"
                        className="products-detail-expand"
                        aria-label="Expandir"
                        title="Expandir"
                        onClick={onToggleExpand}
                    >
                        <Maximize2 size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                    <CloseButton onClick={onClose} />
                </div>
            )}

            {!isModal && <strong className="products-detail-name">{product.name}</strong>}

            <div className="products-card-badges products-detail-badges">
                <span className={`products-badge${statusTone ? ` products-badge--${statusTone}` : ''}`}>
                    {statusLabel}
                </span>
                <span className="products-badge">{categoryLabel(product.category)}</span>
            </div>

            <div className="products-detail-section">
                <div className="products-detail-table">
                    <div className="products-detail-table-head">
                        <span>Ingredientes</span>
                        <span>Qts</span>
                    </div>
                    {recipe.length > 0 ? (
                        <ul className="products-detail-table-body">
                            {recipe.map((r) => (
                                <li key={r.ingredient_id} className="products-detail-table-row">
                                    <span className="products-detail-ingredient">{r.name}</span>
                                    <span className="products-detail-qty">
                                        {`${r.quantity}${r.unit !== 'unidades' ? ' ' + r.unit : ''}`}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="products-detail-empty">Sem ingredientes cadastrados.</p>
                    )}
                </div>
            </div>

            <div className="products-detail-section">
                <strong className="products-detail-label">Observações</strong>
                <p className="products-detail-notes">{product.notes || 'Nenhuma'}</p>
            </div>

            <div className="products-detail-divider" />

            <div className="products-detail-value">
                <strong className="products-detail-value-label">Valor</strong>
                <span className="products-detail-value-amount">{formatPrice(product.price)}</span>
            </div>

            {(canEdit || canDelete) && (
                <div className="products-detail-actions">
                    {canEdit && (
                        <button type="button" className="products-detail-edit" onClick={onEdit}>
                            Editar
                        </button>
                    )}
                    {canDelete && (
                        <button type="button" className="products-detail-delete" onClick={onDelete}>
                            <Trash2 size={14} aria-hidden="true" />
                            Excluir
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
