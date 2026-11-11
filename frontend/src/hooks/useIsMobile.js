import { useState, useEffect } from 'react';

/**
 * Detecta se o ecrã é pequeno (telemóvel/tablet).
 * Atualiza automaticamente quando a janela é redimensionada.
 * @param {number} maxWidth - largura máxima em px (padrão 900)
 */
export default function useIsMobile(maxWidth = 900) {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return false;
        return window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
    });

    useEffect(() => {
        if (!window.matchMedia) return;
        const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
        const onChange = (e) => setIsMobile(e.matches);
        onChange({ matches: mq.matches });
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, [maxWidth]);

    return isMobile;
}
