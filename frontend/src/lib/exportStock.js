import logo from '../assets/LogoHouseBurguer.png';

const formatDate = (value) => {
    if (!value) return '—';
    const [y, m, d] = String(value).split('-');
    if (!y || !m || !d) return String(value);
    return `${d}/${m}/${y}`;
};

const slugify = (value) =>
    String(value || 'estoque')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

const fileBaseName = (item) => {
    const date = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    return `estoque-${slugify(item.name)}-${stamp}`;
};

const expiryLabel = (item) => {
    if (!item.expiry_date) return 'Sem validade registada';
    return `${formatDate(item.expiry_date)}${item.near_expiry ? ' (validade próxima)' : ''}`;
};

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

export const exportStockCsv = (item) => {
    const header = [
        'Ingrediente',
        'Quantidade atual',
        'Unidade',
        'Capacidade máxima',
        'Nível (%)',
        'Status',
        'Última compra',
        'Validade',
        'Alerta de validade',
        'Observações',
    ];

    const row = [
        item.name,
        item.quantity,
        item.unit,
        item.capacity,
        item.percentage,
        item.stock_status,
        formatDate(item.last_purchase_date),
        formatDate(item.expiry_date),
        item.near_expiry ? 'Validade próxima' : '',
        item.notes || '',
    ];

    const csv = [header, row].map((line) => line.map(csvCell).join(';')).join('\r\n');

    downloadFile(`${fileBaseName(item)}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8;');
};

export const exportStockTxt = (item) => {
    const lines = [
        'PRAGMA — HOUSE BURGUER',
        'Ficha de estoque',
        '========================================',
        `Ingrediente: ${item.name}`,
        `Quantidade atual: ${item.quantity} ${item.unit}`,
        `Capacidade máxima: ${item.capacity} ${item.unit}`,
        `Nível: ${item.percentage}%`,
        `Status: ${item.stock_status}`,
        '----------------------------------------',
        `Última compra: ${formatDate(item.last_purchase_date)}`,
        `Validade: ${expiryLabel(item)}`,
    ];

    if (item.notes) {
        lines.push('----------------------------------------');
        lines.push(`Observações: ${item.notes}`);
    }

    lines.push('========================================');
    lines.push(
        '© 2026 Pragma — Isabella Avelina, Isadora Burgos e Pedro William. Todos os direitos reservados'
    );

    downloadFile(`${fileBaseName(item)}.txt`, lines.join('\n'), 'text/plain;charset=utf-8;');
};

const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"]/g, (char) => {
        const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
        return entities[char];
    });

export const exportStockPdf = (item) => {
    const printWindow = window.open('', '_blank', 'width=760,height=900');
    if (!printWindow) return false;

    const logoUrl = new URL(logo, window.location.href).href;
    const alertRow = item.near_expiry
        ? '<p style="margin:16px 0 0;padding:10px 12px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:13px;"><strong>Atenção:</strong> validade próxima.</p>'
        : '';
    const notes = item.notes
        ? `<p style="margin:16px 0 0;font-size:13px;color:#475569;"><strong>Observações:</strong> ${escapeHtml(item.notes)}</p>`
        : '';

    printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>${escapeHtml(fileBaseName(item))}</title>
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

        <h2 style="margin:24px 0 20px;font-size:18px;">Ficha de estoque</h2>

        <table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:20px;">
            <tr><td style="padding:4px 0;color:#64748b;width:150px;">Ingrediente</td><td style="padding:4px 0;"><strong>${escapeHtml(item.name)}</strong></td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Quantidade atual</td><td style="padding:4px 0;">${escapeHtml(item.quantity)} ${escapeHtml(item.unit)}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Capacidade máxima</td><td style="padding:4px 0;">${escapeHtml(item.capacity)} ${escapeHtml(item.unit)}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Nível</td><td style="padding:4px 0;">${escapeHtml(item.percentage)}%</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Status</td><td style="padding:4px 0;">${escapeHtml(item.stock_status)}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Última compra</td><td style="padding:4px 0;">${escapeHtml(formatDate(item.last_purchase_date))}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Validade</td><td style="padding:4px 0;">${escapeHtml(expiryLabel(item))}</td></tr>
        </table>

        ${alertRow}
        ${notes}

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
