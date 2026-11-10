export type StartUpdateItem = {
    id: number;
    fullName: string;
    price: number;
    listName: string;
    updated: boolean;
    error?: string;
    variationId?: number;
    oldPrice?: number | null;
    oldQuantity?: number | null;
    quantity?: number | null;
    stockStatus?: string;
    stockUnchanged?: boolean;
};

export type StartUpdateResult = {
    items: StartUpdateItem[];
    nextItem: StartUpdateItem | null;
    processed: number;
    lastId: number;
    hasMore: boolean;
    completed: boolean;
    total: number;
};

export type PriceUpdaterRow = {
    id: number;
    slug: string;
    product: string;
    sheetVariation: string;
    variation: string;
    sheetPrice: number;
    stockQuantity: number;
    stockQuantityOverride: boolean;
    sitePrice: number;
    variationId: number | null;
    productName?: string | null;
    productMetaValue?: string | null;
    variationName: string;
    listName: string;
    connected: boolean;
    onHold: boolean;
};

export type PriceUpdaterTable = {
    items: PriceUpdaterRow[];
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
};