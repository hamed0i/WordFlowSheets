import {useCallback, useRef, useState} from 'react';
import {priceUpdaterApi} from '../api/priceUpdater';
import type {StartUpdateItem} from '../types/priceUpdater';
import {runDisableQueue} from '../utils/disableQueue';

type UpdateState = {
    isUpdating: boolean;
    processed: number;
    total: number;
    error: string | null;
    items: StartUpdateItem[];
    current: StartUpdateItem | null;
    pendingName: string;
    status: 'idle' | 'running' | 'completed' | 'stopped' | 'error';
};
const initialState: UpdateState = {isUpdating: false, processed: 0, total: 0, error: null, items: [], current: null, pendingName: '', status: 'idle'};

export const useStartUpdate = () => {
    const [state, setState] = useState<UpdateState>(initialState);
    const running = useRef(false);
    const stopRequested = useRef(false);
    const start = useCallback(async (slug: string): Promise<boolean> => {
        if (running.current || !slug) return false;
        running.current = true;
        stopRequested.current = false;
        setState({...initialState, isUpdating: true, status: 'running', pendingName: 'در حال آماده‌سازی لیست…'});
        try {
            const response = await priceUpdaterApi.prepareUpdate(slug);
            const {tasks, concurrency} = response.data;
            const active = new Set<number>();
            let failures = 0;
            const updateActive = () => setState(s => ({...s,
                pendingName: `در حال پردازش ${active.size} از حداکثر ${concurrency} درخواست همزمان · ${[...active].map(id => '#' + id).join('، ')}`,
            }));
            setState(s => ({...s, total: tasks.length}));
            const pending = await runDisableQueue(tasks, concurrency, () => stopRequested.current, async task => {
                active.add(task.variationId); updateActive();
                let item: StartUpdateItem;
                try {
                    item = (await priceUpdaterApi.updateItem(slug, task.id)).data.item;
                    if (!item.updated) failures++;
                } catch (error) {
                    failures++;
                    item = {id: task.id, variationId: task.variationId, fullName: `محصول #${task.variationId}`,
                        price: 0, listName: '', updated: false,
                        error: error instanceof Error ? error.message : 'خطا در بروزرسانی محصول'};
                }
                active.delete(task.variationId); updateActive();
                setState(s => ({...s, processed: s.processed + 1, items: [...s.items, item]}));
            });
            setState(s => ({...s, isUpdating: false, current: null,
                status: pending.length ? 'stopped' : failures ? 'error' : 'completed',
                error: failures ? `${failures} محصول بروزرسانی نشد؛ جزئیات در جدول نمایش داده شده است.` : null,
            }));
            return !pending.length && !failures;
        } catch (error) {
            setState(s => ({...s, isUpdating: false, current: null, status: 'error',
                error: error instanceof Error ? error.message : 'بروزرسانی با خطا مواجه شد.'}));
            return false;
        } finally { running.current = false; }
    }, []);
    const stop = useCallback(() => {stopRequested.current = true;}, []);
    return {...state, start, stop};
};