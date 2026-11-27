import React from 'react';
import { Pencil } from 'lucide-react';
import StatusBadge from './ui/StatusBadge';

// Uso:
// <StockCard item={item} onOpen={openRestock} onEdit={openEdit} formatDate={formatDate} />

export default function StockCard({ item, onOpen, onEdit, formatDate, highlighted = false, statusTone }) {
    const handleKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen(item);
        }
    };

    return (
        <div
            className={`stock-card${highlighted ? ' stock-card--highlighted' : ''}`}
            id={`ingredient-${item.id}`}
            data-resource-id={`ingredient-${item.id}`}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(item)}
            onKeyDown={handleKeyDown}
        >
            <div className="stock-card-top">
                <strong className="stock-card-name">{item.name}</strong>
                <button
                    type="button"
                    className="stock-card-edit"
                    aria-label="Editar"
                    title="Editar"
                    onClick={(event) => {
                        event.stopPropagation();
                        onEdit(item);
                    }}
                >
                    <Pencil size={12} aria-hidden="true" />
                </button>
            </div>

            {item.stock_status && (
                <div className="stock-card-status">
                    <StatusBadge
                        label={item.stock_status}
                        tone={statusTone ? statusTone(item.stock_status) : 'neutral'}
                    />
                </div>
            )}

            <div className="stock-card-dates">
                <span>Última adição: {formatDate(item.last_purchase_date)}</span>
                <span className={`stock-card-expiry${item.near_expiry ? ' is-near' : ''}`}>
                    Data de validade: {formatDate(item.expiry_date)}
                </span>
            </div>

            <div className="stock-card-footer">
                <span className="stock-card-quantity">{item.quantity} {item.unit}</span>
                <strong className="stock-card-percentage">{item.percentage}% de {item.capacity}</strong>
            </div>
        </div>
    );
}
