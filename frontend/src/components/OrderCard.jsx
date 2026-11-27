import React from 'react';
import { formatPrice, orderNumber } from '../lib/orderStatus';
import timeAgo from '../lib/timeAgo';
import { expandItems } from '../lib/orderRows';

// Uso:
// <OrderCard order={order} selected={selected} onOpen={openDetail}
//     onFinalize={finalizeOrder} canFinalize={canFinalize(order)}
//     statusLabel={meta.label} tone="info" />

export default function OrderCard({
    order,
    selected = false,
    onOpen,
    onFinalize,
    canFinalize,
    statusLabel,
    tone = 'info',
    highlighted = false,
}) {
    const handleKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen(order);
        }
    };

    const rows = expandItems(order.items);
    const extraRows = Math.max(0, rows.length - 4);

    return (
        <div
            className={`orders-card${selected ? ' orders-card--selected' : ''}${highlighted ? ' orders-card--highlighted' : ''}`}
            id={`order-${order.id}`}
            data-resource-id={`order-${order.id}`}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(order)}
            onKeyDown={handleKeyDown}
        >
            <div className="orders-card-top">
                <div className="orders-card-heading">
                    <strong className="orders-card-name">
                        {order.customer_name || 'Sem nome do cliente'}
                    </strong>
                    <span className="orders-card-order">Ordem {orderNumber(order.id)}</span>
                    <span className="orders-card-time">{timeAgo(order.created_at)}</span>
                </div>
                <span className={`orders-badge orders-badge--${tone}`}>{statusLabel}</span>
            </div>

            <div className="orders-card-table">
                <div className="orders-card-table-head">
                    <span>Itens</span>
                    <span>Qts</span>
                    <span>Valor</span>
                </div>
                <ul className="orders-card-table-body">
                    {rows.slice(0, 4).map((row) => (
                        <li key={row.key} className="orders-card-table-row">
                            <span className="orders-card-item-name">{row.name}</span>
                            <span className="orders-card-qty">01</span>
                            <span className="orders-card-value">{formatPrice(row.value)}</span>
                        </li>
                    ))}
                </ul>
                {extraRows > 0 && (
                    <p className="orders-card-more">{`+ ${extraRows} item(ns)`}</p>
                )}
            </div>

            <div className="orders-card-total">
                <strong>Total</strong>
                <strong>{formatPrice(order.total)}</strong>
            </div>

            {canFinalize && (
                <button
                    type="button"
                    className="orders-card-finalize"
                    onClick={(event) => {
                        event.stopPropagation();
                        onFinalize(order);
                    }}
                >
                    Finalizar
                </button>
            )}
        </div>
    );
}
