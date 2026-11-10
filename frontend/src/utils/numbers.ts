export const toPersianDigits = (value: string | number): string => String(value)
    .replace(/[0-9٠-٩]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[/[0-9]/.test(digit) ? Number(digit) : digit.charCodeAt(0) - 0x660]);

export const normalizeNumberInput = (value: string): string => value
    .replace(/[۰-۹٠-٩]/g, (digit) => String(digit.charCodeAt(0) - (digit >= '۰' ? 0x6f0 : 0x660)))
    .replace(/[−–﹣－]/g, '-').replace(/٫/g, '.').replace(/٪/g, '%')
    .replace(/[٬,\s\u200e\u200f\u2066-\u2069]/g, '');

export const parseNumberInput = (value: string): number => {
    const normalized = normalizeNumberInput(value);
    return /^[+-]?\d+(?:\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
};

export const formatNumber = (value: number): string => Number.isFinite(value)
    ? value.toLocaleString('fa-IR', {maximumFractionDigits: 20}) : '';

export const formatIncreaseInput = (value: string): string => {
    const normalized = normalizeNumberInput(value);
    if (normalized.includes('%')) return toPersianDigits(normalized).replace(/%/g, '٪');
    const grouped = /^[0-9]+$/.test(normalized) ? normalized.replace(/\B(?=(\d{3})+(?!\d))/g, '٬') : normalized;
    return toPersianDigits(grouped);
};