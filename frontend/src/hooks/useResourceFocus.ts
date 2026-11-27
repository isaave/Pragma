import { useEffect, useRef } from 'react';

export interface ResourceFocusDetail {
    resourceType?: string;
    resourceId?: string | number;
    highlight?: boolean;
}

/**
 * Escuta o pedido de navegação feito pelo sino de notificações.
 * Cada tela decide como destacar/focar o recurso recebido.
 */
export function useResourceFocus(handler: (detail: ResourceFocusDetail) => void): void {
    const handlerRef = useRef(handler);

    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        const listener = (event: Event) => {
            const detail = (event as CustomEvent<ResourceFocusDetail>).detail;
            handlerRef.current(detail ?? {});
        };

        window.addEventListener('pragma:focus-resource', listener);
        return () => window.removeEventListener('pragma:focus-resource', listener);
    }, []);
}
