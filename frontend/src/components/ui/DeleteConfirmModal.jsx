import React from 'react';
import Modal from './Modal';
import StatusBadge from './StatusBadge';
import './DeleteConfirmModal.css';

// Confirmação de exclusão padrão do sistema.
// Uso: <DeleteConfirmModal open onClose={...} name="Batata" subject="produto" onConfirm={...} confirming={deleting} />
export default function DeleteConfirmModal({
    open,
    onClose,
    name,
    subject = 'item',
    onConfirm,
    confirming = false,
    error = '',
    note = '',
    className = '',
}) {
    const displayName = name || subject;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Excluir ${displayName}`}
            subtitle="Esta ação não pode ser desfeita."
            ariaLabel={`Excluir ${displayName}`}
            maxWidth={520}
            closePlacement="top"
            centerTitle
            showDivider={false}
            className={`delete-confirm-modal ${className}`.trim()}
            headerActions={<StatusBadge label="Excluir" tone="danger" />}
        >
            <p className="delete-confirm-text">
                Confirma a exclusão de <strong>{displayName}</strong>
                {note ? ` ${note}` : ''}?
            </p>
            {error && <p className="delete-confirm-error" role="alert">{error}</p>}
            <div className="delete-confirm-actions">
                <button type="button" className="delete-confirm-button" onClick={onClose}>
                    Cancelar
                </button>
                <button
                    type="button"
                    className="delete-confirm-button delete-confirm-button--danger"
                    onClick={onConfirm}
                    disabled={confirming}
                >
                    {confirming ? 'Excluindo...' : `Excluir ${subject}`}
                </button>
            </div>
        </Modal>
    );
}
