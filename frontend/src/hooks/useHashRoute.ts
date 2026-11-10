import { useCallback, useEffect, useState } from 'react';

const getCurrentRoute = (): string => {
    const hash = window.location.hash.replace(/^#/, '');

    if (!hash || hash === '/') {
        return '/';
    }

    return hash.startsWith('/') ? hash : `/${hash}`;
};

export const useHashRoute = () => {
    const [route, setRoute] = useState(getCurrentRoute);

    useEffect(() => {
        const handleHashChange = () => {
            setRoute(getCurrentRoute());
        };

        window.addEventListener('hashchange', handleHashChange);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []);

    const navigate = useCallback((path: string) => {
        const normalizedPath = path.startsWith('/')
            ? path
            : `/${path}`;

        window.location.hash = normalizedPath;
    }, []);

    return {
        route,
        navigate,
    };
};