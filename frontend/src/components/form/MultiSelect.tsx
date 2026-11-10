import {toPersianDigits} from '../../utils/numbers';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Check,
    ChevronDown,
    Search,
    X,
} from 'lucide-react';

type MultiSelectProps = {
    label?: string;
    options: string[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    disabled?: boolean;
    emptyMessage?: string;
};

export const MultiSelect = ({
    label,
    options,
    value,
    onChange,
    placeholder = 'انتخاب کنید',
    searchPlaceholder = 'جستجو...',
    disabled = false,
    emptyMessage = 'موردی پیدا نشد.',
}: MultiSelectProps) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const normalizedOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    options
                        .map((option) => option.trim())
                        .filter(Boolean),
                ),
            ),
        [options],
    );

    const filteredOptions = useMemo(() => {
        const query = search.trim().toLocaleLowerCase('fa-IR');

        if (!query) {
            return normalizedOptions;
        }

        return normalizedOptions.filter((option) =>
            option.toLocaleLowerCase('fa-IR').includes(query),
        );
    }, [normalizedOptions, search]);

    const selectedValues = useMemo(
        () =>
            value.filter((item) =>
                normalizedOptions.includes(item),
            ),
        [value, normalizedOptions],
    );

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);

        return () => {
            document.removeEventListener(
                'mousedown',
                handlePointerDown,
            );
        };
    }, []);

    useEffect(() => {
        if (disabled) {
            setOpen(false);
            setSearch('');
        }
    }, [disabled]);

    const toggleOption = (option: string) => {
        if (selectedValues.includes(option)) {
            onChange(
                selectedValues.filter(
                    (selected) => selected !== option,
                ),
            );

            return;
        }

        onChange([...selectedValues, option]);
    };

    const removeOption = (option: string) => {
        onChange(
            selectedValues.filter(
                (selected) => selected !== option,
            ),
        );
    };

    const clearAll = () => {
        onChange([]);
    };

    return (
        <div
            ref={containerRef}
            className="relative"
        >
            {label && (
                <label className="mb-2 block text-sm font-medium text-slate-700">
                    {label}
                </label>
            )}

            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                disabled={disabled}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-sm outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                    {selectedValues.length === 0 ? (
                        <span className="text-slate-400">
                            {placeholder}
                        </span>
                    ) : (
                        selectedValues.map((selected) => (
                            <span
                                key={selected}
                                className="inline-flex max-w-full items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                                onClick={(event) =>
                                    event.stopPropagation()
                                }
                            >
                                <span className="max-w-40 truncate">
                                    {toPersianDigits(selected)}
                                </span>

                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                        removeOption(selected)
                                    }
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === 'Enter' ||
                                            event.key === ' '
                                        ) {
                                            event.preventDefault();
                                            removeOption(selected);
                                        }
                                    }}
                                    className="cursor-pointer rounded p-0.5 transition hover:bg-blue-100"
                                    aria-label={`حذف ${toPersianDigits(selected)}`}
                                >
                                    <X className="size-3" />
                                </span>
                            </span>
                        ))
                    )}
                </div>

                <ChevronDown
                    className={`size-4 shrink-0 text-slate-400 transition ${
    open ? 'rotate-180' : ''
}`}
                />
            </button>

            {open && (
                <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 p-2">
                        <div className="relative">
                            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder={searchPlaceholder}
                                autoFocus
                                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-9 pl-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                            />
                        </div>
                    </div>

                    {selectedValues.length > 0 && (
                        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                            <span className="text-xs text-slate-500">
                                {selectedValues.length.toLocaleString(
                                    'fa-IR',
                                )}{' '}
                                مورد انتخاب شده
                            </span>

                            <button
                                type="button"
                                onClick={clearAll}
                                className="text-xs font-medium text-red-600 transition hover:text-red-700"
                            >
                                حذف همه
                            </button>
                        </div>
                    )}

                    <div className="max-h-64 overflow-y-auto p-1.5">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-8 text-center text-sm text-slate-400">
                                {emptyMessage}
                            </div>
                        ) : (
                            filteredOptions.map((option) => {
                                const selected =
                                    selectedValues.includes(option);

                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() =>
                                            toggleOption(option)
                                        }
                                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right text-sm transition ${
    selected
        ? 'bg-blue-50 text-blue-700'
        : 'text-slate-700 hover:bg-slate-50'
}`}
                                    >
                                        <span
                                            className={`flex size-4 shrink-0 items-center justify-center rounded border ${
    selected
        ? 'border-blue-600 bg-blue-600 text-white'
        : 'border-slate-300 bg-white'
}`}
                                        >
                                            {selected && (
                                                <Check className="size-3" />
                                            )}
                                        </span>

                                        <span className="min-w-0 flex-1 truncate">
                                            {toPersianDigits(option)}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};