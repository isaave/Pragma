export function expandItems(items = []) {
    return (items || []).flatMap((item) => {
        const n = Math.max(1, Number(item.quantity) || 1);
        const cents = Math.round(Number(item.subtotal || 0) * 100);
        const base = Math.floor(cents / n);
        const resto = cents - base * n;
        const name = item.product?.name || 'Produto';

        return Array.from({ length: n }, (_, i) => ({
            key: `${item.id}-${i}`,
            name,
            value: (base + (i < resto ? 1 : 0)) / 100,
            item,
            groupEnd: i === n - 1,
        }));
    });
}
