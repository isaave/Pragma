import React from 'react';
import { formatPrice, orderNumber } from '../lib/orderStatus';

// Uso:
// <OrderCard order={order} selected={selected} onOpen={openDetail}
//     onFinalize={finalizeOrder} canFinalize={canFinalize(order)}
//     statusLabel={meta.label} tone="info" />

const timeAgo = (value) => {
    const created = new Date(value).getTime();
    const minutes = Math.floor((Date.now() - created) / 60000);
    if (!Number.isFinite(minutes) || minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `Há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Há ${hours} h`;
    return `Há ${Math.floor(hours / 24)} d`;
};

export default function OrderCard({
    order,
    selected = false,
    onOpen,
    onFinalize,
    canFinalize,
    statusLabel,
    tone = 'info',
}) {
    const handleKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen(order);
        }
    };

    const items = order.items || [];
    const extraItems = Math.max(0, items.length - 4);

    return (
        <div
            className={`orders-card${selected ? ' orders-card--selected' : ''}`}
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
                    {items.slice(0, 4).map((item) => (
                        <li key={item.id} className="orders-card-table-row">
                            <span className="orders-card-item-name">
                                {item.product?.name || 'Produto'}
                            </span>
                            <span className="orders-card-qty">
                                {String(item.quantity).padStart(2, '0')}
                            </span>
                            <span className="orders-card-value">{formatPrice(item.subtotal)}</span>
                        </li>
                    ))}
                </ul>
                {extraItems > 0 && (
                    <p className="orders-card-more">{`+ ${extraItems} item(ns)`}</p>
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
