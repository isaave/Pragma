import React from 'react';
import { Copy, Maximize2, Minimize2, Trash2, Utensils } from 'lucide-react';
import CloseButton from './ui/CloseButton';
import { STATUS_META } from '../lib/orderStatus';
import timeAgo from '../lib/timeAgo';
import { expandItems } from '../lib/orderRows';

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
    const isFullscreen = variant === 'fullscreen';
    const isModal = variant === 'modal' || isFullscreen;
    const meta = STATUS_META[order.status] || { label: order.status };
    const tone =
        order.status === 'cancelled'
            ? 'danger'
            : order.status === 'not_delivered' || order.status === 'late'
              ? 'warning'
              : 'info';
    const rows = expandItems(order.items);

    const statusNode = isModal ? (
        <span className={`orders-badge orders-badge--${tone}`}>{meta.label}</span>
    ) : (
        <span className="orders-detail-status">{meta.label}</span>
    );

    const totalNode = (
        <div className="orders-detail-total">
            <strong>Total</strong>
            <strong>{formatPrice(order.total)}</strong>
        </div>
    );

    const notesNode = order.notes ? (
        <p className="orders-detail-notes">
            <strong>Observações do pedido:</strong> {order.notes}
        </p>
    ) : null;

    const historyNode = historyOpen ? (
        <div className="orders-detail-history">{renderTimeline(order)}</div>
    ) : null;

    const copyButton = (
        <button
            type="button"
            className={`orders-detail-copy${isModal ? '' : ' orders-detail-copy--panel'}`}
            onClick={() => onCopy(order)}
        >
            <Copy size={14} aria-hidden="true" />
            {copied ? 'Copiado!' : 'Copiar pedido'}
        </button>
    );

    const editButton = canEdit ? (
        <button
            type="button"
            className={`orders-detail-edit${isModal ? '' : ' orders-detail-edit--panel'}`}
            onClick={onEdit}
        >
            Editar Pedido
        </button>
    ) : null;

    const finalizeButton = isModal && canFinalize ? (
        <button
            type="button"
            className="orders-detail-finalize"
            onClick={() => onFinalize(order)}
        >
            Finalizar Pedido
        </button>
    ) : null;

    const secondaryNode = (
        <div className="orders-detail-secondary">
            {canEdit && (
                <button
                    type="button"
                    className="orders-detail-delete"
                    aria-label="Excluir pedido"
                    title="Excluir pedido"
                    onClick={() => onDelete(order)}
                >
                    <Trash2 size={14} aria-hidden="true" />
                </button>
            )}
            <button type="button" className="orders-detail-secondary-button" onClick={() => onPrint(order)}>
                Imprimir
            </button>
            <button type="button" className="orders-detail-secondary-button" onClick={onChangeStatus}>
                Alterar status
            </button>
            <button type="button" className="orders-detail-secondary-button" onClick={onToggleHistory}>
                {`Histórico (${getHistory(order).length})`}
            </button>
        </div>
    );

    return (
        <div
            className={`orders-detail-content${isModal ? ' orders-detail-content--modal' : ' orders-detail-content--panel'}`}
            data-expanded={expanded ? 'true' : 'false'}
        >
            {(!isModal || isFullscreen) && (
                <div className="orders-detail-top">
                    <button
                        type="button"
                        className="orders-detail-expand"
                        aria-label={isFullscreen ? 'Recolher' : 'Expandir'}
                        title={isFullscreen ? 'Recolher' : 'Expandir'}
                        onClick={onToggleExpand}
                    >
                        {isFullscreen ? (
                            <Minimize2 size={16} strokeWidth={2} aria-hidden="true" />
                        ) : (
                            <Maximize2 size={16} strokeWidth={2} aria-hidden="true" />
                        )}
                    </button>
                    <CloseButton onClick={onClose} />
                </div>
            )}

            <div className="orders-detail-heading">
                <strong className="orders-detail-name">
                    {order.customer_name || 'Sem nome do cliente'}
                </strong>
                {statusNode}
            </div>

            <div className="orders-detail-meta">
                <span className="orders-detail-order">Ordem {orderNumber(order.id)}</span>
                <span className="orders-detail-date" title={formatDateTime(order.created_at)}>
                    {timeAgo(order.created_at)}
                </span>
            </div>

            <div className="orders-detail-section">
                <strong className="orders-detail-label">Itens</strong>
                <div className="orders-detail-table">
                    <div className={`orders-detail-table-head${isModal ? '' : ' orders-detail-table-head--plain'}`}>
                        <span>Item</span>
                        <span>Qts</span>
                        <span>Valor</span>
                    </div>
                    <ul className={`orders-detail-table-body${isModal ? '' : ' orders-detail-table-body--plain'}`}>
                        {rows.map((row) => {
                            const item = row.item;
                            const image =
                                item.product?.image ||
                                item.product?.image_url ||
                                item.product?.photo;
                            const infoNode = (
                                <span className="orders-detail-item-info">
                                    <span className="orders-detail-item-name">{row.name}</span>
                                </span>
                            );
                            const extrasNode =
                                row.groupEnd &&
                                ((item.addons || []).length > 0 || item.notes) ? (
                                    <li className="orders-detail-item-extras">
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
                                    </li>
                                ) : null;

                            return (
                                <React.Fragment key={row.key}>
                                    <li
                                        className={`orders-detail-table-row${isModal ? '' : ' orders-detail-table-row--plain'}`}
                                    >
                                        {isModal ? (
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
                                                {infoNode}
                                            </span>
                                        ) : (
                                            infoNode
                                        )}
                                        <span className="orders-detail-qty">01</span>
                                        <span className="orders-detail-value">
                                            {formatPrice(row.value)}
                                        </span>
                                    </li>
                                    {extrasNode}
                                </React.Fragment>
                            );
                        })}
                    </ul>
                </div>
            </div>

            {isModal ? (
                <>
                    {totalNode}
                    {notesNode}
                    {historyNode}
                    <div className="orders-detail-actions">
                        {copyButton}
                        <div className="orders-detail-main-actions--modal">
                            {editButton}
                            {finalizeButton}
                        </div>
                    </div>
                    {secondaryNode}
                </>
            ) : (
                <>
                    {notesNode}
                    {historyNode}
                    <div className="orders-detail-footer">
                        {secondaryNode}
                        {copyButton}
                        <div className="orders-detail-divider" />
                        {totalNode}
                        {editButton}
                    </div>
                </>
            )}
        </div>
    );
}
