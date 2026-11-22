import { useEffect } from 'react';

export default function useAutoDismiss(value, setValue, ms = 4000) {
    useEffect(() => {
        if (!value) return undefined;
        const timer = setTimeout(() => setValue(''), ms);
        return () => clearTimeout(timer);
    }, [value, setValue, ms]);
}
