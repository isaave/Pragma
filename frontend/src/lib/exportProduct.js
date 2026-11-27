import logo from '../assets/LogoHouseBurguer.png';
import { formatPrice } from './orderStatus';

const CATEGORY_LABELS = {
    hamburguer: 'Hambúrguer',
    combo: 'Combo',
    acompanhamento: 'Acompanhamento',
    bebida: 'Bebida',
    sobremesa: 'Sobremesa',
    adicional: 'Adicional',
};

const STATUS_LABELS = {
    ativo: 'Ativo',
    inativo: 'Inativo',
    desenvolvimento: 'Em desenvolvimento',
};

const COPYRIGHT =
    '© 2026 Pragma — Isabella Avelina, Isadora Burgos e Pedro William. Todos os direitos reservados';

const categoryLabel = (key) => CATEGORY_LABELS[key] || key || '—';
const statusLabel = (key) => STATUS_LABELS[key] || key || '—';

const slugify = (value) =>
    String(value || 'produto')
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

const fileBaseName = (product) => `produto-${slugify(product.name)}-${todayStamp()}`;

const listFileBaseName = () => `produtos-${todayStamp()}`;

const recipeText = (product) =>
    (product.recipe || [])
        .map((item) => `${item.quantity} ${item.unit} de ${item.name}`)
        .join(', ');

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
    'Produto',
    'Categoria',
    'Valor',
    'Disponibilidade',
    'Status',
    'Ingredientes',
    'Observações',
];

const csvRow = (product) => [
    product.name,
    categoryLabel(product.category),
    formatPrice(product.price),
    product.available ? 'Disponível' : 'Indisponível',
    statusLabel(product.status),
    recipeText(product) || 'Sem ingredientes',
    product.notes || '',
];

const downloadCsv = (filename, rows) => {
    const csv = [CSV_HEADER, ...rows].map((line) => line.map(csvCell).join(';')).join('\r\n');
    downloadFile(filename, `\uFEFF${csv}`, 'text/csv;charset=utf-8;');
};

export const exportProductCsv = (product) => {
    downloadCsv(`${fileBaseName(product)}.csv`, [csvRow(product)]);
};

export const exportProductsCsv = (products) => {
    downloadCsv(`${listFileBaseName()}.csv`, (products || []).map(csvRow));
};

const productTxtLines = (product) => {
    const lines = [
        `Produto: ${product.name}`,
        `Categoria: ${categoryLabel(product.category)}`,
        `Valor: ${formatPrice(product.price)}`,
        `Disponibilidade: ${product.available ? 'Disponível' : 'Indisponível'}`,
        `Status: ${statusLabel(product.status)}`,
        'Ingredientes (receita):',
    ];

    if ((product.recipe || []).length === 0) {
        lines.push('- Sem ingredientes cadastrados');
    } else {
        product.recipe.forEach((item) => {
            lines.push(`- ${item.quantity} ${item.unit} de ${item.name}`);
        });
    }

    if (product.notes) {
        lines.push(`Observações: ${product.notes}`);
    }

    return lines;
};

export const exportProductTxt = (product) => {
    const lines = [
        'PRAGMA — HOUSE BURGUER',
        'Ficha do produto',
        '========================================',
        ...productTxtLines(product),
        '========================================',
        COPYRIGHT,
    ];

    downloadFile(`${fileBaseName(product)}.txt`, lines.join('\n'), 'text/plain;charset=utf-8;');
};

export const exportProductsTxt = (products) => {
    const list = products || [];
    const lines = [
        'PRAGMA — HOUSE BURGUER',
        'Lista de produtos',
        '========================================',
        `Total de produtos: ${list.length}`,
        `Emitido em: ${new Date().toLocaleString('pt-BR')}`,
    ];

    list.forEach((product, index) => {
        lines.push('----------------------------------------');
        lines.push(`${index + 1}. ${product.name.toUpperCase()}`);
        lines.push('----------------------------------------');
        lines.push(...productTxtLines(product));
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

export const exportProductPdf = (product) => {
    const printWindow = window.open('', '_blank', 'width=760,height=900');
    if (!printWindow) return false;

    const logoUrl = new URL(logo, window.location.href).href;

    const recipeRows = (product.recipe || [])
        .map(
            (item) =>
                `<tr>
                    <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(item.name)}</td>
                    <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap;">${escapeHtml(item.quantity)} ${escapeHtml(item.unit)}</td>
                </tr>`
        )
        .join('');

    const recipeBlock =
        (product.recipe || []).length > 0
            ? `<table style="width:100%;font-size:13px;border-collapse:collapse;">
                    <thead>
                        <tr>
                            <th style="text-align:left;padding:8px;border-bottom:2px solid #0f172a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Ingrediente</th>
                            <th style="text-align:right;padding:8px;border-bottom:2px solid #0f172a;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Quantidade</th>
                        </tr>
                    </thead>
                    <tbody>${recipeRows}</tbody>
                </table>`
            : '<p style="font-size:13px;color:#64748b;">Nenhum ingrediente cadastrado na receita.</p>';

    const notes = product.notes
        ? `<p style="margin:16px 0 0;font-size:13px;color:#475569;"><strong>Observações:</strong> ${escapeHtml(product.notes)}</p>`
        : '';

    printDocument(
        printWindow,
        fileBaseName(product),
        `${pdfHeader(logoUrl, 'Ficha do produto', `Emitido em ${new Date().toLocaleString('pt-BR')}`)}

        <table style="width:100%;font-size:13px;border-collapse:collapse;margin-bottom:20px;">
            <tr><td style="padding:4px 0;color:#64748b;width:130px;">Produto</td><td style="padding:4px 0;"><strong>${escapeHtml(product.name)}</strong></td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Categoria</td><td style="padding:4px 0;">${escapeHtml(categoryLabel(product.category))}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Valor</td><td style="padding:4px 0;">${escapeHtml(formatPrice(product.price))}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Disponibilidade</td><td style="padding:4px 0;">${product.available ? 'Disponível' : 'Indisponível'}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;">Status</td><td style="padding:4px 0;">${escapeHtml(statusLabel(product.status))}</td></tr>
        </table>

        <h3 style="margin:24px 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Ingredientes (receita)</h3>
        ${recipeBlock}

        ${notes}

        ${pdfFooter()}`
    );

    return true;
};

export const exportProductsPdf = (products) => {
    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (!printWindow) return false;

    const logoUrl = new URL(logo, window.location.href).href;
    const list = products || [];

    const rows = list
        .map(
            (product) => `<tr>
                <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top;"><strong>${escapeHtml(product.name)}</strong>${product.notes ? `<div style="font-size:11px;color:#64748b;">${escapeHtml(product.notes)}</div>` : ''}</td>
                <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;white-space:nowrap;vertical-align:top;">${escapeHtml(categoryLabel(product.category))}</td>
                <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap;vertical-align:top;">${escapeHtml(formatPrice(product.price))}</td>
                <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;white-space:nowrap;vertical-align:top;">${product.available ? 'Disponível' : 'Indisponível'}</td>
                <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;white-space:nowrap;vertical-align:top;">${escapeHtml(statusLabel(product.status))}</td>
                <td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11.5px;color:#475569;vertical-align:top;">${escapeHtml(recipeText(product) || '—')}</td>
            </tr>`
        )
        .join('');

    const table =
        list.length > 0
            ? `<table style="width:100%;font-size:12px;border-collapse:collapse;">
                    <thead>
                        <tr>
                            <th style="text-align:left;padding:8px;border-bottom:2px solid #0f172a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;">Produto</th>
                            <th style="text-align:left;padding:8px;border-bottom:2px solid #0f172a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;">Categoria</th>
                            <th style="text-align:right;padding:8px;border-bottom:2px solid #0f172a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;">Valor</th>
                            <th style="text-align:left;padding:8px;border-bottom:2px solid #0f172a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;">Disp.</th>
                            <th style="text-align:left;padding:8px;border-bottom:2px solid #0f172a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;">Status</th>
                            <th style="text-align:left;padding:8px;border-bottom:2px solid #0f172a;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;">Ingredientes</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>`
            : '<p style="font-size:13px;color:#64748b;">Nenhum produto cadastrado.</p>';

    printDocument(
        printWindow,
        listFileBaseName(),
        `${pdfHeader(logoUrl, 'Lista de produtos', `Total de produtos: ${list.length} · Emitido em ${new Date().toLocaleString('pt-BR')}`)}
        ${table}
        ${pdfFooter()}`
    );

    return true;
};
