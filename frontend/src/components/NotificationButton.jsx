import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import api from '../Services/api';
import { getHistory, orderNumber, formatDateTime, STATUS_META } from '../lib/orderStatus';

export default function NotificationButton() {
    const [open, setOpen] = useState(false);
    const [events, setEvents] = useState([]);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get('/orders');
                const all = (res.data || []).flatMap((order) =>
                    getHistory(order).map((entry) => ({ order, entry }))
                );
                all.sort((a, b) => new Date(b.entry.created_at) - new Date(a.entry.created_at));
                setEvents(all.slice(0, 5));
            } catch {
                setEvents([]);
            }
        };
        load();
    }, []);

    const toggle = () => setOpen((prev) => !prev);

    const panelStyle = {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: '320px',
        maxWidth: 'calc(100vw - 32px)',
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
        padding: '12px',
        zIndex: 60,
        boxSizing: 'border-box',
    };

    const listStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '320px',
        overflowY: 'auto',
    };

    const itemStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '8px 10px',
        borderRadius: '10px',
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
    };

    const meta = (entry) => STATUS_META[entry.status]?.label || entry.status;

    return (
        <div style={{ position: 'relative' }}>
            <button
                type="button"
                className="notification-button"
                onClick={toggle}
                title="Notificações"
                aria-label="Notificações"
                aria-expanded={open}
            >
                <Bell size={18} strokeWidth={2} />
            </button>

            {open && (
                <div style={panelStyle}>
                    {events.length === 0 ? (
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Sem notificações.
                        </p>
                    ) : (
                        <div style={listStyle}>
                            {events.map(({ order, entry }) => (
                                <div style={itemStyle} key={`${order.id}-${entry.id ?? entry.created_at}-${entry.status}`}>
                                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                        {orderNumber(order.id)} — {order.customer_name || 'Sem cliente'}
                                    </span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        {meta(entry)} · {formatDateTime(entry.created_at)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
