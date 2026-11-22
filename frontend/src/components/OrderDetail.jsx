import React from 'react';
import { Copy, Maximize2, Utensils } from 'lucide-react';
import CloseButton from './ui/CloseButton';
import { STATUS_META } from '../lib/orderStatus';

// Uso:
// <OrderDetail order={order} variant="panel" onToggleExpand={...} onClose={...}
//     onEdit={...} onFinalize={...} onChangeStatus={...} onCopy={...} onPrint={...}
//     onDelete={...} onToggleHistory={...} historyOpen={...} copied={...}
//     canEdit={...} canFinalize={...} renderTimeline={renderTimeline}
//     formatDateTime={formatDateTime} formatPrice={formatPrice}
//     orderNumber={orderNumber} getHistory={getHistory} />

export default function OrderDetail({
    order,
    variant = 'panel',
    expanded,
    onToggleExpand,
    onClose,
    onEdit,
    onFinalize,
    onChangeStatus,
    onCopy,
    onPrint,
    onDelete,
    onToggleHistory,
    historyOpen,
    copied,
    canEdit,
    canFinalize,
    renderTimeline,
    formatDateTime,
    formatPrice,
    orderNumber,
    getHistory,
}) {
    const isModal = variant === 'modal';
    const meta = STATUS_META[order.status] || { label: order.status };
    const tone =
        order.status === 'cancelled'
            ? 'danger'
            : order.status === 'not_delivered' || order.status === 'late'
              ? 'warning'
              : 'info';
    const items = order.items || [];

    return (
        <div
            className={`orders-detail-content${isModal ? ' orders-detail-content--modal' : ''}`}
            data-expanded={expanded ? 'true' : 'false'}
        >
            {!isModal && (
                <div className="orders-detail-top">
                    <button
                        type="button"
                        className="orders-detail-expand"
                        aria-label="Expandir"
                        title="Expandir"
                        onClick={onToggleExpand}
                    >
                        <Maximize2 size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                    <CloseButton onClick={onClose} />
                </div>
            )}

            <div className="orders-detail-heading">
                <strong className="orders-detail-name">
                    {order.customer_name || 'Sem nome do cliente'}
                </strong>
                <span className={`orders-badge orders-badge--${tone}`}>{meta.label}</span>
            </div>

            <div className="orders-detail-meta">
                <span className="orders-detail-order">Ordem {orderNumber(order.id)}</span>
                <span className="orders-detail-date">{formatDateTime(order.created_at)}</span>
            </div>

            <div className="orders-detail-section">
                <strong className="orders-detail-label">Itens</strong>
                <div className="orders-detail-table">
                    <div className="orders-detail-table-head">
                        <span>Item</span>
                        <span>Qts</span>
                        <span>Valor</span>
                    </div>
                    <ul className="orders-detail-table-body">
                        {items.map((item) => {
                            const image =
                                item.product?.image ||
                                item.product?.image_url ||
                                item.product?.photo;
                            return (
                                <li key={item.id} className="orders-detail-table-row">
                                    <span className="orders-detail-item">
                                        {image ? (
                                            <img
                                                className="orders-detail-thumb"
                                                src={image}
                                                alt=""
                                            />
                                        ) : (
                                            <span className="orders-detail-thumb orders-detail-thumb--fallback">
                                                <Utensils size={16} aria-hidden="true" />
                                            </span>
                                        )}
                                        <span className="orders-detail-item-info">
                                            <span className="orders-detail-item-name">
                                                {item.product?.name || 'Produto'}
                                            </span>
                                            {(item.addons || []).map((addon) => (
                                                <span
                                                    key={addon.id}
                                                    className="orders-detail-item-note"
                                                >
                                                    {`+ ${addon.quantity}× ${addon.addon?.name || 'Adicional'}`}
                                                </span>
                                            ))}
                                            {item.notes && (
                                                <span className="orders-detail-item-note">
                                                    {`Obs.: ${item.notes}`}
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                    <span className="orders-detail-qty">{item.quantity}</span>
                                    <span className="orders-detail-value">
                                        {formatPrice(item.subtotal)}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

            <div className="orders-detail-total">
                <strong>Total</strong>
                <strong>{formatPrice(order.total)}</strong>
            </div>

            {order.notes && (
                <p className="orders-detail-notes">
                    <strong>Observações do pedido:</strong> {order.notes}
                </p>
            )}

            {historyOpen && (
                <div className="orders-detail-history">{renderTimeline(order)}</div>
            )}

            <div className="orders-detail-actions">
                <button
                    type="button"
                    className="orders-detail-copy"
                    onClick={() => onCopy(order)}
                >
                    <Copy size={14} aria-hidden="true" />
                    {copied ? 'Copiado!' : 'Copiar pedido'}
                </button>

                <div
                    className={`orders-detail-main-actions${isModal ? ' orders-detail-main-actions--modal' : ''}`}
                >
                    {canEdit && (
                        <button
                            type="button"
                            className="orders-detail-edit"
                            onClick={onEdit}
                        >
                            Editar Pedido
                        </button>
                    )}
                    {isModal && canFinalize && (
                        <button
                            type="button"
                            className="orders-detail-finalize"
                            onClick={() => onFinalize(order)}
                        >
                            Finalizar Pedido
                        </button>
                    )}
                </div>
            </div>

            <div className="orders-detail-secondary">
                <button type="button" className="orders-detail-secondary-button" onClick={() => onPrint(order)}>
                    Imprimir
                </button>
                <button type="button" className="orders-detail-secondary-button" onClick={onChangeStatus}>
                    Alterar status
                </button>
                <button type="button" className="orders-detail-secondary-button" onClick={onToggleHistory}>
                    {`Histórico (${getHistory(order).length})`}
                </button>
                {canEdit && (
                    <button
                        type="button"
                        className="orders-detail-secondary-button orders-detail-secondary-button--danger"
                        onClick={() => onDelete(order)}
                    >
                        Excluir
                    </button>
                )}
            </div>
        </div>
    );
}
