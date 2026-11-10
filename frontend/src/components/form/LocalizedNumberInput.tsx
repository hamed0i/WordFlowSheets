import {useEffect, useState} from 'react';
import type {InputHTMLAttributes} from 'react';
import {normalizeNumberInput, parseNumberInput, toPersianDigits} from '../../utils/numbers';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
    value: number;
    onValueChange: (value: number) => void;
};
export const LocalizedNumberInput = ({value, onValueChange, ...props}: Props) => {
    const [draft, setDraft] = useState(() => Number.isFinite(value) ? String(value) : '');
    useEffect(() => {
        if (Number.isFinite(value)) setDraft(String(value));
    }, [value]);
    return <input {...props} type="text" inputMode="numeric" value={toPersianDigits(draft)}
        onChange={(event) => {
            const next = normalizeNumberInput(event.target.value);
            setDraft(next);
            onValueChange(parseNumberInput(next));
        }} />;
};