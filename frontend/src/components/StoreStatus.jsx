import React, { useEffect, useState } from 'react';
import { Loader2, Power, Store } from 'lucide-react';
import api from '../Services/api';
import { formatDateTime } from '../lib/orderStatus';

const readUser = () => {
    try {
        const stored = localStorage.getItem('pragma_user');
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
};

const getErrorMessage = (err, fallback) =>
    err?.response?.data?.message || fallback;

export default function StoreStatus({ compact = false, header = false, onToggled }) {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const user = readUser();
    const isChefe = (user?.role || '').trim().toLowerCase() === 'chefe';
    const isOpen = Boolean(status?.is_open);

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                const res = await api.get('/store/status');
                if (active) setStatus(res.data);
            } catch (err) {
                if (active) setError(getErrorMessage(err, 'Não foi possível obter o estado do negócio.'));
            } finally {
                if (active) setLoading(false);
            }
        };

        load();
        return () => { active = false; };
    }, []);

    const toggle = async () => {
        setSaving(true);
        setError('');
        setInfo('');
        try {
            const res = await api.put('/store/status', { is_open: !isOpen });
            setStatus(res.data);
            setInfo(res.data.message || (res.data.is_open ? 'Negócio aberto.' : 'Negócio fechado.'));
            onToggled?.(res.data);
        } catch (err) {
            setError(getErrorMessage(err, 'Não foi possível alterar o estado do negócio.'));
        } finally {
            setSaving(false);
        }
    };

    const updatedLabel = status?.updated_at
        ? `Atualizado${status.updated_by ? ` por ${status.updated_by}` : ''} em ${formatDateTime(status.updated_at)}`
        : null;

    const buttonLabel = saving
        ? 'A guardar...'
        : isOpen
          ? 'Fechar negócio'
          : 'Abrir negócio';

    const statusDot = (
        <span
            aria-hidden="true"
            style={{
                width: compact || header ? '8px' : '10px',
                height: compact || header ? '8px' : '10px',
                borderRadius: '50%',
                background: isOpen ? 'var(--success)' : 'var(--danger)',
                boxShadow: isOpen
                    ? '0 0 0 3px rgba(21, 128, 61, 0.15)'
                    : '0 0 0 3px rgba(185, 28, 28, 0.15)',
                flexShrink: 0,
            }}
        />
    );

    const badge = (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: compact ? '3px 9px' : '5px 12px',
                borderRadius: '999px',
                fontSize: compact ? '11.5px' : '12.5px',
                fontWeight: 700,
                color: isOpen ? 'var(--success)' : 'var(--danger)',
                background: isOpen ? 'rgba(21, 128, 61, 0.12)' : 'rgba(185, 28, 28, 0.12)',
                whiteSpace: 'nowrap',
            }}
        >
            {statusDot}
            {loading ? 'A carregar...' : isOpen ? 'Aberto' : 'Fechado'}
        </span>
    );

    if (header) {
        const headerLabel = saving
            ? 'A guardar...'
            : loading
              ? 'A carregar...'
              : isChefe
                ? buttonLabel
                : isOpen
                  ? 'Negócio aberto'
                  : 'Negócio fechado';

        const headerStyle = isChefe
            ? {
                  '--store-bg': isOpen ? 'transparent' : 'var(--accent)',
                  '--store-color': isOpen ? 'var(--danger)' : '#ffffff',
                  '--store-border': isOpen ? 'var(--border-color)' : 'transparent',
              }
            : {
                  '--store-bg': isOpen ? 'rgba(21, 128, 61, 0.12)' : 'rgba(185, 28, 28, 0.12)',
                  '--store-color': isOpen ? 'var(--success)' : 'var(--danger)',
                  '--store-border': 'transparent',
              };

        const headerTitle = isChefe
            ? buttonLabel
            : `Negócio ${isOpen ? 'aberto' : 'fechado'}. Apenas o chefe pode alterar o estado.`;

        return (
            <div className="store-status-header-wrap">
                <button
                    type="button"
                    className="store-status-header"
                    style={headerStyle}
                    onClick={isChefe ? toggle : undefined}
                    disabled={!isChefe || saving || loading}
                    title={error || info || headerTitle}
                    aria-label={headerTitle}
                >
                    {statusDot}
                    {saving ? <Loader2 size={14} className="spin" /> : <Power size={14} />}
                    <span className="store-status-header__label">{headerLabel}</span>
                </button>
                {(error || info) && (
                    <span
                        className="store-status-header__tip"
                        role={error ? 'alert' : 'status'}
                    >
                        {error || info}
                    </span>
                )}
            </div>
        );
    }

    if (compact) {
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--card-shadow)',
                }}
            >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '12.5px', fontWeight: 600 }}>
                    <Store size={15} /> Negócio
                </span>
                {badge}
                {isChefe && (
                    <button
                        type="button"
                        onClick={toggle}
                        disabled={saving || loading}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 11px',
                            borderRadius: '9px',
                            border: '1px solid var(--border-color)',
                            background: isOpen ? 'transparent' : 'var(--accent)',
                            color: isOpen ? 'var(--danger)' : '#ffffff',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: saving || loading ? 'not-allowed' : 'pointer',
                            opacity: saving || loading ? 0.6 : 1,
                        }}
                    >
                        {saving ? <Loader2 size={13} className="spin" /> : <Power size={13} />}
                        {buttonLabel}
                    </button>
                )}
                {(error || info) && (
                    <span role={error ? 'alert' : 'status'} style={{ fontSize: '11.5px', color: error ? 'var(--danger)' : 'var(--success)' }}>
                        {error || info}
                    </span>
                )}
            </div>
        );
    }

    return (
        <section
            style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '18px',
                boxShadow: 'var(--card-shadow)',
                padding: '20px 22px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '18px',
                flexWrap: 'wrap',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', minWidth: '240px', flex: 1 }}>
                <div
                    style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isOpen ? 'rgba(21, 128, 61, 0.12)' : 'rgba(185, 28, 28, 0.12)',
                        color: isOpen ? 'var(--success)' : 'var(--danger)',
                        flexShrink: 0,
                    }}
                >
                    <Store size={22} />
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Estado do negócio
                        </h2>
                        {badge}
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {loading
                            ? 'A verificar o estado atual...'
                            : isOpen
                              ? 'O negócio está aberto e a receber pedidos.'
                              : 'O negócio está fechado. Não registe novos pedidos.'}
                    </p>
                    {updatedLabel && (
                        <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            {updatedLabel}
                        </p>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                {isChefe ? (
                    <button
                        type="button"
                        onClick={toggle}
                        disabled={saving || loading}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '11px 18px',
                            borderRadius: '12px',
                            border: isOpen ? '1px solid var(--border-color)' : '1px solid transparent',
                            background: isOpen ? 'transparent' : 'var(--accent)',
                            color: isOpen ? 'var(--danger)' : '#ffffff',
                            fontSize: '13.5px',
                            fontWeight: 700,
                            cursor: saving || loading ? 'not-allowed' : 'pointer',
                            opacity: saving || loading ? 0.6 : 1,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {saving ? <Loader2 size={16} className="spin" /> : <Power size={16} />}
                        {buttonLabel}
                    </button>
                ) : (
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'right' }}>
                        Apenas o chefe pode abrir ou fechar o negócio.
                    </span>
                )}
                {(error || info) && (
                    <span
                        role={error ? 'alert' : 'status'}
                        style={{ fontSize: '12px', color: error ? 'var(--danger)' : 'var(--success)', textAlign: 'right', maxWidth: '240px' }}
                    >
                        {error || info}
                    </span>
                )}
            </div>
        </section>
    );
}
