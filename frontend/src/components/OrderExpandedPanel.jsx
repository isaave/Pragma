import React from 'react';
import { Copy, Utensils } from 'lucide-react';

import { STATUS_META } from '../lib/orderStatus';
import { expandItems } from '../lib/orderRows';
import timeAgo from '../lib/timeAgo';
import { OrderPanelTopBar } from './OrderFloatingCard';
import '../styles/orderFloatingCard.css';
import '../styles/orderExpandedPanel.css';

/** Variação expandida do painel de detalhes do pedido. */
export default function OrderExpandedPanel({
    order,
    copied,
    canEdit,
    canFinalize,
    onCopy,
    onEdit,
    onFinalize,
    onPrint,
    onChangeStatus,
    onDelete,
    onClose,
    onToggleExpand,
    formatPrice,
    orderNumber,
}) {
    const meta = STATUS_META[order.status] || { label: order.status };
    const rows = expandItems(order.items);

    return (
        <div className="order-expanded">
            <OrderPanelTopBar
                onToggleExpand={onToggleExpand}
                onClose={onClose}
                canExpand
                expanded
            />

            <header className="order-expanded__header">
                <div className="order-expanded__identity">
                    <strong className="order-expanded__customer">
                        {order.customer_name || 'Sem nome do cliente'}
                    </strong>
                    <span className="order-expanded__order">{`Ordem ${orderNumber(order.id)}`}</span>
                    <strong className="order-expanded__time">{timeAgo(order.created_at)}</strong>
                </div>
                <span className="order-expanded__badge">{meta.label}</span>
            </header>

            <section className="order-expanded__items" aria-label="Itens do pedido">
                <h3 className="order-expanded__section-title">Itens</h3>
                <div className="order-expanded__table-head">
                    <span>Item</span>
                    <span>Qts</span>
                    <span>Valor</span>
                </div>
                <ul className="order-expanded__list">
                    {rows.map((row) => {
                        const item = row.item || {};
                        const image =
                            item.product?.image ||
                            item.product?.image_url ||
                            item.product?.photo;

                        return (
                            <li key={row.key} className="order-expanded__row">
                                <span className="order-expanded__item">
                                    {image ? (
                                        <img
                                            className="order-expanded__thumb"
                                            src={image}
                                            alt=""
                                        />
                                    ) : (
                                        <span className="order-expanded__thumb order-expanded__thumb--fallback">
                                            <Utensils size={24} aria-hidden="true" />
                                        </span>
                                    )}
                                    <span className="order-expanded__item-name">{row.name}</span>
                                </span>
                                <span className="order-expanded__qty">01</span>
                                <span className="order-expanded__value">
                                    {formatPrice(row.value)}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </section>

            <footer className="order-expanded__footer">
                <button type="button" className="order-expanded__copy" onClick={() => onCopy(order)}>
                    <Copy size={15} aria-hidden="true" />
                    {copied ? 'Copiado!' : 'Copiar pedido'}
                </button>
                <div className="order-expanded__divider" />
                <div className="order-expanded__total">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                </div>
                <div className="order-floating-card__secondary">
                    {canEdit && (
                        <button type="button" onClick={onEdit}>
                            Editar Pedido
                        </button>
                    )}
                    <button type="button" onClick={() => onPrint(order)}>Imprimir</button>
                    <button type="button" onClick={onChangeStatus}>Alterar status</button>
                    {canEdit && (
                        <button
                            type="button"
                            className="order-floating-card__delete"
                            onClick={() => onDelete(order)}
                        >
                            Excluir
                        </button>
                    )}
                </div>
                {canFinalize ? (
                    <button type="button" className="order-floating-card__primary" onClick={() => onFinalize(order)}>
                        Finalizar Pedido
                    </button>
                ) : canEdit ? (
                    <button type="button" className="order-floating-card__primary" onClick={onEdit}>
                        Editar Pedido
                    </button>
                ) : null}
            </footer>
        </div>
    );
}
