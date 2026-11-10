import {toPersianDigits} from '../../utils/numbers';
import type { SheetSetting } from '../../types/settings';

type SettingsListProps = {
    settings: SheetSetting[];
    onEdit: (setting: SheetSetting) => void;
    onDelete: (setting: SheetSetting) => void;
    deletingSlug: string | null;
};

const SettingsList = ({
                          settings,
                          onEdit,
                          onDelete,
                          deletingSlug,
                      }: SettingsListProps) => {
    if (settings.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="text-sm font-medium text-slate-700">
                    هنوز تنظیماتی ثبت نشده است.
                </p>

                <p className="mt-2 text-sm text-slate-500">
                    برای شروع، یک اتصال جدید به شیت ایجاد کنید.
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {settings.map((setting) => {
                const isDeleting = deletingSlug === setting.slug;

                return (
                    <article
                        key={setting.slug}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <h2 className="truncate text-base font-semibold text-slate-900">
                                    {toPersianDigits(setting.name)}
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    {toPersianDigits(setting.slug)}
                                </p>
                            </div>

                            <span
                                className={[
                                    'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
                                    setting.disabled
                                        ? 'bg-slate-100 text-slate-600'
                                        : 'bg-emerald-50 text-emerald-700',
                                ].join(' ')}
                            >
                                {setting.disabled ? 'غیرفعال' : 'فعال'}
                            </span>
                        </div>

                        <div className="mt-5 space-y-3">
                            <div>
                                <p className="text-xs text-slate-400">
                                    نام شیت
                                </p>

                                <p className="mt-1 text-sm text-slate-700">
                                    {toPersianDigits(setting.credentials.sheetName)}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs text-slate-400">
                                    محدوده
                                </p>

                                <p
                                    className="mt-1 truncate text-sm text-slate-700"
                                    dir="ltr"
                                >
                                    {toPersianDigits(setting.credentials.range)}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-xs text-slate-400">
                                        محصول
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-slate-800">
                                        {setting.productColumn.length.toLocaleString('fa-IR')}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-xs text-slate-400">
                                        تنوع
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-slate-800">
                                        {setting.variationColumn.length.toLocaleString('fa-IR')}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-xs text-slate-400">
                                        قیمت
                                    </p>

                                    <p className="mt-1 text-sm font-medium text-slate-800">
                                        {setting.priceColumn.length.toLocaleString('fa-IR')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                            <div className="text-xs text-slate-500">
                                همگام‌سازی:

                                <span className="mr-1 font-medium text-slate-700">
                                    {setting.sync_all === 'on'
                                        ? 'فعال'
                                        : 'غیرفعال'}
                                </span>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => onEdit(setting)}
                                    disabled={isDeleting}
                                    className="rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    ویرایش
                                </button>

                                <button
                                    type="button"
                                    onClick={() => onDelete(setting)}
                                    disabled={isDeleting}
                                    className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isDeleting
                                        ? 'در حال حذف...'
                                        : 'حذف'}
                                </button>
                            </div>
                        </div>
                    </article>
                );
            })}
        </div>
    );
};

export default SettingsList;