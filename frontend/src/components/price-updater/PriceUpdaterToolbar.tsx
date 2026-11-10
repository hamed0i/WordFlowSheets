import {BulkUpdateButton} from './BulkUpdateButton';
import { useState } from 'react';
import { Database, Settings } from 'lucide-react';
import { useHashRoute } from '../../hooks/useHashRoute';
import { BulkSyncModal } from './BulkSyncModal';
import type { SheetSetting } from '../../types/settings';
import { ThemeToggle } from '../common/ThemeToggle';

type PriceUpdaterToolbarProps = {
    settings?: SheetSetting[];
    onSyncCompleted?: () => void;
};

export const PriceUpdaterToolbar = ({
                                        settings = [],
                                        onSyncCompleted,
                                    }: PriceUpdaterToolbarProps) => {
    const { navigate } = useHashRoute();
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

    return (
        <>
            <header className="mb-6 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                <div className="flex items-center justify-between gap-6">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900">
                            شیت و اکسل
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            مدیریت و بروزرسانی قیمت محصولات
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <BulkUpdateButton settings={settings} onCompleted={() => onSyncCompleted?.()} />
                        <button
                            type="button"
                            onClick={() => setIsSyncModalOpen(true)}
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            title="همگام‌سازی شیت‌ها"
                        >
                            <Database className="size-4 text-blue-600" />
                            همگام‌سازی شیت‌ها
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/settings')}
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            <Settings className="size-4" />
                            تنظیمات
                        </button>
                    </div>
                </div>
            </header>

            <BulkSyncModal
                open={isSyncModalOpen}
                settings={settings}
                onClose={() => setIsSyncModalOpen(false)}
                onSyncCompleted={() => {
                    onSyncCompleted?.();
                }}
            />
        </>
    );
};