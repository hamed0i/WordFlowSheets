import {toPersianDigits} from '../../utils/numbers';
import { useCallback, useEffect, useState } from 'react';
import {
    LoaderCircle,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { settingsApi } from '../../api/settings';
import type { SheetSetting } from '../../types/settings';
import { SettingsForm } from './SettingsForm';
import { SettingsHeader } from './SettingsHeader';

export const SettingsPage = () => {
    const [dragged, setDragged] = useState<string | null>(null);
    const [reordering, setReordering] = useState(false);
    const [settings, setSettings] = useState<SheetSetting[]>([]);
    const [editingSetting, setEditingSetting] =
        useState<SheetSetting | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadSettings = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await settingsApi.getAll();
            setSettings(response.data);
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'دریافت تنظیمات با خطا مواجه شد.',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadSettings();
    }, [loadSettings]);

    const moveSetting = async (source: string, target: string) => {
        if (reordering || deletingSlug || source === target) return;
        const previous = settings;
        const next = [...settings];
        const from = next.findIndex(s => s.slug === source), to = next.findIndex(s => s.slug === target);
        if (from < 0 || to < 0) return;
        next.splice(to, 0, next.splice(from, 1)[0]);
        setSettings(next); setReordering(true); setError(null); setDragged(null);
        try { setSettings((await settingsApi.reorder(next.map(s => s.slug))).data); }
        catch (error) { setSettings(previous); setError(error instanceof Error ? error.message : 'ذخیره ترتیب انجام نشد.'); }
        finally { setReordering(false); }
    };
    const handleCreate = () => {
        setEditingSetting(null);
        setIsFormOpen(true);
        setError(null);
    };

    const handleEdit = (setting: SheetSetting) => {
        setEditingSetting(setting);
        setIsFormOpen(true);
        setError(null);
    };

    const handleSaved = async () => {
        setIsFormOpen(false);
        setEditingSetting(null);
        await loadSettings();
    };

    const handleCancel = () => {
        setIsFormOpen(false);
        setEditingSetting(null);
        setError(null);
    };

    const handleDelete = async (setting: SheetSetting) => {
        if (deletingSlug) {
            return;
        }

        const confirmed = window.confirm(
            `آیا از حذف «${setting.name}» مطمئن هستید؟\n\nتمام اطلاعات ذخیره‌شده این لیست نیز حذف خواهد شد.`,
        );

        if (!confirmed) {
            return;
        }

        setDeletingSlug(setting.slug);
        setError(null);

        try {
            await settingsApi.remove(setting.slug);

            if (editingSetting?.slug === setting.slug) {
                setIsFormOpen(false);
                setEditingSetting(null);
            }

            await loadSettings();
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'حذف تنظیمات با خطا مواجه شد.',
            );
        } finally {
            setDeletingSlug(null);
        }
    };
// درون کامپوننت SettingsPage:
    const [searchMetaKey, setSearchMetaKey] = useState('');
    const [worker, setWorker] = useState({useWorker: false, workerUrl: '', workerToken: '', hasWorkerToken: false});
    const [loadingGeneral, setLoadingGeneral] = useState(true);
    const [generalError, setGeneralError] = useState(false);
    const [savingMeta, setSavingMeta] = useState(false);
    const [metaMessage, setMetaMessage] = useState<string | null>(null);

    useEffect(() => {
        settingsApi.getGeneralSettings().then((res) => {
            setSearchMetaKey(res.data.searchMetaKey);
            setWorker({...res.data.worker, workerToken: ''});
        }).catch(() => {setGeneralError(true); setMetaMessage('دریافت تنظیمات عمومی ناموفق بود؛ صفحه را بازخوانی کنید.');}).finally(() => setLoadingGeneral(false));
    }, []);

    const handleSaveGeneralSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingMeta(true);
        setMetaMessage(null);
        try {
            const response = await settingsApi.updateGeneralSettings(searchMetaKey, worker);
            setWorker({...response.data.worker, workerToken: ''});
            setMetaMessage('تنظیمات عمومی با موفقیت ذخیره شد.');
        } catch (error) {
            setMetaMessage(error instanceof Error ? error.message : 'خطا در ذخیره تنظیمات عمومی.');
        } finally {
            setSavingMeta(false);
        }
    };
    if (isFormOpen) {
        return (
            <div className="app-page">
                {/*<SettingsHeader />*/}

                <SettingsForm
                    setting={editingSetting}
                    onSaved={() => void handleSaved()}
                    onCancel={handleCancel}
                />
            </div>
        );
    }

    return (
        <div className="app-page">
            <SettingsHeader />
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    تنظیمات عمومی افزونه
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    کلید متادیتا برای جستجوی پیشرفته و نمایش اطلاعات تکمیلی محصول (مانند SKU یا شناسه انبار)
                </p>

                <form onSubmit={handleSaveGeneralSettings} className="mt-4 space-y-5">
                    <div className="w-full sm:max-w-md">
                        <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                            کلید متای جستجو (Meta Key)
                        </label>
                        <input
                            type="text"
                            dir="ltr"
                            value={searchMetaKey}
                            onChange={(e) => setSearchMetaKey(e.target.value)}
                            placeholder="مثال: _sku یا custom_barcode"
                            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                        />
                    </div>

                    <fieldset disabled={loadingGeneral || generalError || savingMeta} className="border-t border-slate-200 pt-5">
                        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700">
                            <input type="checkbox" checked={worker.useWorker}
                                onChange={(e) => setWorker({...worker, useWorker: e.target.checked})}
                                className="size-4 rounded border-slate-300 text-blue-600" />
                            اتصال همهٔ شیت‌ها از طریق Cloudflare Worker
                        </label>
                        <p className="mt-2 text-xs text-slate-500">با فعال‌سازی، دریافت ستون‌ها و اطلاعات همهٔ شیت‌ها از این ورکر انجام می‌شود.</p>
                        {worker.useWorker && <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <div>
                                <label htmlFor="worker-url" className="mb-2 block text-xs font-medium text-slate-700">آدرس ورکر</label>
                                <input id="worker-url" type="url" required dir="ltr" value={worker.workerUrl}
                                    placeholder="https://sheets-proxy.example.workers.dev"
                                    onChange={(e) => setWorker({...worker, workerUrl: e.target.value})}
                                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label htmlFor="worker-token" className="mb-2 block text-xs font-medium text-slate-700">کلید محرمانه ورکر (WORKER_TOKEN)</label>
                                <input id="worker-token" type="password" dir="ltr" autoComplete="new-password" value={worker.workerToken}
                                    required={!worker.hasWorkerToken} minLength={32} maxLength={256}
                                    placeholder={worker.hasWorkerToken ? 'برای حفظ کلید قبلی خالی بگذارید' : 'حداقل ۳۲ کاراکتر؛ علامت‌های ویژه مجازند، بدون فاصله'}
                                    onChange={(e) => setWorker({...worker, workerToken: e.target.value})}
                                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500" />
                            </div>
                        </div>}
                    </fieldset>

                    <button
                        type="submit"
                        disabled={savingMeta || loadingGeneral || generalError}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                        {savingMeta ? 'در حال ذخیره...' : 'ذخیره تنظیمات عمومی'}
                    </button>

                    {metaMessage && (
                        <span className="text-xs font-medium text-emerald-600 self-center">
                {toPersianDigits(metaMessage!)}
            </span>
                    )}
                </form>
            </div>
            {error && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
                    {toPersianDigits(error!)}
                </div>
            )}

            <div className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">
                        لیست تنظیمات
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        برای تغییر اولویت، ردیف‌ها را بکشید و رها کنید. ترتیب جدید خودکار ذخیره می‌شود.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleCreate}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                    <Plus className="size-4" />
                    افزودن شیت
                </button>
            </div>

            {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
                    در حال دریافت تنظیمات...
                </div>
            ) : settings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100">
                        <Plus className="size-5 text-slate-500" />
                    </div>

                    <h3 className="mt-4 text-sm font-semibold text-slate-800">
                        هنوز شیتی اضافه نشده است
                    </h3>

                    <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                        برای شروع، اولین لیست قیمت خود را اضافه کنید.
                    </p>

                    <button
                        type="button"
                        onClick={handleCreate}
                        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700"
                    >
                        <Plus className="size-4" />
                        افزودن شیت
                    </button>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500">
                                        نام
                                    </th>

                                    <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500">
                                        شناسه
                                    </th>

                                    <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500">
                                        Spreadsheet
                                    </th>

                                    <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500">
                                        وضعیت
                                    </th>

                                    <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500">
                                        بروزرسانی همه
                                    </th>

                                    <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500">
                                        عملیات
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {settings.map((setting, index) => {
                                    const isDeleting =
                                        deletingSlug === setting.slug;

                                    return (
                                        <tr
                                            key={setting.slug}
                                            draggable={!reordering && !deletingSlug}
                                            onDragStart={event => {setDragged(setting.slug); event.dataTransfer.setData('text/plain', setting.slug); event.dataTransfer.effectAllowed = 'move';}}
                                            onDragEnd={() => setDragged(null)}
                                            onDragOver={event => {if (!reordering) event.preventDefault();}}
                                            onDrop={event => {event.preventDefault(); void moveSetting(dragged || event.dataTransfer.getData('text/plain'), setting.slug);}}
                                            style={{opacity: dragged === setting.slug ? 0.45 : 1}}
                                            className="transition hover:bg-slate-50"
                                        >
                                            <td className="px-5 py-4">
                                                <span className="text-sm font-medium text-slate-800">
                                                    <span aria-hidden="true" className="ml-2 cursor-grab">⠿</span>
                                                    {toPersianDigits(setting.name)}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                                    {toPersianDigits(setting.slug)}
                                                </code>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="max-w-[260px]">
                                                    <div className="truncate text-sm text-slate-700">
                                                        {toPersianDigits(setting.credentials.spreadsheetId)}
                                                    </div>

                                                    <div className="mt-1 text-xs text-slate-400">
                                                        {toPersianDigits(setting.credentials.sheetName)}
                                                        {' · '}
                                                        {toPersianDigits(setting.credentials.range)}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                {setting.disabled ? (
                                                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                                                        غیرفعال
                                                    </span>
                                                ) : (
                                                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                        فعال
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                {setting.sync_all === 'on' ? (
                                                    <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                                        فعال
                                                    </span>
                                                ) : (
                                                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                                                        غیرفعال
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button type="button" aria-label={`افزایش اولویت ${setting.name}`} disabled={reordering || Boolean(deletingSlug) || index === 0} onClick={() => void moveSetting(setting.slug, settings[index - 1].slug)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-30">↑</button>
                                                    <button type="button" aria-label={`کاهش اولویت ${setting.name}`} disabled={reordering || Boolean(deletingSlug) || index === settings.length - 1} onClick={() => void moveSetting(setting.slug, settings[index + 1].slug)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-30">↓</button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleEdit(setting)
                                                        }
                                                        disabled={Boolean(
                                                            deletingSlug || reordering,
                                                        )}
                                                        className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        title="ویرایش"
                                                    >
                                                        <Pencil className="size-4" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            void handleDelete(
                                                                setting,
                                                            )
                                                        }
                                                        disabled={Boolean(
                                                            deletingSlug || reordering,
                                                        )}
                                                        className="inline-flex size-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        title="حذف"
                                                    >
                                                        {isDeleting ? (
                                                            <LoaderCircle className="size-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="size-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};