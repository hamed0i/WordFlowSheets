import * as XLSX from 'xlsx';

export async function readSheetFile(file: File, sheetName: string) {
    const format = file.name.split('.').pop()?.toLowerCase();
    if (!format || !['csv', 'xlsx', 'xls'].includes(format)) {
        throw new Error('فقط فایل CSV یا Excel با پسوند xlsx و xls قابل قبول است.');
    }
    if (!file.size || file.size > 10 * 1024 * 1024) {
        throw new Error('فایل باید غیرخالی و حداکثر ۱۰ مگابایت باشد.');
    }
    const bytes = await file.arrayBuffer();
    let workbook: XLSX.WorkBook;
    try {
        if (format === 'csv') {
            const prefix = new Uint8Array(bytes, 0, Math.min(3, bytes.byteLength));
            const encoding = prefix[0] === 255 && prefix[1] === 254 ? 'utf-16le'
                : prefix[0] === 254 && prefix[1] === 255 ? 'utf-16be' : 'utf-8';
            workbook = XLSX.read(new TextDecoder(encoding).decode(bytes).replace(/^\uFEFF/, ''), {
                type: 'string', raw: true, sheetRows: 50002,
            });
        } else {
            workbook = XLSX.read(bytes, {type: 'array', sheetRows: 50002, cellFormula: false, cellHTML: false});
        }
    } catch {
        throw new Error('فایل خوانده نشد؛ یک خروجی سالم از گوگل‌شیت انتخاب کنید.');
    }
    const selected = format === 'csv' ? workbook.SheetNames[0] : sheetName;
    const sheet = workbook.Sheets[selected];
    if (!sheet) throw new Error(`برگه «${sheetName}» در فایل اکسل پیدا نشد.`);
    if (!sheet['!ref']) throw new Error('برگه انتخاب‌شده خالی است.');
    const range = XLSX.utils.decode_range(sheet['!fullref'] ?? sheet['!ref']);
    if (range.e.r >= 50000 || range.e.c >= 512) throw new Error('فایل بیش از ۵۰٬۰۰۰ ردیف یا ۵۱۲ ستون دارد.');
    const values = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1, defval: '', raw: false, blankrows: true, range: 0,
    });
    if (values.length < 2) throw new Error('فایل باید دارای عنوان ستون‌ها و حداقل یک ردیف داده باشد.');
    return {values, sheetName: selected, format};
}
