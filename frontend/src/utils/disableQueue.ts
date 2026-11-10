export type DisableTask = {id: number; variationId: number; parentId: number};
export async function runDisableQueue<T extends DisableTask>(tasks: T[], concurrency: number,
    stopped: () => boolean, execute: (task: T) => Promise<void>) {
    const pending = [...tasks];
    const active = new Map<number, Promise<void>>();
    while (pending.length || active.size) {
        while (!stopped() && active.size < concurrency) {
            const index = pending.findIndex(t => !active.has(t.parentId || t.variationId));
            if (index < 0) break;
            const task = pending.splice(index, 1)[0];
            const key = task.parentId || task.variationId;
            const promise = Promise.resolve().then(() => execute(task)).finally(() => { active.delete(key); });
            active.set(key, promise);
        }
        if (!active.size) break;
        await Promise.race(active.values());
    }
    return pending;
}