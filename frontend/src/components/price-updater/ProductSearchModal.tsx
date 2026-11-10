import {toPersianDigits} from '../../utils/numbers';
import { useEffect, useState } from 'react';
import {
    ArrowRight,
    Check,
    LoaderCircle,
    Search,
    X,
} from 'lucide-react';
import { productsApi } from '../../api/products';
import type {
    ProductSearchResult,
    ProductVariation,
} from '../../types/products';

type ProductSearchModalProps = {
    open: boolean;
    productName: string;
    variationName: string;
    onClose: () => void;
    onSelect: (variation: ProductVariation) => void;
};

export const ProductSearchModal = ({
                                       open,
                                       productName,
                                       variationName,
                                       onClose,
                                       onSelect,
                                   }: ProductSearchModalProps) => {
    const [search, setSearch] = useState('');
    const [products, setProducts] = useState<ProductSearchResult[]>([]);
    const [selectedProduct, setSelectedProduct] =
        useState<ProductSearchResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        setSearch('');
        setProducts([]);
        setSelectedProduct(null);
        setLoading(false);
        setError(null);
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const query = search.trim();

        if (query.length < 2) {
            setProducts([]);
            setSelectedProduct(null);
            setError(null);
            setLoading(false);
            return;
        }

        setProducts([]);
        setSelectedProduct(null);
        setLoading(true);
        let cancelled = false;

        const timer = window.setTimeout(async () => {
            setLoading(true);
            setError(null);
            setSelectedProduct(null);

            try {
                const response = await productsApi.search(query, 20);

                if (!cancelled) {
                    setProducts(response.data);
                }
            } catch (error) {
                if (!cancelled) {
                    setProducts([]);
                    setError(
                        error instanceof Error
                            ? error.message
                            : 'جستجوی محصول با خطا مواجه شد.',
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }, 350);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [open, search]);

    if (!open) {
        return null;
    }

    const handleProductSelect = (
        product: ProductSearchResult,
    ): void => {
        setSelectedProduct(product);
    };

    const handleVariationSelect = (
        variation: ProductVariation,
    ): void => {
        onSelect(variation);
        onClose();
    };

    const handleBackToProducts = (): void => {
        setSelectedProduct(null);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="بستن"
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />

            <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="shrink-0 border-b border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center justify-between">
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-slate-900">
                                اتصال محصول
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Variation موردنظر را برای اتصال انتخاب کنید.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 text-xs font-medium text-slate-500">
                            در حال اتصال
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="min-w-0">
                                <div className="mb-1 text-xs text-slate-500">
                                    محصول
                                </div>

                                <div className="truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
                                    {toPersianDigits(productName || 'بدون نام')}
                                </div>
                            </div>

                            <div className="min-w-0">
                                <div className="mb-1 text-xs text-slate-500">
                                    ویژگی
                                </div>

                                <div className="truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
                                    {toPersianDigits(variationName || 'بدون ویژگی')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {!selectedProduct && (
                    <div className="shrink-0 border-b border-slate-200 p-5">
                        <div className="relative">
                            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

                            <input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                autoFocus
                                placeholder="نام محصول یا مقدار متافیلد تنظیم‌شده…"
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                            />
                        </div>
                    </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    {selectedProduct ? (
                        <div>
                            <div className="mb-4 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleBackToProducts}
                                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                    title="بازگشت به محصولات"
                                >
                                    <ArrowRight className="size-4" />
                                </button>

                                <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-slate-800">
                                        {toPersianDigits(selectedProduct.name)}
                                    </div>

                                    {/* ساب‌تایتل متادیتا در هدر محصول انتخاب شده */}
                                    {selectedProduct.metaValue && (
                                        <div className="mt-0.5 truncate text-xs font-mono text-blue-600">
                                            متا: {toPersianDigits(selectedProduct.metaValue)}
                                        </div>
                                    )}

                                    <div className="mt-1 text-xs text-slate-400">
                                        {selectedProduct.variations.length.toLocaleString(
                                            'fa-IR',
                                        )}{' '}
                                        Variation
                                    </div>
                                </div>
                            </div>

                            {selectedProduct.variations.length === 0 ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                                    این محصول Variation ندارد.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedProduct.variations.map(
                                        (variation) => (
                                            <button
                                                key={variation.id}
                                                type="button"
                                                onClick={() =>
                                                    handleVariationSelect(
                                                        variation,
                                                    )
                                                }
                                                className="group flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-right transition hover:border-blue-300 hover:bg-blue-50"
                                            >
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-slate-700">
                                                        {toPersianDigits(variation.name ||
                                                            variation.attributes
                                                                .map(
                                                                    (
                                                                        attribute,
                                                                    ) =>
                                                                        `${attribute.name}: ${attribute.value}`,
                                                                )
                                                                .join(' / ') ||
                                                            'بدون ویژگی')}
                                                    </div>

                                                    {variation.metaValue != null && variation.metaValue !== '' && (
                                                        <div dir="auto" className="mt-1 break-words text-xs font-mono text-blue-600">
                                                            متا: {toPersianDigits(variation.metaValue)}
                                                        </div>
                                                    )}

                                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                                        <span>
                                                            #
                                                            {variation.id.toLocaleString(
                                                                'fa-IR',
                                                                { useGrouping: false })}
                                                        </span>

                                                        {variation.attributes.map(
                                                            (attribute) => (
                                                                <span
                                                                    key={`${variation.id}-${attribute.name}-${attribute.value}`}
                                                                >
                                                                    {toPersianDigits(attribute.value)}
                                                                </span>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex shrink-0 items-center gap-3">
                                                    {variation.price > 0 && (
                                                        <span className="text-xs text-slate-500">
                                                            {variation.price.toLocaleString(
                                                                'fa-IR',
                                                            )}{' '}
                                                            تومان
                                                        </span>
                                                    )}

                                                    <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition group-hover:bg-blue-600 group-hover:text-white">
                                                        <Check className="size-4" />
                                                    </span>
                                                </div>
                                            </button>
                                        ),
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {loading && (
                                <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                                    <LoaderCircle className="ml-2 size-5 animate-spin" />
                                    در حال جستجوی محصولات...
                                </div>
                            )}

                            {!loading && error && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-600">
                                    {toPersianDigits(error!)}
                                </div>
                            )}

                            {!loading &&
                                !error &&
                                search.trim().length < 2 && (
                                    <div className="py-12 text-center text-sm text-slate-400">
                                        حداقل دو کاراکتر برای جستجو وارد کنید.
                                    </div>
                                )}

                            {!loading &&
                                !error &&
                                search.trim().length >= 2 &&
                                products.length === 0 && (
                                    <div className="py-12 text-center text-sm text-slate-400">
                                        محصولی پیدا نشد.
                                    </div>
                                )}

                            {!loading &&
                                !error &&
                                products.length > 0 && (
                                    <div className="space-y-2">
                                        {products.map((product) => (
                                            <button
                                                key={product.id}
                                                type="button"
                                                onClick={() =>
                                                    handleProductSelect(
                                                        product,
                                                    )
                                                }
                                                className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 text-right transition hover:border-blue-300 hover:bg-blue-50"
                                            >
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-medium text-slate-800">
                                                        {toPersianDigits(product.name)}
                                                    </div>

                                                    {/* ساب‌تایتل متادیتا در لیست سرچ */}
                                                    {product.metaValue && (
                                                        <div className="mt-0.5 truncate text-xs font-mono text-blue-600">
                                                            متا: {toPersianDigits(product.metaValue)}
                                                        </div>
                                                    )}

                                                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                                                        <span>
                                                            #
                                                            {product.id.toLocaleString(
                                                                'fa-IR',
                                                                 { useGrouping: false }
                                                            )}
                                                        </span>

                                                        {product.sku && (
                                                            <span>
                                                                SKU:{' '}
                                                                {toPersianDigits(product.sku)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                                                    {product.variations.length.toLocaleString(
                                                        'fa-IR',
                                                    )}{' '}
                                                    Variation
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};