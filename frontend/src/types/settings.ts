export type SheetCredentials = {
    spreadsheetId: string;
    sheetName: string;
    range: string;
    hasApiKey: boolean;
};

export type SheetCredentialsForm = {
    spreadsheetId: string;
    apiKey: string;
    sheetName: string;
    range: string;
};

export type SheetSetting = {
    slug: string;
    name: string;
    credentials: SheetCredentials;
    sync_all: 'on' | 'off';
    productColumn: string[];
    variationColumn: string[];
    priceColumn: string[];
    upscalePercent: number;
    priceIncrease: string;
    defaultStockQuantity: number;
    roundingZeros: number;
    bulkConcurrency: number;
    disabled: boolean;
};

export type SheetSettingPayload = {
    slug: string;
    name: string;
    credentials: SheetCredentialsForm;
    sync_all: 'on' | 'off';
    productColumn: string[];
    variationColumn: string[];
    priceColumn: string[];
    upscalePercent: number;
    priceIncrease: string;
    defaultStockQuantity: number;
    roundingZeros: number;
    bulkConcurrency: number;
    disabled: boolean;
};

export type SheetSettingForm = {
    slug: string;
    name: string;
    credentials: SheetCredentialsForm;
    sync_all: boolean;
    productColumn: string[];
    variationColumn: string[];
    priceColumn: string[];
    upscalePercent: number;
    priceIncrease: string;
    defaultStockQuantity: number;
    roundingZeros: number;
    bulkConcurrency: number;
    disabled: boolean;
};

export const emptySheetSettingForm = (): SheetSettingForm => ({
    slug: '',
    name: '',
    credentials: {
        spreadsheetId: '',
        apiKey: '',
        sheetName: '',
        range: '',
    },
    sync_all: false,
    productColumn: [],
    variationColumn: [],
    priceColumn: [],
    upscalePercent: 0,
    priceIncrease: '0%',
    defaultStockQuantity: 1,
    roundingZeros: 3,
    bulkConcurrency: 1,
    disabled: false,
});