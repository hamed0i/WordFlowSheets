import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'حالت روشن' : 'حالت تیره'}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
            {theme === 'dark' ? (
                <Sun className="size-4 text-amber-400" />
            ) : (
                <Moon className="size-4 text-slate-600" />
            )}
        </button>
    );
};