import React from 'react';
import { ArrowLeft, Copy, Maximize2, Minimize2, X } from 'lucide-react';

import { STATUS_META } from '../lib/orderStatus';
import { expandItems } from '../lib/orderRows';
import timeAgo from '../lib/timeAgo';
import '../styles/orderFloatingCard.css';

/** Barra circular reutilizada em todos os estados do painel de pedidos. */
export function OrderPanelTopBar({ onToggleExpand, onClose, canExpand = false, onBack, expanded = false }) {
    return (
        <div className="order-floating-card__top-bar">
            {onBack ? (
                <button
                    type="button"
                    className="order-floating-card__circle"
                    onClick={onBack}
                    aria-label="Voltar"
                    title="Voltar"
                >
                    <ArrowLeft size={16} aria-hidden="true" />
                </button>
            ) : canExpand ? (
                <button
                    type="button"
                    className="order-floating-card__circle"
                    onClick={onToggleExpand}
                    aria-label={expanded ? 'Recolher pedido' : 'Expandir pedido'}
                    title={expanded ? 'Recolher' : 'Expandir'}
                >
                    {expanded ? (
                        <Minimize2 size={16} aria-hidden="true" />
                    ) : (
                        <Maximize2 size={16} aria-hidden="true" />
                    )}
                </button>
            ) : (
                <span className="order-floating-card__circle order-floating-card__circle--placeholder" aria-hidden="true" />
            )}
            <button
                type="button"
                className="order-floating-card__circle"
                onClick={onClose}
                aria-label="Fechar painel"
                title="Fechar"
            >
                <X size={16} aria-hidden="true" />
            </button>
        </div>
    );
}

/** Painel lateral de detalhes do pedido, conforme a especificação visual. */
export default function OrderFloatingCard({
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
        <div className="order-floating-card">
            <OrderPanelTopBar onToggleExpand={onToggleExpand} onClose={onClose} canExpand />

            <header className="order-floating-card__header">
                <div className="order-floating-card__title-row">
                    <strong className="order-floating-card__customer">
                        {order.customer_name || 'Sem nome do cliente'}
                    </strong>
                    <span className="order-floating-card__badge">{meta.label}</span>
                </div>
                <span className="order-floating-card__order">{`Ordem ${orderNumber(order.id)}`}</span>
                <strong className="order-floating-card__time">{timeAgo(order.created_at)}</strong>
            </header>

            <section className="order-floating-card__items" aria-label="Itens do pedido">
                <div className="order-floating-card__items-head">
                    <span>Itens</span>
                    <span>Qts</span>
                    <span>Valor</span>
                </div>
                <ul className="order-floating-card__items-list">
                    {rows.map((row) => (
                        <li key={row.key} className="order-floating-card__item-row">
                            <span className="order-floating-card__item-name">{row.name}</span>
                            <span className="order-floating-card__item-qty">01</span>
                            <span className="order-floating-card__item-value">
                                {formatPrice(row.value)}
                            </span>
                        </li>
                    ))}
                </ul>
            </section>

            <footer className="order-floating-card__footer">
                <button type="button" className="order-floating-card__copy" onClick={() => onCopy(order)}>
                    <Copy size={16} aria-hidden="true" />
                    {copied ? 'Copiado!' : 'Copiar pedido'}
                </button>
                <div className="order-floating-card__divider" />
                <div className="order-floating-card__total">
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
