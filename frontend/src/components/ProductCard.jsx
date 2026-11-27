import React from 'react';
import { Pencil } from 'lucide-react';

// Uso:
// <ProductCard product={product} onOpen={openDetail} onEdit={openEdit} categoryLabel={categoryLabel} />

const formatCardPrice = (value) =>
    Number(value || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });

export default function ProductCard({ product, onOpen, onEdit, categoryLabel, selected = false }) {
    const handleKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen(product);
        }
    };

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
    const summary = recipe.length > 0
        ? recipe.map((r) => `${r.quantity} ${r.unit} ${r.name}`).join(', ')
        : (product.notes || '');

    return (
        <div
            className={`products-card${selected ? ' products-card--selected' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(product)}
            onKeyDown={handleKeyDown}
        >
            <div className="products-card-top">
                <strong className="products-card-name">{product.name}</strong>
                <button
                    type="button"
                    className="products-card-edit"
                    aria-label="Editar"
                    title="Editar"
                    onClick={(event) => {
                        event.stopPropagation();
                        onEdit(product);
                    }}
                >
                    <Pencil size={12} aria-hidden="true" />
                </button>
            </div>

            <div className="products-card-badges">
                <span className={`products-badge${statusTone ? ` products-badge--${statusTone}` : ''}`}>
                    {statusLabel}
                </span>
                <span className="products-badge">{categoryLabel(product.category)}</span>
            </div>

            {summary && <p className="products-card-summary">{summary}</p>}

            <strong className="products-card-price">{formatCardPrice(product.price)}</strong>
        </div>
    );
}
