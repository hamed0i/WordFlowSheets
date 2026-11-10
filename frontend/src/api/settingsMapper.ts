import type {
    SheetSettingForm,
    SheetSettingPayload,
} from '../types/settings';

export const formToSetting = (
    form: SheetSettingForm,
): SheetSettingPayload => ({
    slug: form.slug.trim(),
    name: form.name.trim(),
    credentials: {
        spreadsheetId: form.credentials.spreadsheetId.trim(),
        apiKey: form.credentials.apiKey,
        sheetName: form.credentials.sheetName.trim(),
        range: form.credentials.range.trim(),
    },
    sync_all: form.sync_all ? 'on' : 'off',
    productColumn: form.productColumn,
    variationColumn: form.variationColumn,
    priceColumn: form.priceColumn,
    upscalePercent: form.upscalePercent,
    priceIncrease: form.priceIncrease,
    defaultStockQuantity: form.defaultStockQuantity,
    roundingZeros: form.roundingZeros,
    bulkConcurrency: form.bulkConcurrency,
    disabled: form.disabled,
});