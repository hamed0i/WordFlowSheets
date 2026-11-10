import {toPersianDigits} from '../../utils/numbers';
type HeaderSelectorProps = {
    label: string;
    headers: string[];
    value: string[];
    onChange: (value: string[]) => void;
    multiple?: boolean;
};

export const HeaderSelector = ({
                                   label,
                                   headers,
                                   value,
                                   onChange,
                                   multiple = true,
                               }: HeaderSelectorProps) => {
    const handleChange = (
        event: React.ChangeEvent<HTMLSelectElement>,
    ) => {
        const selected = Array.from(
            event.target.selectedOptions,
        ).map((option) => option.value);

        onChange(multiple ? selected : selected.slice(0, 1));
    };

    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
                {label}
            </label>

            <select
                multiple={multiple}
                value={value}
                onChange={handleChange}
                disabled={headers.length === 0}
                className="min-h-32 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:bg-slate-50"
            >
                {headers.length === 0 ? (
                    <option value="">
                        ابتدا Headerهای شیت را دریافت کنید
                    </option>
                ) : (
                    headers.map((header) => (
                        <option key={header} value={header}>
                            {toPersianDigits(header)}
                        </option>
                    ))
                )}
            </select>

            <p className="mt-2 text-xs text-slate-400">
                برای انتخاب چند مورد، کلید Ctrl یا Command را نگه دارید.
            </p>
        </div>
    );
};