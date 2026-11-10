import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export const useTheme = () => {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('sheets_updater_theme');
        if (saved === 'dark' || saved === 'light') {
            return saved;
        }
        return 'light';
    });

    useEffect(() => {
        const appRoot = document.getElementById('sheets-excel-updater-app');

        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            appRoot?.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
            appRoot?.classList.remove('dark');
        }

        localStorage.setItem('sheets_updater_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    return { theme, setTheme, toggleTheme };
};