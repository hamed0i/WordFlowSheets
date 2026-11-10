import {useRef, useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {priceUpdaterApi} from '../../api/priceUpdater';
import {runDisableQueue, type DisableTask} from '../../utils/disableQueue';
import type {SheetSetting} from '../../types/settings';
import type {StartUpdateItem} from '../../types/priceUpdater';
import {UpdateProgressModal} from './UpdateProgressModal';
type Task = DisableTask & {slug: string; name: string};
const initial = {isUpdating: false, processed: 0, total: 0, items: [] as StartUpdateItem[], error: null as string | null,
    status: 'idle' as 'idle'|'running'|'completed'|'stopped'|'error', pendingName: ''};
export function BulkUpdateButton({settings, onCompleted}: {settings: SheetSetting[]; onCompleted: () => void}) {
    const [open, setOpen] = useState(false), [state, setState] = useState(initial);
    const stop = useRef(false), running = useRef(false);
    const start = async () => {
        if (running.current) return;
        const sheets = settings.filter(s => !s.disabled);
        if (!sheets.length) return;
        running.current = true; stop.current = false; setOpen(true);
        setState({...initial, isUpdating: true, status: 'running', pendingName: 'در حال آماده‌سازی لیست‌های فعال…'});
        const sheetErrors: string[] = [];
        let failed = 0;
        try {
            // Prepare concurrently but preserve priority order when merging shared variations.
            const prepared = await Promise.all(sheets.map(async sheet => {
                try { return {sheet, data: (await priceUpdaterApi.prepareUpdate(sheet.slug)).data}; }
                catch (e) {sheetErrors.push(`${sheet.name}: ${e instanceof Error ? e.message : 'آماده‌سازی انجام نشد'}`); return null;}
            }));
            const seen = new Set<number>(), tasks: Task[] = [];
            let concurrency = 1;
            for (const entry of prepared) {
                if (!entry) continue;
                concurrency = Math.max(concurrency, entry.data.concurrency);
                for (const task of entry.data.tasks) {
                    if (seen.has(task.variationId)) continue;
                    seen.add(task.variationId); tasks.push({...task, slug: entry.sheet.slug, name: entry.sheet.name});
                }
            }
            setState(s => ({...s, total: tasks.length, pendingName: `${sheets.length} لیست فعال · حداکثر ${concurrency} پردازش همزمان`, error: sheetErrors.join('\n') || null}));
            const pending = await runDisableQueue(tasks, concurrency, () => stop.current, async task => {
                let item: StartUpdateItem;
                try {
                    item = (await priceUpdaterApi.updateItem(task.slug, task.id, true)).data.item;
                    if (!item.updated) failed++;
                } catch (e) {
                    failed++; item = {id: task.id, variationId: task.variationId, fullName: `${task.name} · محصول #${task.variationId}`,
                        updated: false, price: 0, listName: task.name, error: e instanceof Error ? e.message : 'خطا در بروزرسانی'};
                }
                setState(s => ({...s, processed: s.processed + 1, items: [...s.items, item]}));
            });
            setState(s => ({...s, isUpdating: false, status: pending.length ? 'stopped' : failed || sheetErrors.length ? 'error' : 'completed',
                error: [...sheetErrors, ...(failed ? [`${failed} محصول انجام نشد؛ جزئیات در جدول آمده است.`] : [])].join('\n') || null}));
        } catch (e) {
            setState(s => ({...s, isUpdating: false, status: 'error', error: e instanceof Error ? e.message : 'خطا در بروزرسانی'}));
        } finally {running.current = false; onCompleted();}
    };
    return <>
        <button type="button" onClick={() => void start()} disabled={state.isUpdating || !settings.some(s => !s.disabled)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-40">
            <RefreshCw className="size-4" />آپدیت همه لیست‌های فعال
        </button>
        <UpdateProgressModal {...state} open={open} title={state.isUpdating ? 'آپدیت همه لیست‌های فعال' : state.status === 'completed' ? 'آپدیت لیست‌های فعال تمام شد' : state.status === 'stopped' ? 'آپدیت متوقف شد' : 'آپدیت با خطا پایان یافت'}
            onStop={() => {stop.current = true;}} onClose={() => setOpen(false)} />
    </>;
}