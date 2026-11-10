import * as z from 'zod';

const stockQuantitySchema = z.number().int().max(2147483647).refine(
    (value) => value === -1 || value >= 1,
    'موجودی پیش‌فرض باید ۱- یا عدد صحیح حداقل ۱ باشد.',
);

export const sheetCredentialsSchema = z.object({
    spreadsheetId: z.string(),
    sheetName: z.string(),
    range: z.string(),
    hasApiKey: z.boolean(),
});

export const sheetSettingSchema = z.object({
    slug: z.string(),
    name: z.string(),
    credentials: sheetCredentialsSchema,
    sync_all: z.enum(['on', 'off']),
    productColumn: z.array(z.string()),
    variationColumn: z.array(z.string()),
    priceColumn: z.array(z.string()),
    upscalePercent: z.number(),
    priceIncrease: z.string().default('0%'),
    defaultStockQuantity: stockQuantitySchema.default(1),
    roundingZeros: z.number().int().min(0).max(9).default(3),
    bulkConcurrency: z.number().int().min(1).max(20),
    disabled: z.boolean(),
});

export const settingsResponseSchema = z.object({
    success: z.literal(true),
    data: z.array(sheetSettingSchema),
});

export const settingResponseSchema = z.object({
    success: z.literal(true),
    data: sheetSettingSchema,
});

export const deleteSettingResponseSchema = z.object({
    success: z.literal(true),
    data: z.object({
        slug: z.string(),
    }),
});

export const headersResponseSchema = z.object({
    success: z.literal(true),
    data: z.array(z.string()),
});

export const sheetSettingFormSchema = z.object({
    slug: z
        .string()
        .trim()
        .min(1, 'شناسه شیت الزامی است.')
        .max(100, 'شناسه شیت نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد.'),

    name: z
        .string()
        .trim()
        .min(1, 'نام شیت الزامی است.')
        .max(200, 'نام شیت نمی‌تواند بیشتر از ۲۰۰ کاراکتر باشد.'),

    credentials: z.object({
        spreadsheetId: z
            .string()
            .trim()
            .min(1, 'Spreadsheet ID الزامی است.'),

        apiKey: z.string(),

        sheetName: z
            .string()
            .trim()
            .min(1, 'نام Sheet الزامی است.'),

        range: z
            .string()
            .trim()
            .min(1, 'محدوده شیت الزامی است.'),
    }),

    sync_all: z.boolean(),

    productColumn: z.array(z.string()),

    variationColumn: z.array(z.string()),

    priceColumn: z.array(z.string()),

    priceIncrease: z.string().trim().min(1, 'افزایش قیمت را وارد کنید.'),
    defaultStockQuantity: stockQuantitySchema,
    roundingZeros: z.number().int().min(0).max(9),
    upscalePercent: z
        .number()
        .finite()
        .min(0),

    bulkConcurrency: z
        .number()
        .int()
        .min(1)
        .max(20),

    disabled: z.boolean(),
});