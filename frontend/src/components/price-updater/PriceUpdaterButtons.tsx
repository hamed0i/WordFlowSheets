import {settingsApi} from '../../api/settings';
import {readSheetFile} from '../../utils/importSheetFile';
import {useRef, useState} from 'react';
import {Database, Power, Upload} from 'lucide-react';
import {useDisableList} from '../../hooks/useDisableList';
import {UpdateProgressModal} from './UpdateProgressModal';
import {toPersianDigits} from '../../utils/numbers';
import {priceUpdaterApi} from '../../api/priceUpdater';
import {UpdateAllButton} from './UpdateAllButton';

type Props = {slug: string; disabled: boolean; onUpdated: () => void};
const buttonClass = 'inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
export const PriceUpdaterButtons = ({slug, disabled, onUpdated}: Props) => {
    const [operation, setOperation] = useState<'sync'|'enable'|'import'|null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const handleFile = async (file: File) => {
        if (!slug || isBusy || disabled) return;
        setError(null); setSuccess(null); setOperation('import');
        const targetSlug = slug;
        try {
            const setting = await settingsApi.get(targetSlug);
            const data = await readSheetFile(file, setting.data.credentials.sheetName);
            const response = await priceUpdaterApi.importFile(targetSlug, data);
            setSuccess(`ورود فایل انجام شد؛ ${response.data.counter} ردیف پردازش شد. قیمت محصولات سایت با دکمه آپدیت جداگانه اعمال می‌شود.`);
            onUpdated();
        } catch (e) { setError(e instanceof Error ? e.message : 'ورود فایل انجام نشد.'); }
        finally {setOperation(null);}
    };
    const disable = useDisableList();
    const [disableOpen, setDisableOpen] = useState(false);
    const isBusy = operation !== null || disable.isUpdating;
    const handleSync = async () => {
        if (!slug || isBusy || disabled) return;
        setError(null); setSuccess(null); setOperation('sync');
        try {await priceUpdaterApi.sync(slug); onUpdated();}
        catch (e) {setError(e instanceof Error ? e.message : 'همگام‌سازی انجام نشد.');}
        finally {setOperation(null);}
    };
    const handleToggle = async (retry = false) => {
        if (!slug || isBusy) return;
        setError(null);
        if (disabled && !retry) {
            setOperation('enable');
            try {await priceUpdaterApi.enableList(slug); onUpdated();}
            catch (e) {setError(e instanceof Error ? e.message : 'فعال‌کردن لیست انجام نشد.');}
            finally {setOperation(null);}
            return;
        }
        if (!retry && !window.confirm('آیا می‌خواهید این لیست قیمت را غیرفعال کنید؟')) return;
        setDisableOpen(true);
        await disable.start(slug, retry);
        onUpdated();
    };
    return <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
        <button type="button" onClick={() => void handleSync()} disabled={isBusy || !slug || disabled}
            title="همگام‌سازی شیت جاری" className={buttonClass}>
            <Database className={`size-4 text-blue-600 ${operation === 'sync' ? 'animate-pulse' : ''}`} />
            {operation === 'sync' ? 'در حال همگام‌سازی…' : 'همگام‌سازی شیت'}
        </button>
        <input ref={fileInput} type="file" accept=".csv,.xlsx,.xls" className="hidden" aria-label="انتخاب فایل قیمت"
            onChange={event => {const file = event.target.files?.[0]; event.target.value = ''; if (file) void handleFile(file);}} />
        <button type="button" className={buttonClass} disabled={isBusy || !slug || disabled}
            onClick={() => fileInput.current?.click()} title="ورود خروجی CSV یا اکسل گوگل‌شیت؛ قیمت کالاهای غایب صفر می‌شود">
            <Upload className={`size-4 text-blue-600 ${operation === 'import' ? 'animate-pulse' : ''}`} />
            {operation === 'import' ? 'در حال خواندن فایل…' : 'آپدیت از فایل'}
        </button>
        <UpdateAllButton slug={slug} disabled={isBusy || disabled} onCompleted={onUpdated} />
        <button type="button" onClick={() => void handleToggle()} disabled={isBusy || !slug}
            className={buttonClass} title={disabled ? 'فعال کردن لیست' : 'غیر فعال کردن لیست'} aria-pressed={!disabled}>
            <Power className={`size-4 ${disabled ? 'text-emerald-600' : 'text-red-600'} ${isBusy ? 'animate-pulse' : ''}`} />
            {operation === 'enable' ? 'در حال فعال‌سازی…' : disabled ? 'فعال کردن لیست' : 'غیرفعال کردن لیست'}
        </button>
        <UpdateProgressModal {...disable} mode="disable" open={disableOpen} onStop={disable.stop}
            onRetry={disable.retryable ? () => void handleToggle(true) : undefined} onClose={() => setDisableOpen(false)} />
        {success && <p role="status" className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{toPersianDigits(success)}</p>}
        {error && <p role="alert" className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{toPersianDigits(error)}</p>}
    </div>;
};