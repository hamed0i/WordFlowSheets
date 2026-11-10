import {toPersianDigits, normalizeNumberInput, parseNumberInput} from '../../utils/numbers';
import { useEffect, useState } from 'react';
import {
    Check,
    Link,
    LoaderCircle,
    Pause,
    Play,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { priceUpdaterApi } from '../../api/priceUpdater';
import type { ProductVariation } from '../../types/products';
import type { PriceUpdaterRow } from '../../types/priceUpdater';
import { ProductSearchModal } from './ProductSearchModal';
import {UpdateProgressModal} from './UpdateProgressModal';
import type {StartUpdateItem} from '../../types/priceUpdater';

type PriceUpdaterTableRowProps = {
    row: PriceUpdaterRow;
    onRowUpdate: (
        rowId: number,
        changes: Partial<PriceUpdaterRow>,
    ) => void;
};

type Operation =
    | 'quantity'
    | 'connect'
    | 'sync'
    | 'hold'
    | 'delete'
    | null;

const formatPrice = (price: number): string => {
    if (price <= 0) {
        return '—';
    }

    return `${price.toLocaleString('fa-IR')} تومان`;
};

export const PriceUpdaterTableRow = ({
                                         row,
                                         onRowUpdate,
                                     }: PriceUpdaterTableRowProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [syncOpen, setSyncOpen] = useState(false);
    const [syncCurrent, setSyncCurrent] = useState<StartUpdateItem | null>(null);
    const [syncItem, setSyncItem] = useState<StartUpdateItem | null>(null);
    const [operation, setOperation] = useState<Operation>(null);
    const [error, setError] = useState<string | null>(null);

    const [quantity, setQuantity] = useState(String(row.stockQuantity));
    const [quantitySaved, setQuantitySaved] = useState(false);
    useEffect(() => {
        setQuantity(String(row.stockQuantity));
    }, [row.id, row.stockQuantity]);
    const saveQuantity = async (event: React.FormEvent): Promise<void> => {
        event.preventDefault();
        if (operation !== null) return;
        const value = parseNumberInput(quantity);
        if (!Number.isInteger(value) || (value !== -1 && value < 1) || value > 2147483647) {
            setError('موجودی باید ۱- یا عدد صحیح حداقل ۱ باشد.');
            return;
        }
        setError(null);
        setQuantitySaved(false);
        setOperation('quantity');
        try {
            const response = await priceUpdaterApi.updateStockQuantity(row.slug, row.id, value);
            onRowUpdate(row.id, {stockQuantity: response.data.stockQuantity, stockQuantityOverride: response.data.stockQuantityOverride});
            setQuantitySaved(true);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'ذخیره موجودی انجام نشد.');
        } finally {
            setOperation(null);
        }
    };

    const isBusy = operation !== null;

    const getSitePriceBadge = () => {
        if (!row.connected || row.sitePrice <= 0) {
            return (
                <span className="text-sm text-slate-400">
                    {formatPrice(row.sitePrice)}
                </span>
            );
        }

        const isMatch = row.sitePrice === row.sheetPrice;

        return (
            <span
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-semibold transition ${
                    isMatch
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                }`}
            >
                {formatPrice(row.sitePrice)}
            </span>
        );
    };

    const handleConnect = async (
        variation: ProductVariation,
    ): Promise<void> => {
        if (isBusy) {
            return;
        }

        setError(null);
        setOperation('connect');

        try {
            const response = await priceUpdaterApi.connectVariation(
                row.slug,
                row.id,
                variation.id,
            );

            // استخراج نام ویژگی از اتریبیوت‌ها در صورت خالی بودن نام
            const resolvedVariationName =
                variation.name ||
                variation.attributes.map((attr) => attr.value).join(' - ') ||
                row.sheetVariation;

            // نام محصول والد: اگر از بک‌اند آمد از آن، در غیر این صورت نام فعلی
            const resolvedProductName =
                response.data.productName || row.product;

            onRowUpdate(row.id, {
                product: resolvedProductName,
                productName: resolvedProductName,
                productMetaValue: response.data.productMetaValue ?? row.productMetaValue ?? null,
                variation: resolvedVariationName,
                variationId: variation.id,
                variationName: resolvedVariationName,
                listName: response.data.listName ?? row.listName ?? '',
                connected: true,
                onHold: false,
            });

            setIsModalOpen(false);
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'اتصال Variation با خطا مواجه شد.',
            );
        } finally {
            setOperation(null);
        }
    };

    const handleSync = async (): Promise<void> => {
        if (isBusy) {
            return;
        }

        setError(null);
        setOperation('sync');
        setSyncItem(null);
        setSyncCurrent(null);
        setSyncOpen(true);

        try {
            const preview = await priceUpdaterApi.nextUpdate(row.slug, undefined, row.id - 1);
            setSyncCurrent(preview.data.item?.id === row.id ? preview.data.item : null);
            const response = await priceUpdaterApi.syncSingle(
                row.slug,
                row.id,
            );

            setSyncItem(response.data.details);
            onRowUpdate(row.id, {
                sitePrice: response.data.price,
                listName: response.data.listName ?? '',
            });
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'بروزرسانی ردیف با خطا مواجه شد.',
            );
        } finally {
            setOperation(null);
        }
    };

    const handleOnHold = async (): Promise<void> => {
        if (isBusy) {
            return;
        }

        const nextOnHold = !row.onHold;

        setError(null);
        setOperation('hold');

        try {
            await priceUpdaterApi.updateOnHold(
                row.slug,
                row.id,
                nextOnHold,
            );

            onRowUpdate(row.id, {
                onHold: nextOnHold,
            });
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'تغییر وضعیت ردیف با خطا مواجه شد.',
            );
        } finally {
            setOperation(null);
        }
    };

    const handleDelete = async (): Promise<void> => {
        if (isBusy) {
            return;
        }

        setError(null);
        setOperation('delete');

        try {
            await priceUpdaterApi.deleteConnection(
                row.slug,
                row.id,
            );

            onRowUpdate(row.id, {
                variation: row.sheetVariation,
                variationId: null,
                variationName: '',
                listName: '',
                sitePrice: 0,
                connected: false,
                onHold: false,
            });
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'حذف اتصال با خطا مواجه شد.',
            );
        } finally {
            setOperation(null);
        }
    };

    return (
        <>
            <tr className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                {/* ستون محصول و متادیتا */}
                <td className="px-4 py-4">
                    <div className="max-w-[320px]">
                        <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                            {toPersianDigits(row.product)}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            {row.productMetaValue && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    متا: {toPersianDigits(row.productMetaValue)}
                                </span>
                            )}
                            <span>ردیف: #{row.id.toLocaleString('fa-IR', { useGrouping: false })}</span>
                        </div>
                    </div>
                </td>

                {/* ستون ویژگی */}
                <td className="px-4 py-4">
                    <div className="flex flex-col">
                        {!row.connected ? (
                            /* وقتی متصل نیست: ویژگی ثبت‌شده در شیت نمایش داده می‌شود */
                            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                {toPersianDigits(row.sheetVariation || '—')}
                            </span>
                        ) : (
                            /* وقتی متصل است: عنوان ویژگی ووکامرس + ساب‌تایتل ویژگی شیت */
                            <>
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                    {toPersianDigits(row.variationName || row.variation || row.sheetVariation)}
                                </span>

                                {row.sheetVariation && (
                                    <span
                                        className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500 max-w-[220px]"
                                        title={row.sheetVariation}
                                    >
                                        شیت: {toPersianDigits(row.sheetVariation)}
                                    </span>
                                )}

                                {row.variationId && (
                                    <span className="mt-0.5 text-[11px] font-mono text-blue-600 dark:text-blue-400">
                                        شناسه متغیر: #{row.variationId.toLocaleString('fa-IR', { useGrouping: false })}
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                </td>

                {/* قیمت شیت */}
                <td className="px-4 py-4">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {formatPrice(row.sheetPrice)}
                    </span>
                </td>

                {/* قیمت سایت */}
                <td className="px-4 py-4">
                    {getSitePriceBadge()}
                </td>

                <td className="px-4 py-4">
                    <form onSubmit={(event) => void saveQuantity(event)} className="min-w-36 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                            <input
                                type="text" inputMode="text"
                                aria-label={`موجودی ${row.product} ${row.sheetVariation}`}
                                value={toPersianDigits(quantity)} disabled={isBusy}
                                onChange={(event) => {setQuantity(normalizeNumberInput(event.target.value)); setQuantitySaved(false);}}
                                className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            />
                            <button type="submit" disabled={isBusy || (row.stockQuantityOverride && quantity === String(row.stockQuantity))}
                                className="h-9 rounded-lg border border-blue-200 px-2 text-xs text-blue-600 disabled:opacity-40">
                                {operation === 'quantity' ? 'ذخیره…' : 'ذخیره'}
                            </button>
                        </div>
                        <p className="text-xs text-slate-400">{row.stockQuantityOverride ? 'تعداد اختصاصی' : 'پیش‌فرض تنظیمات'}</p>
                        {quantitySaved && <p role="status" className="text-xs text-emerald-600">ذخیره شد</p>}
                    </form>
                </td>

                {/* نام لیست قیمت */}
                <td className="px-4 py-4">
                    {row.listName ? (
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            {toPersianDigits(row.listName)}
                        </span>
                    ) : (
                        <span className="text-xs text-slate-400">
                            —
                        </span>
                    )}
                </td>

                {/* وضعیت اتصال */}
                <td className="px-4 py-4">
                    {row.onHold ? (
                        <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            متوقف
                        </span>
                    ) : row.connected ? (
                        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            متصل
                        </span>
                    ) : (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            متصل نیست
                        </span>
                    )}
                </td>

                {/* دکمه‌های عملیاتی */}
                <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                        {!row.connected ? (
                            <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => setIsModalOpen(true)}
                                title="اتصال Variation"
                                className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                            >
                                {operation === 'connect' ? (
                                    <LoaderCircle className="size-4 animate-spin" />
                                ) : (
                                    <Link className="size-4" />
                                )}
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleDelete()}
                                title="حذف اتصال"
                                className="inline-flex size-9 items-center justify-center rounded-lg border border-red-100 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:hover:bg-red-950/30"
                            >
                                {operation === 'delete' ? (
                                    <LoaderCircle className="size-4 animate-spin" />
                                ) : (
                                    <Trash2 className="size-4" />
                                )}
                            </button>
                        )}

                        <button
                            type="button"
                            disabled={isBusy || !row.connected}
                            onClick={() => void handleSync()}
                            title="بروزرسانی تکی"
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                        >
                            {operation === 'sync' ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                                <RefreshCw className="size-4" />
                            )}
                        </button>

                        <button
                            type="button"
                            disabled={isBusy || !row.connected}
                            onClick={() => void handleOnHold()}
                            title={row.onHold ? 'فعال کردن' : 'توقف موقت'}
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                        >
                            {operation === 'hold' ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : row.onHold ? (
                                <Play className="size-4" />
                            ) : (
                                <Pause className="size-4" />
                            )}
                        </button>

                        {row.connected && !row.onHold && (
                            <Check className="mr-1 size-4 text-emerald-500" />
                        )}
                    </div>

                    {error && (
                        <p className="mt-2 max-w-64 text-xs leading-5 text-red-500">
                            {toPersianDigits(error!)}
                        </p>
                    )}
                </td>
            </tr>

            <UpdateProgressModal open={syncOpen} isUpdating={operation === 'sync'}
                items={syncItem ? [syncItem] : []} current={syncCurrent}
                pendingName={`${row.product} ${row.variationName || row.sheetVariation}`}
                processed={syncItem ? 1 : 0} total={1} error={error}
                status={operation === 'sync' ? 'running' : error ? 'error' : 'completed'}
                onClose={() => setSyncOpen(false)} />
            {isModalOpen && (
                <ProductSearchModal
                    open={isModalOpen}
                    productName={row.product}
                    variationName={row.sheetVariation || row.variation}
                    onClose={() => setIsModalOpen(false)}
                    onSelect={(variation) => void handleConnect(variation)}
                />
            )}
        </>
    );
};