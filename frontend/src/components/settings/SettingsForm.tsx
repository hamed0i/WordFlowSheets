import {toPersianDigits} from '../../utils/numbers';
import {formatIncreaseInput, normalizeNumberInput} from '../../utils/numbers';
import {LocalizedNumberInput} from '../form/LocalizedNumberInput';
import {useEffect, useState} from 'react';
import type {FormEvent} from 'react';
import {
    LoaderCircle,
    RefreshCw,
    Save,
    X,
} from 'lucide-react';
import {settingsApi} from '../../api/settings';
import {formToSetting} from '../../api/settingsMapper';
import {sheetSettingFormSchema} from '../../schemas/settings';
import {
    emptySheetSettingForm,
    type SheetSetting,
    type SheetSettingForm,
} from '../../types/settings';
import {MultiSelect} from '../form/MultiSelect';

type SettingsFormProps = {
    setting?: SheetSetting | null;
    onSaved: () => void;
    onCancel: () => void;
};

const settingToForm = (
    setting: SheetSetting | null | undefined,
): SheetSettingForm => {
    if (!setting) {
        return emptySheetSettingForm();
    }

    return {
        slug: setting.slug,
        name: setting.name,
        credentials: {
            spreadsheetId: setting.credentials.spreadsheetId,
            apiKey: '',
            sheetName: setting.credentials.sheetName,
            range: setting.credentials.range,
        },
        sync_all: setting.sync_all === 'on',
        productColumn: setting.productColumn,
        variationColumn: setting.variationColumn,
        priceColumn: setting.priceColumn,
        upscalePercent: setting.upscalePercent,
        priceIncrease: setting.priceIncrease ?? `${setting.upscalePercent}%`,
        defaultStockQuantity: setting.defaultStockQuantity ?? 1,
        roundingZeros: setting.roundingZeros ?? 3,
        bulkConcurrency: setting.bulkConcurrency,
        disabled: setting.disabled,
    };
};

export const SettingsForm = ({
                                 setting,
                                 onSaved,
                                 onCancel,
                             }: SettingsFormProps) => {
    const [form, setForm] = useState<SheetSettingForm>(
        settingToForm(setting),
    );
    const [saving, setSaving] = useState(false);
    const [loadingHeaders, setLoadingHeaders] = useState(false);
    const [headers, setHeaders] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [headersError, setHeadersError] = useState<string | null>(
        null,
    );

    useEffect(() => {
        setForm(settingToForm(setting));
        setHeaders([]);
        setError(null);
        setHeadersError(null);

        if (!setting) {
            return;
        }

        let cancelled = false;

        const loadHeaders = async () => {
            setLoadingHeaders(true);

            try {
                const response =
                    await settingsApi.getHeadersForSetting(setting.slug);

                if (!cancelled) {
                    setHeaders(response.data);
                }
            } catch (error) {
                if (!cancelled) {
                    setHeadersError(
                        error instanceof Error
                            ? error.message
                            : 'دریافت Headerهای شیت با خطا مواجه شد.',
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingHeaders(false);
                }
            }
        };

        void loadHeaders();

        return () => {
            cancelled = true;
        };
    }, [setting]);

    const updateField = <K extends keyof SheetSettingForm>(
        field: K,
        value: SheetSettingForm[K],
    ) => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const updateCredentials = <
        K extends keyof SheetSettingForm['credentials']
    >(
        field: K,
        value: SheetSettingForm['credentials'][K],
    ) => {
        setHeaders([]);
        setHeadersError(null);

        setForm((current) => ({
            ...current,
            credentials: {
                ...current.credentials,
                [field]: value,
            },
            productColumn: [],
            variationColumn: [],
            priceColumn: [],
        }));
    };

    const handleLoadHeaders = async () => {
        if (loadingHeaders || saving) {
            return;
        }

        setHeadersError(null);
        setLoadingHeaders(true);

        try {
            const response = await settingsApi.getHeaders({
                spreadsheetId: form.credentials.spreadsheetId,
                apiKey: form.credentials.apiKey,
                sheetName: form.credentials.sheetName,
                range: form.credentials.range,
            });

            setHeaders(response.data);
        } catch (error) {
            setHeaders([]);

            setHeadersError(
                error instanceof Error
                    ? error.message
                    : 'دریافت Headerهای شیت با خطا مواجه شد.',
            );
        } finally {
            setLoadingHeaders(false);
        }
    };

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        setError(null);

        const result = sheetSettingFormSchema.safeParse(form);

        if (!result.success) {
            setError(
                result.error.issues[0]?.message ??
                'اطلاعات فرم معتبر نیست.',
            );
            return;
        }

        setSaving(true);

        try {
            await settingsApi.save(formToSetting(result.data));
            onSaved();
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'ذخیره تنظیمات با خطا مواجه شد.',
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
            <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-base font-semibold text-slate-900">
                    {setting ? 'ویرایش شیت' : 'افزودن شیت'}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                    اطلاعات اتصال و تنظیمات لیست قیمت را وارد کنید.
                </p>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-2">
                <div>
                    <label
                        htmlFor="setting-name"
                        className="mb-2 block text-sm font-medium text-slate-700"
                    >
                        نام
                    </label>

                    <input
                        id="setting-name"
                        type="text"
                        value={form.name}
                        onChange={(event) =>
                            updateField('name', event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />
                </div>

                <div>
                    <label
                        htmlFor="setting-slug"
                        className="mb-2 block text-sm font-medium text-slate-700"
                    >
                        شناسه
                    </label>

                    <input
                        id="setting-slug"
                        type="text"
                        value={form.slug}
                        onChange={(event) =>
                            updateField('slug', event.target.value)
                        }
                        disabled={Boolean(setting)}
                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition disabled:bg-slate-50 disabled:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />
                </div>

                <div>
                    <label
                        htmlFor="spreadsheet-id"
                        className="mb-2 block text-sm font-medium text-slate-700"
                    >
                        Spreadsheet ID
                    </label>

                    <input
                        id="spreadsheet-id"
                        type="text"
                        value={form.credentials.spreadsheetId}
                        onChange={(event) =>
                            updateCredentials(
                                'spreadsheetId',
                                event.target.value,
                            )
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />
                </div>

                <div>
                    <label
                        htmlFor="api-key"
                        className="mb-2 block text-sm font-medium text-slate-700"
                    >
                        API Key
                    </label>

                    <input
                        id="api-key"
                        type="password"
                        value={form.credentials.apiKey}
                        onChange={(event) =>
                            updateCredentials(
                                'apiKey',
                                event.target.value,
                            )
                        }
                        placeholder={
                            setting?.credentials.hasApiKey
                                ? 'برای حفظ API Key خالی بگذارید'
                                : 'API Key را وارد کنید'
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 "
                    />
                </div>

                <div>
                    <label
                        htmlFor="sheet-name"
                        className="mb-2 block text-sm font-medium text-slate-700"
                    >
                        نام Sheet
                    </label>

                    <input
                        id="sheet-name"
                        type="text"
                        value={form.credentials.sheetName}
                        onChange={(event) =>
                            updateCredentials(
                                'sheetName',
                                event.target.value,
                            )
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />
                </div>

                <div>
                    <label
                        htmlFor="sheet-range"
                        className="mb-2 block text-sm font-medium text-slate-700"
                    >
                        Range
                    </label>

                    <input
                        id="sheet-range"
                        type="text"
                        value={form.credentials.range}
                        onChange={(event) =>
                            updateCredentials(
                                'range',
                                event.target.value,
                            )
                        }
                        placeholder="A:Z"
                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />
                </div>
            </div>
            <div className="border-t border-slate-200 px-6 py-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800">
                            Headerهای شیت
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                            ابتدا Headerهای شیت را دریافت کنید و سپس ستون‌های مورد استفاده را انتخاب کنید.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => void handleLoadHeaders()}
                        disabled={
                            loadingHeaders ||
                            saving ||
                            !form.credentials.spreadsheetId ||
                            !form.credentials.apiKey ||
                            !form.credentials.sheetName ||
                            !form.credentials.range
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <RefreshCw
                            className={`size-4 ${
                                loadingHeaders
                                    ? 'animate-spin'
                                    : ''
                            }`}
                        />

                        {loadingHeaders
                            ? 'در حال دریافت...'
                            : 'دریافت Headerها'}
                    </button>
                </div>

                {headersError && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {toPersianDigits(headersError!)}
                    </div>
                )}

                {headers.length > 0 && (
                    <div className="grid gap-6 lg:grid-cols-3">
                        <MultiSelect
                            label="ستون محصول"
                            options={headers}
                            value={form.productColumn}
                            onChange={(value) =>
                                updateField(
                                    'productColumn',
                                    value,
                                )
                            }
                            placeholder="ستون‌های محصول را انتخاب کنید"
                            searchPlaceholder="جستجوی Header محصول..."
                        />

                        <MultiSelect
                            label="ستون ویژگی"
                            options={headers}
                            value={form.variationColumn}
                            onChange={(value) =>
                                updateField(
                                    'variationColumn',
                                    value,
                                )
                            }
                            placeholder="ستون‌های ویژگی را انتخاب کنید"
                            searchPlaceholder="جستجوی Header ویژگی..."
                        />

                        <MultiSelect
                            label="ستون قیمت"
                            options={headers}
                            value={form.priceColumn}
                            onChange={(value) =>
                                updateField(
                                    'priceColumn',
                                    value,
                                )
                            }
                            placeholder="ستون‌های قیمت را انتخاب کنید"
                            searchPlaceholder="جستجوی Header قیمت..."
                        />
                    </div>
                )}

                {!loadingHeaders &&
                    !headersError &&
                    headers.length === 0 && (
                        <div
                            className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                            هنوز Headerهای شیت دریافت نشده‌اند.
                        </div>
                    )}
            </div>
            <div className="grid gap-6 p-6 lg:grid-cols-2 border-t border-slate-200 px-6 py-5">
                <div>
                    <label
                        htmlFor="upscale-percent"
                        className="mb-2 block text-sm font-medium text-slate-700"
                    >
                        افزایش قیمت
                    </label>

                    <input
                        id="upscale-percent"
                        type="text"
                        dir="ltr"
                        placeholder="۱۰٪ یا ۲۰٬۰۰۰"
                        aria-describedby="price-increase-help"
                        value={formatIncreaseInput(form.priceIncrease)}
                        onChange={(event) =>
                            updateField(
                                'priceIncrease',
                                normalizeNumberInput(event.target.value),
                            )
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />
                <p id="price-increase-help" className="mt-2 text-xs text-slate-500">مثلاً ۱۰٪ برای افزایش درصدی یا ۲۰۰۰۰ برای افزودن ۲۰٬۰۰۰ تومان. گردکردن فقط برای حالت درصدی است.</p>
                </div>

                {/[٪%]/.test(form.priceIncrease) && (
                    <div>
                        <label htmlFor="rounding-zeros" className="mb-2 block text-sm font-medium text-slate-700">تعداد صفرهای گردکردن رو به بالا</label>
                        <select id="rounding-zeros" value={form.roundingZeros}
                            onChange={(event) => updateField('roundingZeros', Number(event.target.value))}
                            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">
                            {Array.from({length: 10}, (_, zeros) => <option key={zeros} value={zeros}>
                                {zeros === 0 ? 'بدون صفر — عدد صحیح' : `${zeros.toLocaleString('fa-IR')} صفر — مضرب ${(10 ** zeros).toLocaleString('fa-IR')}`}
                            </option>)}
                        </select>
                    </div>
                )}
                <div>
                    <label
                        htmlFor="bulk-concurrency"
                        className="mb-2 block text-sm font-medium text-slate-700"
                    >
                        تعداد پردازش همزمان
                    </label>

                    <LocalizedNumberInput
                        id="bulk-concurrency"
                        min={1}
                        max={20}
                        step={1}
                        value={form.bulkConcurrency}
                        onValueChange={(value) =>
                            updateField(
                                'bulkConcurrency',
                                value,
                            )
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />
                </div>
                <div>
                    <label htmlFor="default-stock-quantity" className="mb-2 block text-sm font-medium text-slate-700">
                        تعداد موجودی پیش‌فرض
                    </label>
                    <LocalizedNumberInput
                        id="default-stock-quantity"
                        dir="ltr"
                        min={-1}
                        max={2147483647}
                        step={1}
                        aria-describedby="default-stock-quantity-help"
                        value={form.defaultStockQuantity}
                        onValueChange={(value) => updateField('defaultStockQuantity', value)}
                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />
                    <p id="default-stock-quantity-help" className="mt-2 text-xs leading-5 text-slate-500">
                        برای همهٔ ردیف‌هایی که تعداد اختصاصی ندارند. با ذخیرهٔ تعداد در جدول، مقدار همان ردیف اولویت دارد. مقدار −۱ یعنی حفظ موجودی فعلی ووکامرس.
                    </p>
                </div>
                <label className="flex cursor-pointer items-center gap-3">
                    <input
                        type="checkbox"
                        checked={form.sync_all}
                        onChange={(event) =>
                            updateField(
                                'sync_all',
                                event.target.checked,
                            )
                        }
                        className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />

                    <span className="text-sm text-slate-700">
                            استفاده در بروزرسانی همه لیست‌ها
                        </span>
                </label>

                <label className="flex cursor-pointer items-center gap-3">
                    <input
                        type="checkbox"
                        checked={form.disabled}
                        onChange={(event) =>
                            updateField(
                                'disabled',
                                event.target.checked,
                            )
                        }
                        className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />

                    <span className="text-sm text-slate-700">
                            غیرفعال کردن این لیست
                        </span>
                </label>
            </div>
            {error && (
                <div className="mx-6 mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {toPersianDigits(error!)}
                </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-5">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={saving}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <X className="size-4"/>
                    انصراف
                </button>

                <button
                    type="submit"
                    disabled={saving || loadingHeaders}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {saving ? (
                        <LoaderCircle className="size-4 animate-spin"/>
                    ) : (
                        <Save className="size-4"/>
                    )}

                    {saving
                        ? 'در حال ذخیره...'
                        : 'ذخیره تنظیمات'}
                </button>
            </div>
        </form>
    );
};