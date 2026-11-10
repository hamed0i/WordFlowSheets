import {formatNumber, toPersianDigits} from '../../utils/numbers';
import {useEffect, useRef} from 'react';
import {createPortal} from 'react-dom';
import type {StartUpdateItem} from '../../types/priceUpdater';

type Props = {
    open: boolean;
    mode?: "update" | "disable";
    title?: string;
    onRetry?: () => void;
    isUpdating: boolean;
    items: StartUpdateItem[];
    current?: StartUpdateItem | null;
    pendingName?: string;
    processed: number;
    total: number;
    status: 'idle' | 'running' | 'completed' | 'stopped' | 'error';
    error: string | null;
    onStop?: () => void;
    onClose: () => void;
};
const number = (value: number | null | undefined) => value == null ? '—' : formatNumber(value);
const price = (value: number | null | undefined) => value == null ? '—' : `${number(value)} تومان`;
const quantity = (value: number | null | undefined) => value == null ? 'بدون تعداد ثبت‌شده' : number(value);
const stock = (value?: string) => value === 'instock' ? 'موجود' : value === 'outofstock' ? 'ناموجود' : value === 'onbackorder' ? 'پیش‌خرید' : '—';

export const UpdateProgressModal = (props: Props) => {
    const dialog = useRef<HTMLDialogElement>(null);
    const end = useRef<HTMLDivElement>(null);
    const root = document.getElementById('sheets-excel-updater-app');
    useEffect(() => {
        const element = dialog.current;
        if (!props.open || !element) return;
        const previous = document.activeElement as HTMLElement | null;
        element.showModal();
        return () => {element.close(); previous?.focus();};
    }, [props.open]);
    useEffect(() => {end.current?.scrollIntoView({block: 'nearest'});}, [props.items.length]);
    if (!props.open || !root) return null;
    const title = props.title || (props.mode === 'disable' ? (props.isUpdating ? 'در حال غیرفعال‌سازی لیست' : props.status === 'stopped' ? 'غیرفعال‌سازی متوقف شد' : props.status === 'error' ? 'غیرفعال‌سازی با خطا پایان یافت' : 'غیرفعال‌سازی تمام شد') : props.isUpdating ? 'در حال بروزرسانی محصولات' : props.status === 'stopped' ? 'بروزرسانی متوقف شد' : props.status === 'error' ? 'خطا در بروزرسانی' : 'بروزرسانی تمام شد');
    const progress = props.total ? Math.min(100, Math.round(props.processed / props.total * 100)) : 0;
    return createPortal(
        <dialog ref={dialog} dir="rtl" aria-labelledby="update-progress-title"
            onCancel={(event) => {event.preventDefault(); if (!props.isUpdating) props.onClose();}}
            className="m-auto w-[calc(100%-2rem)] max-w-5xl rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/50">
            <div className="flex max-h-[85vh] flex-col">
                <div className="border-b border-slate-200 px-6 py-4">
                    <h2 id="update-progress-title" className="text-lg font-semibold">{title}</h2>
                    <p className="mt-2 text-sm text-slate-500">{number(props.processed)} از {number(props.total)} کالا</p>
                    <progress aria-label="پیشرفت بروزرسانی" max={100} value={progress} className="mt-2 h-2 w-full" />
                    {props.isUpdating && <div aria-live="polite" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                        <p>{props.mode === 'disable' ? 'غیرفعال‌سازی:' : 'کالای در حال بروزرسانی:'} {toPersianDigits(props.current?.fullName || props.pendingName || 'در حال دریافت اطلاعات…')}</p>
                        {props.current && <p className="mt-1 text-xs text-slate-500">قیمت فعلی: {price(props.current.oldPrice)} · قیمت مقصد (پیش‌نمایش): {price(props.current.price)} · لیست: {toPersianDigits(props.current.listName || '—')}</p>}
                        {props.current && <p className="mt-1 text-xs text-slate-500">موجودی: {quantity(props.current.oldQuantity)} ← {quantity(props.current.quantity)} · {props.current.stockUnchanged ? 'بدون تغییر موجودی' : stock(props.current.stockStatus)}</p>}
                    </div>}
                    {props.error && <p role="alert" className="mt-3 whitespace-pre-line text-sm text-red-600">{toPersianDigits(props.error!)}</p>}
                </div>
                <div className="min-h-0 overflow-auto px-4 py-3">
                    <table className="w-full min-w-[720px] text-right text-sm">
                        <thead><tr className="border-b border-slate-200 text-xs text-slate-500">
                            {['کالا', 'قیمت قبل', 'قیمت بعد', 'موجودی قبل ← بعد', 'لیست قیمت', 'نتیجه'].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}
                        </tr></thead>
                        <tbody>{props.items.map((item) => <tr key={item.id} className="border-b border-slate-100">
                            <td className="max-w-72 px-3 py-3"><span>{toPersianDigits(item.fullName)}</span><span className="block text-xs text-slate-400">#{formatNumber(item.variationId ?? item.id)}</span></td>
                            <td className="whitespace-nowrap px-3 py-3">{price(item.oldPrice)}</td>
                            <td className="whitespace-nowrap px-3 py-3">{price(item.price)}</td>
                            <td className="px-3 py-3"><span>{quantity(item.oldQuantity)} ← {quantity(item.quantity)}</span><span className="block text-xs text-slate-500">{item.stockUnchanged ? 'موجودی بدون تغییر' : stock(item.stockStatus)}</span></td>
                            <td className="px-3 py-3">{toPersianDigits(item.listName || '—')}</td>
                            <td className={`px-3 py-3 ${item.updated ? 'text-emerald-600' : 'text-amber-600'}`}>{item.error ? toPersianDigits(item.error) : item.updated ? 'انجام شد' : 'انجام نشد'}</td>
                        </tr>)}</tbody>
                    </table>
                    {!props.items.length && <p className="py-8 text-center text-sm text-slate-500">{props.isUpdating ? 'نتیجهٔ هر کالا پس از ثبت نمایش داده می‌شود.' : 'کالایی بروزرسانی نشد.'}</p>}
                    <div ref={end} />
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                    {!props.isUpdating && props.onRetry && <button type="button" onClick={props.onRetry} className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white">ادامه / تلاش مجدد موارد ناموفق</button>}
                    {props.isUpdating && props.onStop ? <button type="button" onClick={props.onStop} className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white">توقف پس از درخواست‌های جاری</button> :
                        <button type="button" disabled={props.isUpdating} onClick={props.onClose} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-40">بستن</button>}
                </div>
            </div>
        </dialog>, root);
};