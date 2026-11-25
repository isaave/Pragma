import logo from '../assets/LogoHouseBurguer.png';
import {
    STATUS_META,
    formatDateTime,
    formatPrice,
    getHistory,
    orderNumber,
} from './orderStatus';

const statusLabel = (status) => STATUS_META[status]?.label || status || '—';

const COPYRIGHT = '© 2026 Pragma — Isabella Avelina, Isadora Burgos e Pedro William. Todos os direitos reservados';

const paddedDate = (date) => {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const fileBaseName = (order) => {
    const date = new Date(order.created_at || Date.now());
    return `pedido-${String(order.id).padStart(4, '0')}-${paddedDate(date)}`;
};

const listFileBaseName = () => `pedidos-${paddedDate(new Date())}`;

const itemAddons = (item) =>
    (item.addons || [])
        .map((addon) => `${addon.quantity}× ${addon.addon?.name || 'Adicional'}`)
        .join(', ');

const totalItems = (order) =>
    (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

const downloadFile = (filename, content, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const exportOrderCsv = (order) => {
    const header = [
        'Pedido',
        'Cliente',
        'Status',
        'Data',
        'Produto',
        'Quantidade',
        'Adicionais',
        'Observação do item',
        'Subtotal',
        'Total do pedido',
    ];

    const rows = (order.items || []).map((item) => [
        orderNumber(order.id),
        order.customer_name || 'Sem cliente',
        statusLabel(order.status),
        formatDateTime(order.created_at),
        item.product?.name || 'Produto',
        item.quantity,
        itemAddons(item),
        item.notes || '',
        formatPrice(item.subtotal),
        formatPrice(order.total),
    ]);

    if (rows.length === 0) {
        rows.push([
            orderNumber(order.id),
            order.customer_name || 'Sem cliente',
            statusLabel(order.status),
            formatDateTime(order.created_at),
            'Sem itens',
            '',
            '',
            '',
            '',
            formatPrice(order.total),
        ]);
    }

    const csv = [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');

    downloadFile(`${fileBaseName(order)}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8;');
};

export const exportOrderTxt = (order) => {
    const lines = [
        'PRAGMA — HOUSE BURGUER',
        'Comprovante de pedido',
        '========================================',
        `Pedido: ${orderNumber(order.id)}`,
        `Cliente: ${order.customer_name || 'Sem cliente'}`,
        `Status: ${statusLabel(order.status)}`,
        `Data: ${formatDateTime(order.created_at)}`,
        `Itens: ${totalItems(order)}`,
        '----------------------------------------',
    ];

    (order.items || []).forEach((item) => {
        lines.push(
            `${item.quantity}× ${item.product?.name || 'Produto'} — ${formatPrice(item.subtotal)}`
        );
        (item.addons || []).forEach((addon) => {
            lines.push(`   + ${addon.quantity}× ${addon.addon?.name || 'Adicional'}`);
        });
        if (item.notes) lines.push(`   Obs.: ${item.notes}`);
    });

    lines.push('----------------------------------------');
    lines.push(`Total: ${formatPrice(order.total)}`);

    if (order.notes) {
        lines.push('----------------------------------------');
        lines.push(`Observações do pedido: ${order.notes}`);
    }

    lines.push('----------------------------------------');
    lines.push('Histórico:');
    getHistory(order).forEach((entry) => {
        const parts = [`${statusLabel(entry.status)} — ${formatDateTime(entry.created_at)}`];
        if (entry.user?.name) parts.push(`por ${entry.user.name}`);
        if (entry.reason) parts.push(`Motivo: ${entry.reason}`);
        lines.push(`- ${parts.join(' · ')}`);
    });

    lines.push('========================================');
    lines.push(
        '© 2026 Pragma — Isabella Avelina, Isadora Burgos e Pedro William. Todos os direitos reservados'
    );

    downloadFile(`${fileBaseName(order)}.txt`, lines.join('\n'), 'text/plain;charset=utf-8;');
};

const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"]/g, (char) => {
        const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
        return entities[char];
    });

export const exportOrderPdf = (order) => {
    const printWindow = window.open('', '_blank', 'width=760,height=900');
    if (!printWindow) return false;

    const logoUrl = new URL(logo, window.location.href).href;

    const items = (order.items || [])
        .map((item) => {
            const addons = (item.addons || [])
                .map(
                    (addon) =>
                        `<div style="font-size:12px;color:#475569;">+ ${addon.quantity}× ${escapeHtml(addon.addon?.name || 'Adicional')}</div>`
                )
                .join('');
            const notes = item.notes
                ? `<div style="font-size:12px;color:#475569;">Obs.: ${escapeHtml(item.notes)}</div>`
                : '';

            return `<tr>
                <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top;">
                    <strong>${item.quantity}× ${escapeHtml(item.product?.name || 'Produto')}</strong>
                    ${addons}${notes}
                </td>
                <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top;white-space:nowrap;">
                    ${escapeHtml(formatPrice(item.subtotal))}
                </td>
            </tr>`;
        })
        .join('');

    const history = getHistory(order)
        .map((entry) => {
            const details = [
                escapeHtml(formatDateTime(entry.created_at)),
                entry.user?.name ? `por ${escapeHtml(entry.user.name)}` : '',
                entry.reason ? `Motivo: ${escapeHtml(entry.reason)}` : '',
            ]
                .filter(Boolean)
                .join(' · ');

            return `<li style="margin-bottom:4px;">${escapeHtml(statusLabel(entry.status))} — ${details}</li>`;
        })
        .join('');

    const orderNotes = order.notes
        ? `<p style="margin:16px 0 0;font-size:13px;color:#475569;"><strong>Observações do pedido:</strong> ${escapeHtml(order.notes)}</p>`
        : '';

    printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>${escapeHtml(fileBaseName(order))}</title>
</head>
<body style="margin:0;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;background:#ffffff;">
    <div style="max-width:640px;margin:0 auto;">
        <div style="display:flex;align-items:center;gap:16px;border-bottom:2px solid #0f172a;padding-bottom:16px;">
            <img src="${logoUrl}" alt="House Burguer" width="64" style="width:64px;height:auto;display:block;">
            <div>
                <h1 style="margin:0;font-size:20px;letter-spacing:1px;">HOUSE BURGUER</h1>
                <p style="margin:4px 0 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:2px;">Pragma</p>
            </div>
        </div>

        <h2 style="margin:24px 0 4px;font-size:18px;">Comprovante de pedido ${escapeHtml(orderNumber(order.id))}</h2>
        <p style="margin:0 0 20px;font-size:13px;color:#64748b;">Emitido em ${escapeHtml(formatDateTime(new Date().toISOString()))}</p>

        <table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:20px;">
            <tr><td style="padding:4px 0;color:#64748b;width:110px;">Cliente</td><td style="padding:4px 0;"><strong>${escapeHtml(order.customer_name || 'Sem cliente')}</strong></td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Status</td><td style="padding:4px 0;">${escapeHtml(statusLabel(order.status))}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Data do pedido</td><td style="padding:4px 0;">${escapeHtml(formatDateTime(order.created_at))}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Itens</td><td style="padding:4px 0;">${totalItems(order)}</td></tr>
        </table>

        <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <thead>
                <tr>
                    <th style="text-align:left;padding:8px;border-bottom:2px solid #0f172a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Item</th>
                    <th style="text-align:right;padding:8px;border-bottom:2px solid #0f172a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Valor</th>
                </tr>
            </thead>
            <tbody>${items}</tbody>
            <tfoot>
                <tr>
                    <td style="padding:12px 8px;font-weight:700;font-size:15px;">Total</td>
                    <td style="padding:12px 8px;text-align:right;font-weight:700;font-size:15px;">${escapeHtml(formatPrice(order.total))}</td>
                </tr>
            </tfoot>
        </table>

        ${orderNotes}

        <h3 style="margin:24px 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Histórico</h3>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:#475569;">${history}</ul>

        <p style="margin:32px 0 0;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center;">
            © 2026 Pragma — Isabella Avelina, Isadora Burgos e Pedro William. Todos os direitos reservados
        </p>
    </div>
    <script>
        window.addEventListener('load', function () {
            setTimeout(function () { window.print(); }, 150);
        });
    </script>
</body>
</html>`);

    printWindow.document.close();
    return true;
};

/* ------------------------------------------------------------------ */
/*  Exportação da lista completa de pedidos                            */
/* ------------------------------------------------------------------ */

const orderRows = (orders) =>
    (orders || []).map((order) => [
        orderNumber(order.id),
        order.customer_name || 'Sem cliente',
        statusLabel(order.status),
        formatDateTime(order.created_at),
        order.user?.name || '—',
        totalItems(order),
        formatPrice(order.total),
    ]);

export const exportOrdersCsv = (orders) => {
    const header = [
        'Pedido',
        'Cliente',
        'Status',
        'Data',
        'Atendente',
        'Itens',
        'Total do pedido',
    ];
    const csv = [header, ...orderRows(orders)]
        .map((row) => row.map(csvCell).join(';'))
        .join('\r\n');

    downloadFile(`${listFileBaseName()}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8;');
};

export const exportOrdersTxt = (orders) => {
    const list = orders || [];
    const lines = [
        'PRAGMA — HOUSE BURGUER',
        'Lista de pedidos',
        '========================================',
        `Total de pedidos: ${list.length}`,
        `Emitido em: ${formatDateTime(new Date().toISOString())}`,
        '----------------------------------------',
    ];

    if (list.length === 0) {
        lines.push('Nenhum pedido cadastrado.');
    } else {
        list.forEach((order) => {
            lines.push(
                `${orderNumber(order.id)} · ${order.customer_name || 'Sem cliente'} · ${statusLabel(order.status)} · ${formatDateTime(order.created_at)} · ${totalItems(order)} item(ns) · ${formatPrice(order.total)}`
            );
        });
    }

    lines.push('----------------------------------------');
    lines.push(`Valor total: ${formatPrice(list.reduce((sum, order) => sum + Number(order.total || 0), 0))}`);
    lines.push('========================================');
    lines.push(COPYRIGHT);

    downloadFile(`${listFileBaseName()}.txt`, lines.join('\n'), 'text/plain;charset=utf-8;');
};

export const exportOrdersPdf = (orders) => {
    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (!printWindow) return false;

    const logoUrl = new URL(logo, window.location.href).href;
    const list = orders || [];
    const total = list.reduce((sum, order) => sum + Number(order.total || 0), 0);

    const rows = list
        .map(
            (order) => `<tr>
                <td style="padding:8px;border-bottom:1px solid #e2e8f0;white-space:nowrap;"><strong>${escapeHtml(orderNumber(order.id))}</strong></td>
                <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(order.customer_name || 'Sem cliente')}<div style="font-size:11px;color:#64748b;">${escapeHtml(order.user?.name || '—')}</div></td>
                <td style="padding:8px;border-bottom:1px solid #e2e8f0;white-space:nowrap;">${escapeHtml(statusLabel(order.status))}</td>
                <td style="padding:8px;border-bottom:1px solid #e2e8f0;white-space:nowrap;">${escapeHtml(formatDateTime(order.created_at))}</td>
                <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${totalItems(order)}</td>
                <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap;">${escapeHtml(formatPrice(order.total))}</td>
            </tr>`
        )
        .join('');

    const table =
        list.length > 0
            ? `<table style="width:100%;font-size:12px;border-collapse:collapse;">
                    <thead>
                        <tr>
                            <th style="text-align:left;padding:8px;border-bottom:2px solid #0f172a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;">Pedido</th>
                            <th style="text-align:left;padding:8px;border-bottom:2px solid #0f172a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;">Cliente / Atendente</th>
                            <th style="text-align:left;padding:8px;border-bottom:2px solid #0f172a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;">Status</th>
                            <th style="text-align:left;padding:8px;border-bottom:2px solid #0f172a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;">Data</th>
                            <th style="text-align:center;padding:8px;border-bottom:2px solid #0f172a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;">Itens</th>
                            <th style="text-align:right;padding:8px;border-bottom:2px solid #0f172a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;">Total</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                    <tfoot>
                        <tr>
                            <td colspan="5" style="padding:12px 8px;font-weight:700;font-size:14px;text-align:right;">Valor total</td>
                            <td style="padding:12px 8px;text-align:right;font-weight:700;font-size:14px;white-space:nowrap;">${escapeHtml(formatPrice(total))}</td>
                        </tr>
                    </tfoot>
                </table>`
            : '<p style="font-size:13px;color:#64748b;">Nenhum pedido cadastrado.</p>';

    printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>${escapeHtml(listFileBaseName())}</title>
    <style>
        @page { size: A4; margin: 12mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    </style>
</head>
<body style="margin:0;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;background:#ffffff;">
    <div style="max-width:100%;margin:0 auto;">
        <div style="display:flex;align-items:center;gap:16px;border-bottom:2px solid #0f172a;padding-bottom:16px;">
            <img src="${logoUrl}" alt="House Burguer" width="64" style="width:64px;height:auto;display:block;">
            <div>
                <h1 style="margin:0;font-size:20px;letter-spacing:1px;">HOUSE BURGUER</h1>
                <p style="margin:4px 0 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:2px;">Pragma</p>
            </div>
        </div>

        <h2 style="margin:24px 0 4px;font-size:18px;">Lista de pedidos</h2>
        <p style="margin:0 0 20px;font-size:13px;color:#64748b;">Total de pedidos: ${list.length} · Valor total: ${escapeHtml(formatPrice(total))} · Emitido em ${escapeHtml(formatDateTime(new Date().toISOString()))}</p>

        ${table}

        <p style="margin:32px 0 0;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center;">
            ${escapeHtml(COPYRIGHT)}
        </p>
    </div>
    <script>
        window.addEventListener('load', function () {
            setTimeout(function () { window.print(); }, 150);
        });
    </script>
</body>
</html>`);

    printWindow.document.close();
    return true;
};
