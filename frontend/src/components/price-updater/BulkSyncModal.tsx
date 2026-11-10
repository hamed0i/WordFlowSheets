import {toPersianDigits} from '../../utils/numbers';
import { useState } from 'react';
import { Check, Database, LoaderCircle, RefreshCw, X, AlertCircle } from 'lucide-react';
import { priceUpdaterApi } from '../../api/priceUpdater';
import type { SheetSetting } from '../../types/settings';

type BulkSyncModalProps = {
    open: boolean;
    settings: SheetSetting[];
    onClose: () => void;
    onSyncCompleted: () => void;
};

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

type SheetSyncState = {
    status: SyncStatus;
    counter: number;
    error: string | null;
};

export const BulkSyncModal = ({
                                  open,
                                  settings,
                                  onClose,
                                  onSyncCompleted,
                              }: BulkSyncModalProps) => {
    const [states, setStates] = useState<Record<string, SheetSyncState>>({});
    const [isSyncingAll, setIsSyncAll] = useState(false);

    if (!open) {
        return null;
    }

    const availableSettings = settings.filter((item) => !item.disabled);
    const busy = isSyncingAll || Object.values(states).some(s => s.status === 'syncing');

    const syncSingleSheet = async (slug: string): Promise<boolean> => {
        setStates((prev) => ({
            ...prev,
            [slug]: { status: 'syncing', counter: 0, error: null },
        }));

        try {
            const response = await priceUpdaterApi.sync(slug);
            setStates((prev) => ({
                ...prev,
                [slug]: {
                    status: 'success',
                    counter: response.data.counter,
                    error: null,
                },
            }));
            return true;
        } catch (error) {
            setStates((prev) => ({
                ...prev,
                [slug]: {
                    status: 'error',
                    counter: 0,
                    error: error instanceof Error ? error.message : 'خطا در همگام‌سازی',
                },
            }));
            return false;
        }
    };

    const handleSyncAll = async () => {
        setIsSyncAll(true);
        let anySuccess = false;

        for (const sheet of availableSettings) {
            const ok = await syncSingleSheet(sheet.slug);
            if (ok) anySuccess = true;
        }

        setIsSyncAll(false);
        if (anySuccess) {
            onSyncCompleted();
        }
    };

    const handleSingleClick = async (slug: string) => {
        const ok = await syncSingleSheet(slug);
        if (ok) {
            onSyncCompleted();
        }
    };

    const totalSyncedCount = Object.values(states).reduce(
        (sum, item) => sum + (item.status === 'success' ? item.counter : 0),
        0
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="بستن"
                onClick={() => {if (!busy) onClose();}}
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />

            <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">
                            همگام‌سازی شیت‌ها
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                            بروزرسانی داده‌های ذخیره شده از Google Sheets به دیتابیس
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {if (!busy) onClose();}}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* شمارنده تجمیعی مطابق با قالب قبلی */}
                    <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-900">
                        <span className="text-sm font-medium">مجموع ردیف‌های سینک شده:</span>
                        <span className="text-base font-bold">
                            {totalSyncedCount.toLocaleString('fa-IR')}
                        </span>
                    </div>

                    <div className="space-y-2">
                        {availableSettings.map((sheet) => {
                            const state = states[sheet.slug] || {
                                status: 'idle',
                                counter: 0,
                                error: null,
                            };
                            const isBusy = state.status === 'syncing';

                            return (
                                <div
                                    key={sheet.slug}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium text-slate-800">
                                            {toPersianDigits(sheet.name)}
                                        </div>
                                        <div className="text-xs text-slate-400">{toPersianDigits(sheet.slug)}</div>

                                        {state.error && (
                                            <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                                                <AlertCircle className="size-3" />
                                                {toPersianDigits(state.error!)}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {state.status === 'success' && (
                                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                <Check className="size-3.5" />
                                                {state.counter.toLocaleString('fa-IR')} مورد
                                            </span>
                                        )}

                                        <button
                                            type="button"
                                            disabled={isBusy || busy}
                                            onClick={() => void handleSingleClick(sheet.slug)}
                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            {isBusy ? (
                                                <LoaderCircle className="size-3.5 animate-spin" />
                                            ) : (
                                                <RefreshCw className="size-3.5" />
                                            )}
                                            سینک
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50">
                    <button
                        type="button"
                        onClick={() => {if (!busy) onClose();}}
                        disabled={busy}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white"
                    >
                        بستن
                    </button>

                    <button
                        type="button"
                        onClick={() => void handleSyncAll()}
                        disabled={busy || availableSettings.length === 0}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSyncingAll ? (
                            <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                            <Database className="size-4" />
                        )}
                        همگام‌سازی همه شیت‌ها
                    </button>
                </div>
            </div>
        </div>
    );
};