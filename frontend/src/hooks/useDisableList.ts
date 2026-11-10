import {useRef, useState} from 'react';
import {priceUpdaterApi} from '../api/priceUpdater';
import type {StartUpdateItem} from '../types/priceUpdater';
import {runDisableQueue, type DisableTask} from '../utils/disableQueue';
const initial = {isUpdating: false, processed: 0, total: 0, error: null as string | null,
    items: [] as StartUpdateItem[], status: 'idle' as 'idle'|'running'|'completed'|'stopped'|'error', pendingName: ''};
export function useDisableList() {
    const [state, setState] = useState(initial);
    const [retryable, setRetryable] = useState(false);
    const running = useRef(false), stopRequested = useRef(false);
    const retryTasks = useRef<DisableTask[]>([]);
    const concurrency = useRef(1);
    const start = async (slug: string, retry = false) => {
        if (running.current || !slug) return;
        running.current = true; stopRequested.current = false; setRetryable(false);
        setState({...initial, isUpdating: true, status: 'running', pendingName: 'در حال آماده‌سازی لیست…'});
        try {
            let tasks: DisableTask[];
            if (retry) tasks = retryTasks.current;
            else {
                const result = await priceUpdaterApi.prepareDisable(slug);
                tasks = result.data.tasks; concurrency.current = result.data.concurrency;
            }
            const failed: DisableTask[] = [];
            setState(s => ({...s, total: tasks.length, pendingName: `حداکثر ${concurrency.current} درخواست همزمان`}));
            const pending = await runDisableQueue(tasks, concurrency.current, () => stopRequested.current, async task => {
                let item: StartUpdateItem;
                try { item = (await priceUpdaterApi.disableItem(slug, task.id)).data.item;
                    if (!item.updated) failed.push(task);
                } catch (error) {
                    failed.push(task);
                    item = {id: task.id, variationId: task.variationId, fullName: `محصول #${task.variationId}`, price: 0,
                        listName: '', updated: false, error: error instanceof Error ? error.message : 'خطا در غیرفعال‌سازی'};
                }
                setState(s => ({...s, processed: s.processed + 1, items: [...s.items, item]}));
            });
            retryTasks.current = [...failed, ...pending]; setRetryable(retryTasks.current.length > 0);
            setState(s => ({...s, isUpdating: false, status: pending.length ? 'stopped' : failed.length ? 'error' : 'completed',
                error: failed.length ? `${failed.length} محصول انجام نشد؛ می‌توانید دوباره تلاش کنید.` : null}));
        } catch (error) {
            setState(s => ({...s, isUpdating: false, status: 'error', error: error instanceof Error ? error.message : 'خطا در غیرفعال‌سازی'}));
        } finally { running.current = false; }
    };
    return {...state, retryable, start, stop: () => {stopRequested.current = true;}};
}