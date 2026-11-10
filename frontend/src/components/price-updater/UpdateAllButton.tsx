import {useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {useStartUpdate} from '../../hooks/useStartUpdate';
import {UpdateProgressModal} from './UpdateProgressModal';

type UpdateAllButtonProps = {slug: string; disabled?: boolean; onCompleted?: () => void | Promise<void>};
export const UpdateAllButton = ({slug, disabled, onCompleted}: UpdateAllButtonProps) => {
    const state = useStartUpdate();
    const [open, setOpen] = useState(false);
    const handleUpdate = async () => {
        setOpen(true);
        await state.start(slug);
        await onCompleted?.();
    };
    return <>
        <button type="button" disabled={disabled || !slug || state.isUpdating} onClick={() => void handleUpdate()}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className={`size-4 ${state.isUpdating ? 'animate-spin' : ''}`} />
            {state.isUpdating ? 'در حال بروزرسانی…' : 'بروزرسانی همه'}
        </button>
        <UpdateProgressModal {...state} open={open} onStop={state.stop} onClose={() => setOpen(false)} />
    </>;
};