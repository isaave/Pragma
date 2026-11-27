import logo from '../assets/LogoHouseBurguer.png';

const COPYRIGHT =
    '© 2026 Pragma — Isabella Avelina, Isadora Burgos e Pedro William. Todos os direitos reservados';

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

const todayStamp = () => {
    const date = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const fileBaseName = (item) => `estoque-${slugify(item.name)}-${todayStamp()}`;
const listFileBaseName = () => `estoque-${todayStamp()}`;

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

const CSV_HEADER = [
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

const csvRow = (item) => [
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

const downloadCsv = (filename, rows) => {
    const csv = [CSV_HEADER, ...rows].map((line) => line.map(csvCell).join(';')).join('\r\n');
    downloadFile(filename, `\uFEFF${csv}`, 'text/csv;charset=utf-8;');
};

export const exportStockCsv = (item) => {
    downloadCsv(`${fileBaseName(item)}.csv`, [csvRow(item)]);
};

export const exportStockListCsv = (items) => {
    downloadCsv(`${listFileBaseName()}.csv`, (items || []).map(csvRow));
};

const itemTxtLines = (item) => {
    const lines = [
        `Ingrediente: ${item.name}`,
        `Quantidade atual: ${item.quantity} ${item.unit}`,
        `Capacidade máxima: ${item.capacity} ${item.unit}`,
        `Nível: ${item.percentage}%`,
        `Status: ${item.stock_status}`,
        `Última compra: ${formatDate(item.last_purchase_date)}`,
        `Validade: ${expiryLabel(item)}`,
    ];

    if (item.notes) {
        lines.push(`Observações: ${item.notes}`);
    }

    return lines;
};

export const exportStockTxt = (item) => {
    const lines = [
        'PRAGMA — HOUSE BURGUER',
        'Ficha de estoque',
        '========================================',
        ...itemTxtLines(item),
        '========================================',
        COPYRIGHT,
    ];

    downloadFile(`${fileBaseName(item)}.txt`, lines.join('\n'), 'text/plain;charset=utf-8;');
};

export const exportStockListTxt = (items) => {
    const list = items || [];
    const low = list.filter((item) => item.stock_status === 'Estoque baixo' || item.percentage <= 30).length;
    const out = list.filter((item) => item.stock_status === 'Em falta' || Number(item.quantity) <= 0).length;
    const expiring = list.filter((item) => item.near_expiry).length;

    const lines = [
        'PRAGMA — HOUSE BURGUER',
        'Relatório de estoque',
        '========================================',
        `Total de ingredientes: ${list.length}`,
        `Estoque baixo: ${low}`,
        `Em falta: ${out}`,
        `Próximo da validade: ${expiring}`,
        `Emitido em: ${new Date().toLocaleString('pt-BR')}`,
    ];

    list.forEach((item, index) => {
        lines.push('----------------------------------------');
        lines.push(`${index + 1}. ${item.name.toUpperCase()}`);
        lines.push('----------------------------------------');
        lines.push(...itemTxtLines(item));
    });

    lines.push('========================================');
    lines.push(COPYRIGHT);

    downloadFile(`${listFileBaseName()}.txt`, lines.join('\n'), 'text/plain;charset=utf-8;');
};

const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"]/g, (char) => {
        const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
        return entities[char];
    });

const pdfHeader = (logoUrl, title, subtitle) => `
        <div style="display:flex;align-items:center;gap:16px;border-bottom:2px solid #0f172a;padding-bottom:16px;">
            <img src="${logoUrl}" alt="House Burguer" width="64" style="width:64px;height:auto;display:block;">
            <div>
                <h1 style="margin:0;font-size:20px;letter-spacing:1px;">HOUSE BURGUER</h1>
                <p style="margin:4px 0 0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:2px;">Pragma</p>
            </div>
        </div>

        <h2 style="margin:24px 0 4px;font-size:18px;">${escapeHtml(title)}</h2>
        <p style="margin:0 0 20px;font-size:13px;color:#64748b;">${escapeHtml(subtitle)}</p>`;

const pdfFooter = () => `
        <p style="margin:32px 0 0;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center;">
            ${escapeHtml(COPYRIGHT)}
        </p>`;

const printDocument = (printWindow, title, body) => {
    printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <title>${escapeHtml(title)}</title>
    <style>
        @page { size: A4; margin: 12mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    </style>
</head>
<body style="margin:0;padding:32px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#0f172a;background:#ffffff;">
    <div style="max-width:100%;margin:0 auto;">
        ${body}
    </div>
    <script>
        window.addEventListener('load', function () {
            setTimeout(function () { window.print(); }, 150);
        });
    </script>
</body>
</html>`);
    printWindow.document.close();
};

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

    printDocument(
        printWindow,
        fileBaseName(item),
        `${pdfHeader(logoUrl, 'Ficha de estoque', `Emitido em ${new Date().toLocaleString('pt-BR')}`)}

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

        ${pdfFooter()}`
    );

    return true;
};

export const exportStockListPdf = (items) => {
    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (!printWindow) return false;

    const logoUrl = new URL(logo, window.location.href).href;
    const list = items || [];
    const low = list.filter((item) => item.stock_status === 'Estoque baixo' || item.percentage <= 30).length;
    const out = list.filter((item) => item.stock_status === 'Em falta' || Number(item.quantity) <= 0).length;
    const expiring = list.filter((item) => item.near_expiry).length;

    const rows = list
        .map(
            (item) => `<tr${item.near_expiry ? ' style="background:#fffbeb;"' : ''}>
                <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top;"><strong>${escapeHtml(item.name)}</strong>${item.near_expiry ? '<div style="font-size:10.5px;color:#92400e;">Validade próxima</div>' : ''}</td>
                <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap;vertical-align:top;">${escapeHtml(item.quantity)} ${escapeHtml(item.unit)}</td>
                <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap;vertical-align:top;">${escapeHtml(item.capacity)} ${escapeHtml(item.unit)}</td>
                <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap;vertical-align:top;">${escapeHtml(item.percentage)}%</td>
                <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;white-space:nowrap;vertical-align:top;">${escapeHtml(item.stock_status)}</td>
                <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;white-space:nowrap;vertical-align:top;">${escapeHtml(formatDate(item.expiry_date))}</td>
            </tr>`
        )
        .join('');

    const table =
        list.length > 0
            ? `<table style="width:100%;font-size:12px;border-collapse:collapse;">
                    <thead>
                        <tr>
                            <th style="text-align:left;padding:8px;border-bottom:2px solid #0f172a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;">Ingrediente</th>
                            <th style="text-align:right;padding:8px;border-bottom:2px solid #0f172a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;">Qtd.</th>
                            <th style="text-align:right;padding:8px;border-bottom:2px solid #0f172a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;">Capacidade</th>
                            <th style="text-align:right;padding:8px;border-bottom:2px solid #0f172a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;">Nível</th>
                            <th style="text-align:left;padding:8px;border-bottom:2px solid #0f172a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;">Status</th>
                            <th style="text-align:left;padding:8px;border-bottom:2px solid #0f172a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;">Validade</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>`
            : '<p style="font-size:13px;color:#64748b;">Nenhum ingrediente cadastrado.</p>';

    printDocument(
        printWindow,
        listFileBaseName(),
        `${pdfHeader(logoUrl, 'Relatório de estoque', `Total: ${list.length} · Estoque baixo: ${low} · Em falta: ${out} · Validade próxima: ${expiring} · Emitido em ${new Date().toLocaleString('pt-BR')}`)}
        ${table}
        ${pdfFooter()}`
    );

    return true;
};
