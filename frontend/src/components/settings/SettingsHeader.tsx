import { ArrowRight } from 'lucide-react';
import { useHashRoute } from '../../hooks/useHashRoute';
import { ThemeToggle } from '../common/ThemeToggle';

export const SettingsHeader = () => {
    const { navigate } = useHashRoute();

    return (
        <header className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                    تنظیمات شیت و اکسل
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    مدیریت اتصال و تنظیمات لیست‌های قیمت
                </p>
            </div>

            <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                    <ArrowRight className="size-4" />
                    بازگشت
                </button>
            </div>
        </header>
    );
};